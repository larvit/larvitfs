'use strict';

const LUtils = require('larvitutils');
const test   = require('tape');
const Lfs    = require(__dirname + '/../index.js');
const log    = new (new LUtils()).Log('none');
const fs     = require('fs');

test('Fetch dummy.txt from local public', function (t) {
	process.chdir(__dirname + '/..');
	(function () {
		const lfs          = new Lfs({'log': log});
		const resolvedPath = lfs.getPathSync('public/dummy.txt');

		fs.readFile(resolvedPath, function (err, data) {
			if (err) throw err;

			t.equal(data.toString(), 'Horses does not exist');
			t.end();
		});
	})();
});

test('Fetch dummy.txt from absolute path', function (t) {
	const lfs          = new Lfs({'basePath': __dirname + '/..', 'log': log});
	const absPath      = __dirname + '/../node_modules/test_module/public/dummy.txt';
	const resolvedPath = lfs.getPathSync(absPath);

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(), 'nope');
		t.end();
	});
});

test('Fetch dummy.txt from path without package.json', function (t) {
	const lfs          = new Lfs({'basePath': __dirname + '/../test_module/public', 'log': log});
	const resolvedPath = lfs.getPathSync('dummy.txt');

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(), 'nope');
		t.end();
	});
});

test('Fetch foo.txt from a test module but we pretend its local', function (t) {
	const lfs          = new Lfs({'basePath': __dirname + '/..', 'log': log});
	const resolvedPath = lfs.getPathSync('public/foo.txt');

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(), 'bar');
		t.end();
	});
});

test('Fetch muppet.txt from a dependency to a module', function (t) {
	const lfs          = new Lfs({'basePath': __dirname + '/..', 'log': log});
	const resolvedPath = lfs.getPathSync('public/muppet.txt');

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(), 'oh, such muppet');
		t.end();
	});
});

test('Fail to fetch nonexisting.txt', function (t) {
	const lfs          = new Lfs({'basePath': __dirname + '/..', 'log': log});
	const resolvedPath = lfs.getPathSync('nonexisting.txt');

	t.equal(resolvedPath, false);
	t.end();
});

test('Fail to fetch absolute pathed /hurr/burr/nonexisting.txt', function (t) {
	const lfs          = new Lfs({'log': log});
	const resolvedPath = lfs.getPathSync('/hurr/burr/nonexisting.txt');

	t.equal(resolvedPath, false);
	t.end();
});

test('Fetch deep file', function (t) {
	const lfs          = new Lfs({'basePath': __dirname + '/..', 'log': log});
	const resolvedPath = lfs.getPathSync('public/baz/mek.txt');

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(), 'hest');
		t.end();
	});
});

test('Fetch deep file, cached', function (t) {
	const lfs                = new Lfs({'basePath': __dirname + '/..', 'log': log});
	const resolvedPath       = lfs.getPathSync('public/baz/mek.txt');
	const cachedResolvedPath = lfs.getPathSync('public/baz/mek.txt');

	t.equal(resolvedPath, cachedResolvedPath);
	t.end();
});

test('Clear cache when reached threshold', function (t) {
	const lfs = new Lfs({'basePath': __dirname + '/..', 'cacheMaxSize': 1, 'log': log});

	t.equal(lfs.cache.size, 0);
	lfs.getPathSync('public/dummy.txt');
	t.equal(lfs.cache.size, 1);
	lfs.getPathSync('public/muppet.txt');
	t.equal(lfs.cache.size, 1);

	t.end();
});

test('Gracefully handle missing module in package.json', function (t) {
	const lfs          = new Lfs({'basePath': __dirname + '/../test_module', 'log': log});
	const resolvedPath = lfs.getPathSync('public/muppet.txt');

	t.equal(resolvedPath, false);
	t.end();
});

test('Gracefully handle when module is a file', function (t) {
	const lfs          = new Lfs({'basePath': __dirname + '/../test_module_broken', 'log': log});
	const resolvedPath = lfs.getPathSync('nope');

	t.equal(resolvedPath, false);
	t.end();
});

test('Gracefully handle when package.json got no dependencies', function (t) {
	const lfs          = new Lfs({'basePath': __dirname + '/../test_module_nodeps', 'log': log});
	const resolvedPath = lfs.getPathSync('nope');

	t.equal(resolvedPath, false);
	t.end();
});

test('getPathsSync, invalid target', function (t) {
	const lfs = new Lfs({
		'basePath':     __dirname + '/test_environment/1',
		'cacheMaxSize': 1,
		'log':          log
	});
	const result = lfs.getPathsSync();

	t.equal(result, false);
	t.end();
});

