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
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		resolvedPath	= lfs.getPathSync('public/dummy.txt');

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(),	'Horses does not exist');
		t.end();
	});
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

test('Fetch foo.txt from a test module but we pretend its local', function(t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		resolvedPath	= lfs.getPathSync('public/foo.txt');

	fs.readFile(resolvedPath, function (err, data) {
		if (err) throw err;

		t.equal(data.toString(),	'bar');
		t.end();
	});
});

test('Fetch muppet.txt from a dependency to a module', function(t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		resolvedPath	= lfs.getPathSync('public/muppet.txt');

	fs.readFile(resolvedPath, function(err, data) {
		if (err) throw err;

		t.equal(data.toString(),	'oh, such muppet');
		t.end();
	});
});

test('Fail to fetch nonexisting.txt', function(t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		resolvedPath	= lfs.getPathSync('nonexisting.txt');

	t.equal(resolvedPath,	false);
	t.end();
});

test('Fetch deep file', function(t) {
	const	lfs	= new Lfs({'basePath': __dirname + '/..'}),
		resolvedPath	= lfs.getPathSync('public/baz/mek.txt');

	fs.readFile(resolvedPath, function(err, data) {
		if (err) throw err;

		t.equal(data.toString(),	'hest');
		t.end();
	});
});
