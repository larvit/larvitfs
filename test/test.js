'use strict';

const	test	= require('tape'),
	Lfs	= require(__dirname + '/../index.js'),
	log	= require('winston'),
	fs	= require('fs');

// Set up winston
log.remove(log.transports.Console);
/** /log.add(log.transports.Console, {
	'level':     'info',
	'colorize':  true,
	'timestamp': true,
	'json':      false
});/**/

test('Fetch dummy.txt from local public', function (t) {
	process.chdir(__dirname + '/..');
	(function (){
		const	lfs	= new Lfs(),
			resolvedPath	= lfs.getPathSync('public/dummy.txt');

		fs.readFile(resolvedPath, function (err, data) {
			if (err) throw err;

			t.equal(data.toString(),	'Horses does not exist');
			t.end();
		});
	})();
});

test('Fetch dummy.txt from absolute path', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		absPath	= __dirname + '/../node_modules/test_module/public/dummy.txt',
		resolvedPath	= lfs.getPathSync(absPath);

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(),	'nope');
		t.end();
	});
});

test('Fetch dummy.txt from path without package.json', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/../test_module/public'}),
		resolvedPath	= lfs.getPathSync('dummy.txt');

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(),	'nope');
		t.end();
	});
});

test('Fetch foo.txt from a test module but we pretend its local', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		resolvedPath	= lfs.getPathSync('public/foo.txt');

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(),	'bar');
		t.end();
	});
});

test('Fetch muppet.txt from a dependency to a module', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		resolvedPath	= lfs.getPathSync('public/muppet.txt');

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(),	'oh, such muppet');
		t.end();
	});
});

test('Fail to fetch nonexisting.txt', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		resolvedPath	= lfs.getPathSync('nonexisting.txt');

	t.equal(resolvedPath,	false);
	t.end();
});

test('Fail to fetch absolute pathed /hurr/burr/nonexisting.txt', function (t) {
	const	lfs	= new Lfs(),
		resolvedPath	= lfs.getPathSync('/hurr/burr/nonexisting.txt');

	t.equal(resolvedPath,	false);
	t.end();
});

test('Fetch deep file', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		resolvedPath	= lfs.getPathSync('public/baz/mek.txt');

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(),	'hest');
		t.end();
	});
});

test('Fetch deep file, cached', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		resolvedPath	= lfs.getPathSync('public/baz/mek.txt'),
		cachedResolvedPath	= lfs.getPathSync('public/baz/mek.txt');

	t.equal(resolvedPath,	cachedResolvedPath);
	t.end();
});

test('Clear cache when reached threshold', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..', 'cacheMaxSize': 1});

	t.equal(lfs.cache.size,	0);
	lfs.getPathSync('public/dummy.txt');
	t.equal(lfs.cache.size,	1);
	lfs.getPathSync('public/muppet.txt');
	t.equal(lfs.cache.size,	1);

	t.end();
});

test('Gracefully handle missing module in package.json', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/../test_module'}),
		resolvedPath	= lfs.getPathSync('public/muppet.txt');

	t.equal(resolvedPath,	false);
	t.end();
});

test('Gracefully handle when module is a file', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/../test_module_broken'}),
		resolvedPath	= lfs.getPathSync('nope');

	t.equal(resolvedPath,	false);
	t.end();
});

test('Gracefully handle when package.json got no dependencies', function (t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/../test_module_nodeps'}),
		resolvedPath	= lfs.getPathSync('nope');

	t.equal(resolvedPath,	false);
	t.end();
});

test('getPathsSync, directory', function (t) {
	const	lfs	= new Lfs({
			'basePath': __dirname + '/test_environment/1',
			'cacheMaxSize': 1
		}),
		result = lfs.getPathsSync('controllers');

		console.log(result);
	t.equal(result.length, 4);
	t.equal(result[0].endsWith('test_environment/1/controllers'), true);
	t.equal(result[1].endsWith('test_environment/1/node_modules/binkbonk/controllers'), true);
	t.equal(result[2].endsWith('test_environment/1/node_modules/slinkslonk/controllers'), true);
	t.equal(result[3].endsWith('test_environment/1/node_modules/binkbonk/node_modules/untz/controllers'), true);
	t.end();
});