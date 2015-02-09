var fs = require('fs')
  , path = require('path');

var gaze = require('gaze')
  , async = require('async');

var Item = require('./lib/item.js')
  , strategies = require('./lib/strategies.js');

function Cuckold(pattern, opts) {
  opts = opts || {};
  this.options = {
      destination: './watched.json'
    , writeOnExit: true
    , comparisonStrategy: strategies.modification
    , globPattern: pattern || './*'
    , globOptions: null
  };
  for (var k in opts) {
    if (k in this.options) {
      this.options[k] = opts[k];
    }
    else {
      throw new Error('Invalid option "' + k + '"');
    }
  }

  this.db = {};
  this.watchers = [];
}

Cuckold.prototype.start = function(callback) {
  var _this = this
  , watch = function(cb) {
      _this.watch(_this.options.globPattern, _this.options.globOptions, cb);
    };
  fs.exists(_this.options.destination, function(exists) {
    if (exists) {
      _this.load(_this.options.destination, function(err) {
        if (err) {
          return callback(err);
        }
        watch(callback);
        return;
      });
    }
    else {
      watch(callback);
      return;
    }
  });
};

Cuckold.prototype.save = function() {
  var _this = this
    , file = fs.createWriteStream(_this.diskDestination);
  process.setImmediate(function() {
    file.
    _this.db.forEach(function(item) {

    });
  });
  return file;
};

Cuckold.prototype.load = function(destination, callback) {
  var _this = this;
  fs.readFile(destination, function(err, data) {
    if (err) {
      return callback(err);
    }
    _this.import(JSON.parse(data), callback);
  });
};

Cuckold.prototype.watch = function(globPattern, globOptions, callback) {
  var _this = this;
  gaze(globPattern, globOptions, function(err, watcher) {
    if (err) {
      return callback(err);
    }

    _this.watchers.push(watcher);

    watcher.watched(function(err, watched) {
      if (err) {
        return callback(err);
      }
      _this.import(Cuckold.filesToObjects(watched), callback);
    });

    watcher.on('all', function(event, filepath) {
      switch (event) {
        case 'changed':
        case 'added':
          _this.invalidate(filepath);
        break;
        case 'deleted':
          _this.remove(filepath);
        break;
      }
    });
  });
};

Cuckold.prototype.import = function(db, concurrency, callback) {
  var _this = this;
  if (typeof concurrency === 'function') {
    callback = concurrency;
    concurrency = 12;
  }

  var readQueue = async.queue(function(task, callback) {
    _this.comparisonStrategy(task.relativePath, task.revision, function(err, calculated, invalidated) {
      if (err) {
        return callback(err);
      }
      if (invalidated) {
        _this.invalidate(task.relativePath);
      }
      _this.add(task.relativePath, calculated, task.data);
    });
  }, concurrency);

  readQueue.drain = function() {
    readQueue.kill();
    callback(null);
  };

  for (var relativePath in db) {
    var importdatedData = db[relativePath];
    _this.readQueue.push({
        relativePath: relativePath
      , revision: importdatedData.revision || null
      , data: importdatedData.data || null
    });
  }
};

Cuckold.prototype.add = function(relativePath, revision, data) {
  if (!this.db[relativePath]) {
    this.db[relativePath] = new Item(relativePath, revision, data);
  }
  else {
    throw new Error('Item already being tracked at "' + relativePath + '"');
  }
};

Cuckold.prototype.invalidate = function(relativePath) {
  this.db[relativePath] = null;
};

Cuckold.prototype.remove = function(relativePath) {
  if (this.db[relativePath]) {
    delete this.db[relativePath];
  }
};

Cuckold.filesToObjects = function(files) {
  files = files || [];
  var db = {};
  for (var i=0; i < files.length; i++) {
    var relativePath = files[i];
    db[relativePath] = {
        revision: null
      , data: null
    };
  }
  return db;
};

Cuckold.strategies = strategies;

module.exports = Cuckold;
