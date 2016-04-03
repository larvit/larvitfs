'use strict';

const assert = require('assert'),
      log    = require('winston'),
      fs     = require('fs');

let lfs;

// Make sure this is ran from the correct folder
process.chdir(__dirname + '/..');

// Set up winston
log.remove(log.transports.Console);
log.add(log.transports.Console, {
	'level':     'info',
	'colorize':  true,
	'timestamp': true,
	'json':      false
});

// Do this after winston is set up so we get all logging messages correctly
lfs = require('../index.js');

describe('getPathSync()', function() {
	it('Should fetch dummy.txt from local public', function(done) {
		const resolvedPath = lfs.getPathSync('public/dummy.txt');

		fs.readFile(resolvedPath, function(err, data) {
			assert( ! err, 'Err should be negative');
			assert.deepEqual(data.toString(), 'Horses does not exist');

			done();
		});
	});

	it('Should fetch dummy.txt from absolute path', function(done) {
		const absPath      = process.cwd() + '/node_modules/test_module/public/dummy.txt',
		      resolvedPath = lfs.getPathSync(absPath);

		fs.readFile(resolvedPath, function(err, data) {
			assert( ! err, 'Err should be negative');
			assert.deepEqual(data.toString(), 'nope');

			done();
		});
	});

	it('Should fetch foo.txt from a test module but we pretend its local', function(done) {
		const resolvedPath = lfs.getPathSync('public/foo.txt');

		fs.readFile(resolvedPath, function(err, data) {
			assert( ! err, 'Err should be negative');
			assert.deepEqual(data.toString(), 'bar');

			done();
		});
	});

	it('Should fetch muppet.txt from a dependency to a module', function(done) {
		const resolvedPath = lfs.getPathSync('public/muppet.txt');

		fs.readFile(resolvedPath, function(err, data) {
			assert( ! err, 'Err should be negative');
			assert.deepEqual(data.toString(), 'oh, such muppet');

			done();
		});
	});

	it('Should fail to fetch nonexisting.txt', function(done) {
		const resolvedPath = lfs.getPathSync('nonexisting.txt');

		assert.deepEqual(resolvedPath, false);

		done();
	});
});