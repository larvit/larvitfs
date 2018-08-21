'use strict';

const topLogPrefix = 'larvitfs: index.js: ';
const LUtils       = require('larvitutils');
const path         = require('path');

/**
 * Lfs constructor
 *
 * @param {obj} options {
 * 	'basePath':     process.cwd(),                              // OPTIONAL
 * 	'cacheMaxSize': 10000,                                      // OPTIONAL
 * 	'log':          new (new (require('larvitutils'))()).Log(), // OPTIONAL
 * 	'fs':           require('fs')
 * }
 */
function Lfs(options) {
	const that = this;

	that.options = options || {};

	if (! that.options.log) {
		const lUtils = new LUtils();

		that.options.log = new lUtils.Log();
	}
	that.log = that.options.log;

	if (! that.options.basePath) {
		that.options.basePath = process.cwd();
	}
	that.basePath = that.options.basePath;

	if (! that.options.cacheMaxSize) {
		that.options.cacheMaxSize = 10000;
	}
	that.cacheMaxSize = that.options.cacheMaxSize;

	if (! that.options.fs) {
		that.options.fs = require('fs');
	}
	that.fs = that.options.fs;

	that.cache = new Map();
	that.paths = [that.options.basePath];

	that.loadPaths();
}

Lfs.prototype.getPathSync = function getPathSync(pathToResolve) {
	const logPrefix = topLogPrefix + 'Lfs.getPathSync() - pathToResolve: "' + pathToResolve + '" - ';
	const that      = this;

	if (that.cache.get(pathToResolve) !== undefined) {
		that.log.silly(logPrefix + 'Found in cache');

		return that.cache.get(pathToResolve);
	}

	// Make sure we do not use up all the memory with caching violent amount of files
	if (that.cache.size >= that.options.cacheMaxSize) {
		that.cache.clear();
	}

	if (pathToResolve[0] === '/') {
		that.log.debug(logPrefix + 'starts with "/", only check absolute path');

		if (that.fs.existsSync(pathToResolve)) {
			that.log.debug(logPrefix + '"' + pathToResolve + '" found - loading to cache');
			that.cache.set(pathToResolve, pathToResolve);
		} else {
			that.log.debug(logPrefix + '"' + pathToResolve + '" not found - setting false in cache');
			that.cache.set(pathToResolve, false);
		}

		return that.cache.get(pathToResolve);
	} else {
		that.log.debug(logPrefix + 'is relative, look in all the paths');

		for (let i = 0; that.paths[i] !== undefined; i ++) {
			let	testPath	= path.join(that.paths[i], pathToResolve);

			that.log.silly(logPrefix + 'Checking for ' + testPath);

			// Lookup if this file exists
			if (that.fs.existsSync(testPath)) {
				that.log.debug(logPrefix + '"' + testPath + '" found - loading to cache');
				that.cache.set(pathToResolve, testPath);

				return testPath;
			} else {
				that.log.silly(logPrefix + '"' + testPath + '" does not exist');
			}
		}

		// If we arrive here, no file have been found.
		that.cache.set(pathToResolve, false);

		return false;
	}
};

