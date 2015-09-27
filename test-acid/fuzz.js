'use strict';

var assert = require('assert');
// TODO: implement ramdisk tests
// var volume = require('./shared/volume.js');
var Voyair = require('../index.js');

// === BEGIN FUZZ SCRIPT ===

// TODO: split up into independent project/libs and include
// TODO: add bunyan

var fs = require('fs')
  , path = require('path')
  , cluster = require('cluster')
  , crypto = require('crypto');

if (!process.argv[2]) {
  console.error('Expects target absolute root directory as first argument. e.g. node fuzz.js /Volumes/SomeRamDisk');
  process.exit(1);
}

// Settings
// ===========================================================================

var TARGET_ROOT = path.join(process.argv[2]); // strips trailing slash, if it exists
var MAX_DIR_DEPTH = 4;
var MAX_NAME_LENGTH = 50;
var MAX_PATH_LENGTH = 255 - TARGET_ROOT.length;
var WORKER_CONCURRENCY = 8;
var WORKER_ITERATIONS = parseInt(process.argv[3], 10) || 100;

if (!fs.existsSync(TARGET_ROOT)) {
  console.error('Testing volume "%s" does not exist.', TARGET_ROOT);
  process.exit(1);
}

var emptyCheck = fs.readdirSync(TARGET_ROOT).filter(function(f) { return f[0] !== '.'; });
if (emptyCheck.length > 0) {
  console.error('Testing volume "%s" is not empty and cannot be used.', TARGET_ROOT);
  process.exit(1);
}

// ===========================================================================


// Helpers
// ===========================================================================

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function randomString(max, min) {
  min = min || 1;
  max = max || MAX_NAME_LENGTH;
  var bytes = getRandomInt(min, Math.max(min, Math.floor(max / 2)));
  return bytes ? crypto.randomBytes(bytes).toString('hex') : '';
}

function randomPath(maxDepth) {
  maxDepth = maxDepth || MAX_DIR_DEPTH;
  var generated = [TARGET_ROOT]
    , remainingLen = MAX_PATH_LENGTH
    , p;
  while (--maxDepth) {
    var tok = randomString(Math.min(MAX_NAME_LENGTH, remainingLen));
    remainingLen -= tok.length + 1; // separator
    generated.push(tok);
  }
  p = path.join.apply(path, generated);
  allPaths.push(p);
  return p;
}

function randomFileData() {
  return randomString(1024 * 1024 * 128, 0);
}

function truncateArgs(args) {
  return JSON.stringify(args.map(function(arg) {
    arg = '' + arg;
    return arg.length > 30 ? arg.substr(0, 15) + '...snip...' + arg.substr(-15) + ' (Total length: ' + arg.length + ')' : arg;
  }));
}

// ===========================================================================


if (cluster.isMaster) {

  // Cluster Master
  // ===========================================================================

  // TODO: import watcher here

  for (var i=0; i < WORKER_CONCURRENCY; i++) {
    cluster.fork();
  }

  // create .on('message') for handling incoming test cases

  cluster.on('exit', function(worker, code, signal) {
    if (0 !== code) {
      console.log('worker ' + worker.process.pid + ' died. restarting in 1s...');
      setTimeout(function() {
        cluster.fork();
      }, 1000);
    }
  });

  // ===========================================================================

}
else {

  // Cluster Workers
  // ===========================================================================

  var allPaths = [];

  // mock fs object that just logs
  var fsLogger = {};
  ['rename', 'truncate', 'chmod', 'stat', 'symlink', 'unlink', 'rmdir', 'mkdir', 'writeFile', 'appendFile'].forEach(function(method) {
    fsLogger[method] = function() {
      var args = Array.prototype.slice.call(arguments);
      console.log('[%s] fsLogger.%s: ', process.pid, method, truncateArgs(args.slice(0, args.length - 1)));
      process.nextTick(args.pop());
    };
  });

  var Actions = (function(fs) {
    function existingFile() {
      return allPaths.length ? allPaths[getRandomInt(0, allPaths.length)] : null;
    }

    function existingDir() {
      // TODO: should get a random file and return the dir
      var f = existingFile();
      return path.dirname(f);
    }

    function existingSubdir() {
      var d = existingDir();
      return d !== TARGET_ROOT ? d : null;
    }

    // TODO: implement callback that gets called with the original arguments that pushes a test case that automatically times out after 100ms or something
    // TODO: needs to message master to do the actual testing
    // e.g.
    // [ fs.rename, existingFile, randomPath, function(targetFile, destinationFile, done) {
    //   var completed = 0;
    //   var handler = function() {
    //     // TODO: only target events matching the target/destination files
    //     completed++;
    //     if (completed === 2) {
    //       done();
    //     }
    //   };
    //   watcher.on('add', handler);
    //   watcher.on('remove', handler);
    //   // TODO: clean up handlers
    // } ]
    var actions = [
      [ fs.rename, existingFile, randomPath ],
      [ fs.rename, existingSubdir, randomPath ],
      [ fs.rename, existingSubdir, existingDir ],

      [ fs.truncate, existingFile, 0 ],
      // [ fs.chown, existingFile, 1, 1 ],
      [ fs.chmod, existingFile, '777' ],
      [ fs.stat, existingFile ],

      [ fs.symlink, existingFile, randomPath ],
      [ fs.symlink, existingSubdir, randomPath ],

      [ fs.unlink, existingFile ],
      [ fs.rmdir, existingSubdir ],
      [ fs.mkdir, randomPath ],

      [ fs.writeFile, randomPath, randomFileData ],
      [ fs.appendFile, randomPath, randomFileData ],
    ];
    actions.owner = fs;
    return actions;
  })(fsLogger);

  var remainingIterations = WORKER_ITERATIONS;
  var work = function() {
    // get a random action
    var action = Actions[getRandomInt(0, Actions.length)];

    // the action's method
    var fn = action[0];

    // build the actions arguments array
    var containsNulls = false;
    var args = action.slice(1).map(function(arg) {
      var generated = typeof arg === 'function' ? arg() : arg;
      if (null === generated) {
        containsNulls = true;
      }
      return generated;
    });

    // with the last being the callback to do more work
    args.push(function(err) {
      if (err) {
        throw err;
      }
      remainingIterations--;
      if (remainingIterations > 0) {
        process.nextTick(work);
      }
      else {
        console.log('%s done', process.pid);
        console.log(allPaths);
        process.exit(0);
      }
    });

    // if args contains nulls it means it has invalid data.
    // it may take some time for everythine to warm up and stop returning null
    if (containsNulls) {
      // just try again
      process.nextTick(work);
    }
    else {
      // call the action's method with the constructed arguments
      fn.apply(Actions.owner, args);
    }
  }
  work();

  // ===========================================================================

} // if (cluster.isMaster) {
