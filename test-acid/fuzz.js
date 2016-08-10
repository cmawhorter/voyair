'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var async = require('async');

var helpers = require('./lib/helpers.js');
var logger = require('./lib/logger.js');
var voyair = require('./lib/watcher.js');

if (!process.argv[2]) {
  logger.error('Expects target absolute root directory as first argument. e.g. node fuzz.js /Volumes/VoyairTestingDisk');
  process.exit(1);
}

// Settings
// ===========================================================================

var TARGET_ROOT = helpers.TARGET_ROOT = path.join(process.argv[2]); // strips trailing slash, if it exists
var MAX_DIR_DEPTH = helpers.MAX_DIR_DEPTH = 4;
var MAX_NAME_LENGTH = helpers.MAX_NAME_LENGTH = 50;
var MAX_PATH_LENGTH = helpers.MAX_PATH_LENGTH = 255 - TARGET_ROOT.length;
var WORKER_CONCURRENCY = helpers.WORKER_CONCURRENCY = 8;
var WORKER_ITERATIONS = helpers.WORKER_ITERATIONS = 1;//parseInt(process.argv[3], 10) || 100;

if (!fs.existsSync(TARGET_ROOT)) {
  logger.error('Testing volume "' + TARGET_ROOT + '" does not exist');
  process.exit(1);
}

var emptyCheck = fs.readdirSync(TARGET_ROOT).filter(function(f) { return f[0] !== '.'; });
if (emptyCheck.length > 0) {
  logger.error('Testing volume "' + TARGET_ROOT + '" is not empty and cannot be used.');
  process.exit(1);
}

var allPaths = helpers.allPaths = [];

// mock fs object that just logs
var fsLogger = {};
['rename', 'truncate', 'chmod', 'stat', 'symlink', 'unlink', 'rmdir', 'mkdir', 'writeFile', 'appendFile'].forEach(function(method) {
  fsLogger[method] = function() {
    var args = Array.prototype.slice.call(arguments);
    logger.debug({ list: helpers.truncateArgs(args.slice(0, args.length - 1)) }, 'fs.' + method);
    process.nextTick(args.pop());
  };
});

var Actions = (function(fs) {
  function existingFile() {
    return allPaths.length ? allPaths[helpers.getRandomInt(0, allPaths.length)] : null;
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
  // [ fs.rename, existingFile, helpers.randomPath, function(targetFile, destinationFile, done) {
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
    [ fs.rename, existingFile, helpers.randomPath ],
    [ fs.rename, existingSubdir, helpers.randomPath ],
    [ fs.rename, existingSubdir, existingDir ],

    [ fs.truncate, existingFile, 0 ],
    // [ fs.chown, existingFile, 1, 1 ],
    [ fs.chmod, existingFile, '777' ],
    [ fs.stat, existingFile ],

    [ fs.symlink, existingFile, helpers.randomPath ],
    [ fs.symlink, existingSubdir, helpers.randomPath ],

    [ fs.unlink, existingFile ],
    [ fs.rmdir, existingSubdir ],
    [ fs.mkdir, helpers.randomPath ],

    [ fs.writeFile, helpers.randomPath, helpers.randomFileData ],
    [ fs.appendFile, helpers.randomPath, helpers.randomFileData ],
  ];
  actions.owner = fs;
  return actions;
})(fsLogger);

var remainingIterations = WORKER_ITERATIONS;
var work = function() {
  // get a random action
  var action = Actions[helpers.getRandomInt(0, Actions.length)];

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
      logger.debug({ allPaths: allPaths }, 'done');
      // voyair.shutdownSync();
      // process.exit(0);
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

// ===========================================================================


voyair.start(TARGET_ROOT + '/**/*');

voyair.on('item:created', function(item) {
  logger.info({ diskItem: item }, 'voyair -> item:created');
  item.data('update', new Date().toISOString());
});

voyair.on('item:current', function(item) {
  logger.info({ diskItem: item }, 'voyair -> item:current');
});

voyair.on('ready', function() {
  logger.info('voyair ready');
  setTimeout(work, 1500);
});