Lfs.prototype.getPathsSync = function getPathsSync(target, refreshCache) {
	const logPrefix = topLogPrefix + 'getPathsSync() - ';
	const that      = this;

	let result = [];
	let modules_result;
	let package_json;

	if (! target) {
		that.log.warn(logPrefix + 'Invalid target');

		return false;
	}

	if (! refreshCache && that.getPathsCache && that.getPathsCache[target]) {
		return that.getPathsCache[target];
	}

	/**
	 * Search for paths recursively
	 *
	 * @param   {str} thisPath      - the path to search for
	 * @param   {arr} pathsToIgnore - array of paths to ignore
	 * @returns {str}               - absolute path
	 */
	function searchPathsRec(thisPath, pathsToIgnore) {
		const subLogPrefix = logPrefix + 'searchPathsRec() - ';

		let result = [];
		let thisPaths;

		if (! pathsToIgnore) pathsToIgnore = [];

		try {
			if (that.fs.existsSync(thisPath + '/' + target) && result.indexOf(path.normalize(thisPath + '/' + target)) === - 1 && pathsToIgnore.indexOf(thisPath) === - 1) {
				result.push(path.normalize(thisPath + '/' + target));
			}

			if (! that.fs.existsSync(thisPath)) {
				return result;
			}

			thisPaths	= that.fs.readdirSync(thisPath);
		} catch (err) {
			that.log.error(subLogPrefix + 'throwed fs error: ' + err.message);

			return result;
		}

		for (let i = 0; thisPaths[i] !==  undefined; i ++) {
			try {
				const	subStat	= that.fs.statSync(thisPath + '/' + thisPaths[i]);

				if (subStat.isDirectory()) {
					if (thisPaths[i] !== target && pathsToIgnore.indexOf(thisPaths[i]) === - 1) {
						// If we've found a target dir, we do not wish to scan it
						result	= result.concat(searchPathsRec(thisPath + '/' + thisPaths[i], pathsToIgnore));
					}
				}
			} catch (err) {
				that.log.error(subLogPrefix + 'Could not read "' + thisPaths[i] + '": ' + err.message);
			}
		}

		return result;
	}

	// First scan for local controllers
	result = searchPathsRec(that.options.basePath, ['node_modules']);

	try {
		package_json = require(that.options.basePath + '/package.json');
	} catch (err) {
		that.log.info(logPrefix + 'Could not load package.json, err: ' + err.message);
	}

	// Then go through the dependencies in the package file
	try {
		if (package_json && package_json.dependencies) {
			for (let depPath of Object.keys(package_json.dependencies)) {
				const modPath = path.normalize(that.options.basePath + '/node_modules/' + depPath);

				if (that.fs.existsSync(modPath)) {
					const stats = that.fs.statSync(modPath);

					if (stats && stats.isDirectory()) {
						for (const dir of that.fs.readdirSync(modPath)) {
							if (dir === target && result.indexOf(path.normalize(modPath + '/' + dir)) === - 1) {
								result.push(path.normalize(modPath + '/' + dir));
								break;
							}
						}
					}
				}
			}
		}
	} catch (err) {
		that.log.error(logPrefix + 'Could not fetch info about dependencies. err: ' + err.message);

		return false;
	}

	// Add all other paths, recursively, starting in basePath
	modules_result = searchPathsRec(that.options.basePath + '/node_modules');

	// The lower in the tree of node modules, the farther back in the array
	modules_result.sort(function (a, b) {
		return a.lastIndexOf('node_modules') - b.lastIndexOf('node_modules');
	});

	for (let i = 0; modules_result[i] !== undefined; i ++) {
		if (result.indexOf(modules_result[i]) === - 1) {
			result.push(modules_result[i]);
		}
	}

	if (! that.getPathsCache) {
		that.getPathsCache	= {};
	}
	that.getPathsCache[target]	= result;

	return result;
};

// Load paths to local cache
Lfs.prototype.loadPaths = function loadPaths() {
	const logPrefix = topLogPrefix + 'Lfs.prototype.loadPaths() - ';
	const that      = this;

	let package_json;

	/**
	 * Add all other paths, recursively
	 *
	 * @param {str} thisPath - the path to search for
	 */
	function loadPathsRec(thisPath) {
		const	subLogPrefix	= logPrefix + 'loadPathsRec() - ';

		let	thisPaths;

		if (that.paths.indexOf(thisPath) === - 1) {
			that.log.debug(subLogPrefix + 'Adding ' + path.basename(thisPath) + ' to paths with full path ' + thisPath);
			that.paths.push(thisPath);
		}

		thisPaths	= that.fs.readdirSync(thisPath + '/node_modules');

		for (let i = 0; thisPaths[i] !==  undefined; i ++) {
			try {
				const	subStat	= that.fs.statSync(thisPath + '/node_modules/' + thisPaths[i]);

				if (subStat.isDirectory()) {
					loadPathsRec(thisPath + '/node_modules/' + thisPaths[i]);
				}
			} catch (err) {
				that.log.silly(subLogPrefix + 'Could not read "' + thisPaths[i] + '": ' + err.message);
			}
		}
	}

	that.log.verbose(logPrefix + 'Loading paths cache relative to ' + that.options.basePath);

	try {
		package_json = require(that.basePath + '/package.json');
	} catch (err) {
		that.log.info(logPrefix + 'Could not load package.json, err: ' + err.message);
	}

	// First go through the dependencies in the package file
	if (package_json && package_json.dependencies) {
		for (let depPath of Object.keys(package_json.dependencies)) {
			const modPath = path.normalize(that.options.basePath + '/node_modules/' + depPath);

			if (that.fs.existsSync(modPath)) {
				const stats = that.fs.statSync(modPath);

				if (! stats || ! stats.isDirectory()) {
					that.log.info(logPrefix + 'Module "' + depPath + '" not found at ' + modPath);
				} else {
					that.log.debug(logPrefix + 'Adding "' + depPath + '" to paths with full path ' + modPath);
					that.paths.push(modPath);
				}
			}
		}
	}

	// Start in basePath
	try {
		loadPathsRec(that.options.basePath);
	} catch (err) {
		that.log.info(logPrefix + 'Could not find node_modules folder in "' + that.options.basePath + '". If you have modules installed, make sure options.basePath is set correctly when instancing larvitfs. err: ' + err.message);
	}
};

exports = module.exports = Lfs;
