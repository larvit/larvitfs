'use strict';

const	topLogPrefix	= 'larvitfs: index.js: ',
	path	= require('path'),
	log	= require('winston'),
	fs	= require('fs');

function Lfs(options) {
	if ( ! options) {
		options	= {};
	}

	if ( ! options.basePath) {
		options.basePath	= process.cwd();
	}

	if ( ! options.cacheMaxSize) {
		options.cacheMaxSize	= 10000;
	}

	this.cache	= new Map();
	this.paths	= [options.basePath];
	this.options	= options;

	this.loadPaths();
}

Lfs.prototype.getPathSync = function getPathSync(pathToResolve) {
	const	logPrefix	= topLogPrefix + 'Lfs.prototype.getPathSync() - pathToResolve: "' + pathToResolve + '" - ',
		that	= this;

	if (that.cache.get(pathToResolve) !== undefined) {
		log.silly(logPrefix + 'Found in cache');
		return that.cache.get(pathToResolve);
	}

	// Make sure we do not use up all the memory with caching violent amount of files
	if (that.cache.size >= that.options.cacheMaxSize) {
		that.cache.clear();
	}

	if (pathToResolve[0] === '/') {
		log.debug(logPrefix + 'starts with "/", only check absolute path');

		if (fs.existsSync(pathToResolve)) {
			log.debug(logPrefix + '"' + pathToResolve + '" found - loading to cache');
			that.cache.set(pathToResolve, pathToResolve);
		} else {
			log.debug(logPrefix + '"' + pathToResolve + '" not found - setting false in cache');
			that.cache.set(pathToResolve, false);
		}

		return that.cache.get(pathToResolve);
	} else {
		log.debug(logPrefix + 'is relative, look in all the paths');

		for (let i = 0; that.paths[i] !== undefined; i ++) {
			let	testPath	= path.join(that.paths[i], pathToResolve);

			log.silly(logPrefix + 'Checking for ' + testPath);

			// Lookup if this file exists
			if (fs.existsSync(testPath)) {
				log.debug(logPrefix + '"' + testPath + '" found - loading to cache');
				that.cache.set(pathToResolve, testPath);
				return testPath;
			} else {
				log.silly(logPrefix + '"' + testPath + '" does not exist');
			}
		}

		// If we arrive here, no file have been found.
		that.cache.set(pathToResolve, false);

		return false;
	}
};

Lfs.prototype.getPathsSync = function getPathsSync(target, refreshCache) {
	const logPrefix = topLogPrefix + 'getPathsSync() - ',
		subResult	= [],
		that	= this;

	let	package_json,
		local,
		result	= [];

	if ( ! target) {
		log.warn(logPrefix + 'Invalid target');
		return false;
	}

	if ( ! refreshCache && that.getPathsCache && that.getPathsCache[target]) return that.getPathsCache[target];

	// First scan for local controllers
	local = fs.readdirSync(that.options.basePath);

	for (let i = 0; local[i] !== undefined; i ++) {
		if (fs.existsSync(path.normalize(that.options.basePath + '/' + local[i]))) {
			const stats = fs.statSync(path.normalize(that.options.basePath + '/' + local[i]));
			if (stats && stats.isDirectory() && local[i] === target) {
				result.push(path.normalize(that.options.basePath + '/' + local[i]));
				break;
			}
		}
	}

	try {
		package_json	= require(that.options.basePath + '/package.json');
	} catch (err) {
		log.info(logPrefix + 'Could not load package.json, err: ' + err.message);
	}

	// Then go through the dependencies in the package file
	if (package_json && package_json.dependencies) {
		for (let depPath of Object.keys(package_json.dependencies)) {
			const	modPath	= path.normalize(that.options.basePath + '/node_modules/' + depPath);
			if (fs.existsSync(modPath)) {
				const	stats	= fs.statSync(modPath);
				if (stats && stats.isDirectory()) {
					for (const dir of fs.readdirSync(modPath)) {
						if (dir === target) {
							result.push(path.normalize(modPath + '/' + dir));
							break;
						}
					}
				}
			}
		}
	}

	// Add all other paths, recursively
	function loadPathsRec(thisPath) {
		const subLogPrefix = logPrefix + 'loadPathsRec() - ';

		let	thisPaths;

		if (fs.existsSync(thisPath + '/' + target) && result.indexOf(path.normalize(thisPath + '/' + target)) === - 1) {
			subResult.push(path.normalize(thisPath + '/' + target));
			return;
		}

		if ( ! fs.existsSync(thisPath)) return;

		thisPaths = fs.readdirSync(thisPath);

		for (let i = 0; thisPaths[i] !==  undefined; i ++) {
			try {
				const	subStat	= fs.statSync(thisPath + '/' + thisPaths[i]);

				if (subStat.isDirectory()) {
					if (thisPaths[i] === target) {
						if (result.indexOf(thisPath + '/' + thisPaths[i]) === - 1) {
							subResult.push(path.normalize(thisPath + '/' + thisPaths[i]));
						}
					} else {
						// if we've found a target dir, we do not wish to scan it
						loadPathsRec(thisPath + '/' + thisPaths[i]);
					}
				}
			} catch (err) {
				log.warn(subLogPrefix + 'Could not read "' + thisPaths[i] + '": ' + err.message);
			}
		}
	}

	// Start in basePath
	try {
		loadPathsRec(that.options.basePath + '/node_modules');
	} catch (err) {
		log.info(logPrefix + 'Something went wrong: ' + err.message);
	}

	// the lower in the tree of node modules, the farther back in the array
	subResult.sort(function (a, b) {
		return a.lastIndexOf('node_modules') - b.lastIndexOf('node_modules');
	});

	result = result.concat(subResult);

	if ( ! that.getPathsCache) that.getPathsCache = {};
	that.getPathsCache[target] = result;

	return result;
};

