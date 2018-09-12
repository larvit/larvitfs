[![Build Status](https://travis-ci.org/larvit/larvitfs.svg?branch=master)](https://travis-ci.org/larvit/larvitfs) [![Dependencies](https://david-dm.org/larvit/larvitfs.svg)](https://david-dm.org/larvit/larvitfs.svg)
[![Coverage Status](https://coveralls.io/repos/github/larvit/larvitfs/badge.svg)](https://coveralls.io/github/larvit/larvitfs)

# larvitfs

Get a local file from a "virtual" hierarchy, merged filesystem inspired by the [Kohana Framework Cascading Filesystem](https://v2docs.kohanaframework.org/3.3/guide/kohana/files).

The whole module is synchronous to work well with various template engines and other stuff. Since it returnes the resolved files from a local cache, this should normally not be a problem. However, if this module is used for thousands and thousands of files with different filenames this will have an performance impact.

## Installation

```bash
npm i larvitfs
```

## Usage

### Load module

Paths are relative to process.cwd() as first priority. If nothing is found there, all modules will be tested as relative to this path to try to find a matching file. The modules are searched in the order given in package.json dependencies.

#### CommonJS

```javascript
const LUtils = require('larvitutils'),
      Lfs    = require('larvitfs'),
      lfs    = new Lfs({
        'basePath':     process.cwd(),            // OPTIONAL
        'cacheMaxSize': 10000,                    // OPTIONAL
        'log':          new (new LUtils()).Log(), // OPTIONAL
        'fs':           require('fs')             // OPTIONAL
      });
```

#### ES6 modules

```javascript
import Lfs from 'larvitfs';
const lfs = new Lfs({}); // And of course with all the options as above
```

### getPathSync()

The idea here is to be able to share files between modules and application in a transparant way.

Lets say you'd wish to serve a HTML file, index.html. The default file resides in our little module "foobar" like this:

```
./node_modules/foobar/public/index.html
```

If we run getPathSync('public/index.html'); we'll get the full path back:

```javascript
const Lfs = require('larvitfs'),
      lfs = new Lfs();

console.log(lfs.getPathSync('public/index.html'));
// /app/absolute/path/node_modules/foobar/public/index.html
```

But if we add this file to our own application, in ./public/index.html, that file will be higher in priority and will be returned instead:

```javascript
const Lfs = require('larvitfs'),
      lfs = new Lfs();

console.log(lfs.getPathSync('public/index.html'));
// /app/absolute/path/public/index.html
```

All modules in node_modules will be searched for the given file. The priority is decided by the list order in dependencies in package.json.

### getPathsSync()

The idea with this function is to be able to get a list of paths sorted in the dependency order. First local paths, then dependency paths and then everything else.

```javascript
const Lfs = require('larvitfs'),
      lfs = new Lfs();

console.log(lfs.getPathsSync('public/index.html'));
// [
//	'/app/absolute/path/public/index.html',
//	'/app/absolute/path/node_modules/directDependency/public/index.html',
//	'/app/absolute/path/node_modules/indirectDependency/public/index.html'
//]
```
