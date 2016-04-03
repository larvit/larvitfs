'use strict';

const package_json = require('./package.json'),
      path         = require('path'),
      log          = require('winston'),
      fs           = require('fs');

exports.cache = new Map();
exports.paths = [process.cwd()];

// Load paths to local cache
function loadPaths() {
	log.verbose('larvitfs: loadPaths() - Loading paths cache relative to ' + process.cwd());

	// First go through the dependencies in the package file
	for (let depPath of Object.keys(package_json.dependencies)) {
		const modPath = path.normalize(process.cwd() + '/node_modules/' + depPath),
		      stats   = fs.statSync(modPath);

		if ( ! stats || ! stats.isDirectory()) {
			log.info('larvitfs: loadPaths() - Module "' + depPath + '" not found at ' + modPath);
		} else {
			log.debug('larvitfs: loadPaths() - Adding ' + depPath + ' to paths with full path ' + modPath);
			exports.paths.push(modPath);
		}
	}

	// Add all other paths, recursively
	function loadPathsRec(thisPath) {
		let thisPaths;

		if (exports.paths.indexOf(thisPath) === - 1) {
			log.debug('larvitfs: loadPaths() - loadPathsRec() - Adding ' + path.basename(thisPath) + ' to paths with full path ' + thisPath);
			exports.paths.push(thisPath);
		}

		thisPaths = fs.readdirSync(thisPath + '/node_modules');

		for (let i = 0; thisPaths[i] !==  undefined; i ++) {
			try {
				const subStat = fs.statSync(thisPath + '/node_modules/' + thisPaths[i]);

				if (subStat.isDirectory()) {
					loadPathsRec(thisPath + '/node_modules/' + thisPaths[i]);
				}
			} catch(err) {
				log.silly('larvitfs: loadPaths() - loadPathsRec() - Could not read "' + thisPaths[i] + '": ' + err.message);
			}
		}
	}

	// Start in the current directory
	try {
		loadPathsRec(process.cwd());
	} catch(err) {
		log.info('larvitfs: loadPaths() - Could not find node_modules folder in "' + process.cwd() + '". If you have modules installed, make sure process.cwd() is set correctly before loading larvitfs');
	}
}
loadPaths();

exports.getPathSync = function getPathSync(pathToResolve) {
	if (exports.cache.get(pathToResolve) !== undefined) {
		log.silly('larvitfs: getPathSync() - Found ' + pathToResolve + ' in cache');
		return exports.cache.get(pathToResolve);
	}

	// Make sure we do not use up all the memory with caching violent amount of files
	if (exports.cache.size > 10000) {
		exports.cache.clear();
	}

	if (pathToResolve[0] === '/') {
		log.debug('larvitfs: getPathSync() - pathToResolve, "' + pathToResolve + '", starts with "/", only check aboslute path');

		try {
			let stat = fs.statSync(pathToResolve);

			if (stat.isFile()) {
				exports.cache.set(pathToResolve, pathToResolve);
			} else {
				exports.cache.set(pathToResolve, false);
			}
		} catch(err) {
			log.verbose('larvitfs: getPathSync() - fs.statSync() threw err: ' + err.message);
			exports.cache.set(pathToResolve, false);
		}

		return exports.cache.get(pathToResolve);
	} else {
		log.debug('larvitfs: getPathSync() - pathToResolve, "' + pathToResolve + '", is relative, look in all the paths');

		for (let i = 0; exports.paths[i] !== undefined; i ++) {
			let testPath = path.join(exports.paths[i], pathToResolve);

			log.silly('larvitfs: getPathSync() - Checking for ' + testPath);

			// Lookup if this file exists
			try {
				let stat = fs.statSync(testPath);

				if (stat.isFile()) {
					log.debug('larvitfs: getPathSync() - Found "' + testPath + '" - loading to cache');
					exports.cache.set(pathToResolve, testPath);
					return testPath;
				}
			} catch(e) {
				log.silly('larvitfs: getPathSync() - ' + testPath + ' does not exist');
			}
		}

		// If we arrive here, no file have been found.
		exports.cache.set(pathToResolve, false);

		return false;
	}
};