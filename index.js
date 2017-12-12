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

		try {
			let	stat	= fs.statSync(pathToResolve);

			if (stat.isFile()) {
				that.cache.set(pathToResolve, pathToResolve);
			} // No else here, since stat.isfile() throws on error
		} catch (err) {
			log.verbose(logPrefix + 'fs.statSync() threw err: ' + err.message);
			that.cache.set(pathToResolve, false);
		}

		return that.cache.get(pathToResolve);
	} else {
		log.debug(logPrefix + 'is relative, look in all the paths');

		for (let i = 0; that.paths[i] !== undefined; i ++) {
			let	testPath	= path.join(that.paths[i], pathToResolve);

			log.silly(logPrefix + 'Checking for ' + testPath);

			// Lookup if this file exists
			try {
				let	stat	= fs.statSync(testPath);

				if (stat.isFile()) {
					log.debug(logPrefix + 'Found "' + testPath + '" - loading to cache');
					that.cache.set(pathToResolve, testPath);
					return testPath;
				}
			} catch (err) {
				log.silly(logPrefix + testPath + ' does not exist, err: ' + err.message);
			}
		}

		// If we arrive here, no file have been found.
		that.cache.set(pathToResolve, false);

		return false;
	}
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
	if (package_json) {
		for (let depPath of Object.keys(package_json.dependencies)) {
			const	modPath	= path.normalize(that.options.basePath + '/node_modules/' + depPath),
				stats	= fs.statSync(modPath);

			if ( ! stats || ! stats.isDirectory()) {
				log.info(logPrefix + 'Module "' + depPath + '" not found at ' + modPath);
			} else {
				log.debug(logPrefix + 'Adding ' + depPath + ' to paths with full path ' + modPath);
				that.paths.push(modPath);
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
