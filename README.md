[![Build Status](https://travis-ci.org/larvit/larvitfs.svg?branch=master)](https://travis-ci.org/larvit/larvitfs) [![Dependencies](https://david-dm.org/larvit/larvitfs.svg)](https://david-dm.org/larvit/larvitfs.svg)

# larvitfs

Get a local file from a "virtual" hierarchy, merged filesystem inspired by the [Kohana Framework Cascading Filesystem](https://kohanaframework.org/3.3/guide/kohana/files)

## Usage

### Load module

All files are resolved relative to process.cwd() so make sure it is set correctly.

Paths are relative to process.cwd() as first priority. If nothing is found there, all modules will be tested as relative to this path to try to find a matching file. The modules are searched in the order given in package.json dependencies.

```javascript
const lfs = require('larvitfs');
```

### getPathSync()

The idea here is to be able to share files between modules and application in a transparant way.

Lets say you'd wish to serve a HTML file, index.html. The default file resides in our little module "foobar" like this:

```
./node_modules/foobar/public/index.html
```

If we run getPathSync('public/index.html'); we'll get the full path back:

```javascript
const fullPath = require('larvitfs').getPathSync('public/index.html');
// /app/absolute/path/node_modules/foobar/public/index.html
```

But if we add this file to our own application, in ./public/index.html, that file will be higher in priority and will be returned instead:

```javascript
const fullPath = require('larvitfs').getPathSync('public/index.html');
// /app/absolute/path/public/index.html
```

All modules in node_modules will be searched for the given file. The priority is decided by the list order in dependencies in package.json.