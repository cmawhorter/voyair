var fs = require('fs')
  , crypto = require('crypto');

var SSE4CRC32 = require('sse4_crc32');

function statStrategy(property) {
  return function(filename, existing, callback) {
    fs.stat(filename, function(err, stats) {
      if (err) {
        return callback(err);
      }
      var calculated = stats[property];
      callback(null, compare(existing, calculated));
    });
  };
}

function hashStrategy(algo) {
  return function(filename, existing, callback) {
    var fd = fs.createReadStream(filename)
      , hash = crypto.createHash(algo || 'md5');

    hash.setEncoding('hex');

    fd.on('error', function(err) {
      callback(err);
    });

    fd.on('end', function() {
      hash.end();
      var calculated = hash.read();
      callback(null, calculated, compare(existing, calculated));
    });

    fd.pipe(hash);
  }
}

module.exports = {
  access: statStrategy('atime'),
  modification: statStrategy('mtime'),
  change: statStrategy('ctime'),
  create: statStrategy('birthtime'),
  size: statStrategy('size'),

  md5: hashStrategy('md5'),
  sha1: hashStrategy('sha1'),
  sha256: hashStrategy('sha256'),
  sha512: hashStrategy('sha512'),

  crc: function(filename, existing, callback) {
    var sse4crc32 = new SSE4CRC32.CRC32()
      , fd = fs.createReadStream(filename);

    fd.on('data', fs.sse4crc32.update);

    fd.on('error', function(err) {
      callback(err);
    });

    fd.on('end', function() {
      var calculated = sse4crc32.crc();
      callback(null, calculated, compare(existing, calculated));
    });
  },

  factories: {
    stat: statStrategy,
    hash: hashStrategy
  }
};