test('getPathsSync, directory', function (t) {
	const lfs = new Lfs({
		'basePath':     __dirname + '/test_environment/1',
		'cacheMaxSize': 1,
		'log':          log
	});
	const result = lfs.getPathsSync('controllers');

	t.equal(result.length, 4);
	t.equal(result[0].endsWith('test_environment/1/controllers'), true);
	t.equal(result[1].endsWith('test_environment/1/node_modules/binkbonk/controllers'), true);
	t.equal(result[2].endsWith('test_environment/1/node_modules/slinkslonk/controllers'), true);
	t.equal(result[3].endsWith('test_environment/1/node_modules/binkbonk/node_modules/untz/controllers'), true);
	t.end();
});

test('getPathsSync, invalid base path', function (t) {
	const lfs = new Lfs({
		'basePath':     __dirname + '/test_environment/X',
		'cacheMaxSize': 1,
		'log':          log
	});
	const result = lfs.getPathsSync('balja');

	t.equal(result.length,	0);
	t.end();
});

test('getPathsSync, file', function (t) {
	const lfs = new Lfs({
		'basePath':     __dirname + '/test_environment/1',
		'cacheMaxSize': 1,
		'log':          log
	});
	const result = lfs.getPathsSync('foo.js');

	t.equal(result.length, 3);
	t.equal(result[0].endsWith('test_environment/1/controllers/foo.js'), true);
	t.equal(result[1].endsWith('test_environment/1/node_modules/binkbonk/controllers/v1.2/foo.js'), true);
	t.equal(result[2].endsWith('test_environment/1/node_modules/slinkslonk/controllers/v1.0/foo.js'), true);
	t.end();
});

test('getPathsSync, file and directory', function (t) {
	const lfs = new Lfs({
		'basePath':     __dirname + '/test_environment/1',
		'cacheMaxSize': 1,
		'log':          log
	});
	const result = lfs.getPathsSync('/controllers/foo.js');

	t.equal(result.length, 1);
	t.equal(result[0].endsWith('test_environment/1/controllers/foo.js'), true);
	t.end();
});

test('getPathsSync, cache test', function (t) {
	const lfs = new Lfs({
		'basePath':     __dirname + '/test_environment/1',
		'cacheMaxSize': 1,
		'log':          log
	});

	let result;

	// Create tmp file to avoid messing up the other tests
	fs.closeSync(fs.openSync(__dirname + '/test_environment/1/controllers/woo.js', 'w'));

	result = lfs.getPathsSync('/controllers/woo.js');

	t.equal(result.length, 1);
	t.equal(result[0].endsWith('test_environment/1/controllers/woo.js'), true);

	fs.unlink(__dirname + '/test_environment/1/controllers/woo.js', function (err) {
		if (err) throw err;

		result = lfs.getPathsSync('/controllers/woo.js');

		t.equal(result.length, 1);
		t.equal(result[0].endsWith('test_environment/1/controllers/woo.js'), true);

		result = lfs.getPathsSync('/controllers/woo.js', true);

		t.equal(result.length, 0);

		t.end();
	});
});

/* eslint-disable require-jsdoc */
test('getPathsSync, fs.statsSync throwing error', function (t) {
	const org_statSync = fs.statSync;
	const lfs          = new Lfs({
		'basePath':     __dirname + '/test_environment/1',
		'cacheMaxSize': 1,
		'log':          log
	});

	let result;

	function statSync(dir) {
		if (fs.throw === true) {
			throw new Error('something went wrong');
		}

		return org_statSync(dir);
	}

	fs.statSync = statSync;
	fs.throw    = true;
	result      = lfs.getPathsSync('foo.js');
	fs.throw    = false;

	t.equal(result, false);
	t.end();
});

test('getPathsSync, fs.readdirSync throwing error', function (t) {
	const org_readdirSync = fs.readdirSync;
	const lfs = new Lfs({
		'basePath':     __dirname + '/test_environment/1',
		'cacheMaxSize': 1,
		'log':          log
	});

	let result;

	function readdirSync(dir) {
		if (fs.throw === true) {
			throw new Error('something went wrong');
		}

		return org_readdirSync(dir);
	}

	fs.readdirSync = readdirSync;
	fs.throw       = true;
	result         = lfs.getPathsSync('foo.js');
	fs.throw       = false;

	t.equal(result, false);
	t.end();
});
/* eslint-enable require-jsdoc */