// Load paths to local cache
Lfs.prototype.loadPaths = function loadPaths() {
	const	logPrefix	= topLogPrefix + 'Lfs.prototype.loadPaths() - ',
		that	= this;

	let	package_json;

	log.verbose(logPrefix + 'Loading paths cache relative to ' + that.options.basePath);

	try {
		package_json	= require(that.options.basePath + '/package.json');
	} catch (err) {
		log.info(logPrefix + 'Could not load package.json, err: ' + err.message);
	}

	// First go through the dependencies in the package file
	if (package_json && package_json.dependencies) {
		for (let depPath of Object.keys(package_json.dependencies)) {
			const	modPath	= path.normalize(that.options.basePath + '/node_modules/' + depPath);

			if (fs.existsSync(modPath)) {
				const	stats	= fs.statSync(modPath);

				if ( ! stats || ! stats.isDirectory()) {
					log.info(logPrefix + 'Module "' + depPath + '" not found at ' + modPath);
				} else {
					log.debug(logPrefix + 'Adding "' + depPath + '" to paths with full path ' + modPath);
					that.paths.push(modPath);
				}
			}
		}
	}

	// Add all other paths, recursively
	function loadPathsRec(thisPath) {
		const	subLogPrefix	= logPrefix + 'loadPathsRec() - ';

		let	thisPaths;

		if (that.paths.indexOf(thisPath) === - 1) {
			log.debug(subLogPrefix + 'Adding ' + path.basename(thisPath) + ' to paths with full path ' + thisPath);
			that.paths.push(thisPath);
		}

		thisPaths	= fs.readdirSync(thisPath + '/node_modules');

		for (let i = 0; thisPaths[i] !==  undefined; i ++) {
			try {
				const	subStat	= fs.statSync(thisPath + '/node_modules/' + thisPaths[i]);

				if (subStat.isDirectory()) {
					loadPathsRec(thisPath + '/node_modules/' + thisPaths[i]);
				}
			} catch (err) {
				log.silly(subLogPrefix + 'Could not read "' + thisPaths[i] + '": ' + err.message);
			}
		}
	}

	// Start in basePath
	try {
		loadPathsRec(that.options.basePath);
	} catch (err) {
		log.info(logPrefix + 'Could not find node_modules folder in "' + that.options.basePath + '". If you have modules installed, make sure options.basePath is set correctly when instancing larvitfs');
	}
};

exports = module.exports = Lfs;
