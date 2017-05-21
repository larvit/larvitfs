'use strict';

const	package_json	= require('./package.json'),
	topLogPrefix	= 'larvitfs: index.js: ',
	path	= require('path'),
	log	= require('winston'),
	fs	= require('fs');

exports.cache	= new Map();
exports.paths	= [process.cwd()];

// Load paths to local cache
function loadPaths() {
	const	logPrefix	= topLogPrefix + 'loadPaths() - ';

	log.verbose(logPrefix + 'Loading paths cache relative to ' + process.cwd());

	// First go through the dependencies in the package file
	for (let depPath of Object.keys(package_json.dependencies)) {
		const	modPath	= path.normalize(process.cwd() + '/node_modules/' + depPath),
			stats	= fs.statSync(modPath);

		if ( ! stats || ! stats.isDirectory()) {
			log.info(logPrefix + 'Module "' + depPath + '" not found at ' + modPath);
		} else {
			log.debug(logPrefix + 'Adding ' + depPath + ' to paths with full path ' + modPath);
			exports.paths.push(modPath);
		}
	}

	// Add all other paths, recursively
	function loadPathsRec(thisPath) {
		const	subLogPrefix	= logPrefix + 'loadPathsRec() - ';

		let	thisPaths;

		if (exports.paths.indexOf(thisPath) === - 1) {
			log.debug(subLogPrefix + 'Adding ' + path.basename(thisPath) + ' to paths with full path ' + thisPath);
			exports.paths.push(thisPath);
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

	// Start in the current directory
	try {
		loadPathsRec(process.cwd());
	} catch (err) {
		log.info(logPrefix + 'Could not find node_modules folder in "' + process.cwd() + '". If you have modules installed, make sure process.cwd() is set correctly before loading larvitfs');
	}
}
loadPaths();

function getPathSync(pathToResolve) {
	const	logPrefix = topLogPrefix + 'getPathSync() - pathToResolve: "' + pathToResolve + '" - ';

	if (exports.cache.get(pathToResolve) !== undefined) {
		log.silly(logPrefix + 'Found in cache');
		return exports.cache.get(pathToResolve);
	}

	// Make sure we do not use up all the memory with caching violent amount of files
	if (exports.cache.size > 10000) {
		exports.cache.clear();
	}

	if (pathToResolve[0] === '/') {
		log.debug(logPrefix + 'starts with "/", only check absolute path');

		try {
			let	stat	= fs.statSync(pathToResolve);

			if (stat.isFile()) {
				exports.cache.set(pathToResolve, pathToResolve);
			} else {
				exports.cache.set(pathToResolve, false);
			}
		} catch (err) {
			log.verbose(logPrefix + 'fs.statSync() threw err: ' + err.message);
			exports.cache.set(pathToResolve, false);
		}

		return exports.cache.get(pathToResolve);
	} else {
		log.debug(logPrefix + 'is relative, look in all the paths');

		for (let i = 0; exports.paths[i] !== undefined; i ++) {
			let	testPath	= path.join(exports.paths[i], pathToResolve);

			log.silly(logPrefix + 'Checking for ' + testPath);

			// Lookup if this file exists
			try {
				let	stat	= fs.statSync(testPath);

				if (stat.isFile()) {
					log.debug(logPrefix + 'Found "' + testPath + '" - loading to cache');
					exports.cache.set(pathToResolve, testPath);
					return testPath;
				}
			} catch (err) {
				log.silly(logPrefix + testPath + ' does not exist, err: ' + err.message);
			}
		}

		// If we arrive here, no file have been found.
		exports.cache.set(pathToResolve, false);

		return false;
	}
};

exports.getPathSync	= getPathSync;
