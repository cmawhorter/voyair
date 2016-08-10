'use strict';

var path = require('path');
var crypto = require('crypto');

var helpers = module.exports = {
  TARGET_ROOT: null,
  MAX_DIR_DEPTH: null,
  MAX_NAME_LENGTH: null,
  MAX_PATH_LENGTH: null,
  WORKER_CONCURRENCY: null,
  WORKER_ITERATIONS: null,

  allPaths: null,

  getRandomInt: function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  },

  randomString: function(max, min) {
    min = min || 1;
    max = max || helpers.MAX_NAME_LENGTH;
    var bytes = helpers.getRandomInt(min, Math.max(min, Math.floor(max / 2)));
    return bytes ? crypto.randomBytes(bytes).toString('hex') : '';
  },

  randomPath: function(maxDepth) {
    maxDepth = maxDepth || helpers.MAX_DIR_DEPTH;
    var generated = [helpers.TARGET_ROOT]
      , remainingLen = helpers.MAX_PATH_LENGTH
      , p;
    while (--maxDepth) {
      var tok = helpers.randomString(Math.min(helpers.MAX_NAME_LENGTH, remainingLen));
      remainingLen -= tok.length + 1; // separator
      generated.push(tok);
    }
    p = path.join.apply(path, generated);
    helpers.allPaths.push(p);
    return p;
  },

  randomFileData: function() {
    return helpers.randomString(1024 * 1024 * 128, 0);
  },

  truncateArgs: function(args) {
    return args.map(function(arg) {
      arg = '' + arg;
      return arg.length > 30 ? arg.substr(0, 15) + '...snip...' + arg.substr(-15) + ' (Total length: ' + arg.length + ')' : arg;
    });
  },
};
