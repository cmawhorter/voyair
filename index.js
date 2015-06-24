'use strict';

var fs = require('fs')
  , util = require('util')
  , events = require('events');

var chokidar = require('chokidar');

var Item = require('./lib/item.js');

// TODO: adding/removing dirs
// TODO: confirm storing complex data works (no reason to believe it doesn't)
// TODO: confirm providers work as expected
// TODO: provider calls are async, which can lead to ready being called before all providers have returned.  option to prevent this from happening?

function Voyair(opts) {
  events.EventEmitter.call(this);

  opts = opts || {};
  this.options = {
      saveDestination: './watched.json'
    , savePretty: true
    , saveEvery: 360000

    , autoProvide: true
    , defaultProvider: null
    , providerTimeout: 5000
    , providerTimeoutOutcome: 'warn'

    , returnExpired: true
    , defaultRevision: -Infinity
    , logger: null
  };
  for (var k in opts) {
    if (k in this.options) {
      this.options[k] = opts[k];
    }
    else {
      throw new Error('Invalid option "' + k + '"');
    }
  }

  if (!Item.isValidProvider(this.options.defaultProvider)) {
    throw new Error('Invalid defaultProvider. Must be null or a function that takes two arguments fn(item, callback): ' + toString.call(this.options.defaultProvider) + ' provided');
  }

  this._db = {};
  this._watchers = [];

  this.log = this.options.logger || nooplogger;
  this.log.debug('Initializing', this.options);
}

util.inherits(Voyair, events.EventEmitter);

Voyair.prototype._error = function(err) {
  this.trigger('error', err);
};

Voyair.prototype.trigger = function() {
  var _this = this
    , args = arguments;
  process.nextTick(function() {
    _this.emit.apply(_this, args);
  });
};

Voyair.prototype.start = function(pattern, options, callback) {
  var _this = this;
  callback = callback || function(err) { if (err) { _this._error(err); } };

  Object.freeze(_this.options);
  this.log.debug('Starting');

  // TODO: move exist check into load
  fs.exists(_this.options.saveDestination, function(exists) {
    if (exists) {
      _this._load(_this.options.saveDestination, function(err) {
        if (err) {
          return _this._error(err);
        }
        _this._watch(pattern, options, callback);
        return;
      });
    }
    else {
      _this._watch(pattern, options, callback);
      return;
    }
  });

  if (_this.options.saveEvery) {
    // FIXME: turn this into setTimeout
    setInterval(function() {
      _this.save(function(err) {
        if (err) {
          return _this._error(err);
        }
      });
    }, _this.options.saveEvery);
  }

  return _this;
};

Voyair.prototype.shutdownSync = function() {
  this.saveSync();
  this.stopSync();
};

Voyair.prototype.shutdown = function(callback) {
  var _this = this;
  _this.stop(function(err) {
    if (err) {
      return callback(err);
    }
    _this.save(callback);
  });
};

Voyair.prototype.stop = function(callback) {
  this.stopSync();
  process.nextTick(callback);
};

Voyair.prototype.stopSync = function() {
  this._watchers.forEach(function(watcher) {
    watcher.close();
  });
};

Voyair.prototype._load = function(destination, callback) {
  var _this = this;

  _this.log.debug('Loading', destination);

  fs.readFile(destination, function(err, data) {
    if (err) {
      return callback(err);
    }
    _this.import(JSON.parse(data));
    callback(null);
  });
};

// on osx 10.10.2 (at least) stats is unavailable from watcher:add event
Voyair.prototype._lastModFromStats = function(filepath, stats, callback) {
  if (stats && stats.mtime && stats.mtime.getTime) {
    callback(null, stats.mtime.getTime());
  }
  else {
    fs.stat(filepath, function(err, stats) {
      if (err) {
        return callback(err);
      }
      callback(null, stats.mtime.getTime());
    });
  }
};

Voyair.prototype._watch = function(globPattern, globOptions, callback) {
  var _this = this;
  var ready = false;

  _this.log.debug('Watching', globPattern, globOptions);

  var watcher = chokidar.watch(globPattern, globOptions);
  _this._watchers.push(watcher);

  watcher.on('ready', function() {
    _this.log.debug('Watcher ready');
    ready = true;
    callback(null);
    _this.trigger('ready');
  });

  watcher.on('error', function(err) {
    watcher.close();
    callback(err);
  });

  watcher.on('add', function(filepath, stats) {
    _this.trigger('watcher:add', filepath, stats, watcher);
    _this._lastModFromStats(filepath, stats, function(err, lastMod) {
      if (err) {
        return _this._error(err);
      }
      if (ready || !_this.test(filepath, lastMod)) {
        _this.add(filepath, lastMod);
      }
    });
  });

  watcher.on('change', function(filepath, stats) {
    _this.trigger('watcher:change', filepath, stats, watcher);
    _this._lastModFromStats(filepath, stats, function(err, lastMod) {
      if (err) {
        return _this._error(err);
      }
      _this.add(filepath, lastMod);
    });
  });

  watcher.on('unlink', function(filepath) {
    _this.trigger('watcher:delete', filepath, watcher);
    _this.remove(filepath);
  });
};

Voyair.prototype.import = function(db) {
  for (var relativePath in db) {
    var obj = db[relativePath];
    if (obj) {
      var item = this._create(relativePath, obj.revision, obj.data, false);
      if (obj.expired) {
        item.expired = true;
      }
      this.trigger('item:imported', item);
    }
  }
  return this;
};

Voyair.prototype._create = function(relativePath, revision, data, providerFallback) {
  var item = this._db[relativePath] = new Item(relativePath, revision || this.options.defaultRevision, data);
  if (!Item.isValidProvider(data) && this.options.defaultProvider) {
    item.provider = this.options.defaultProvider;
  }
  if (!data && providerFallback && item.provider && this.options.autoProvide) { // if creating and no data is provided
    this._provide(item);
  }
  return item;
};

Voyair.prototype.all = function() {
  return Object.create(this._db);
};

Voyair.prototype._get = function(relativePath) {
  return this._db[relativePath];
};

Voyair.prototype.get = function(relativePath) {
  var item = this._get(relativePath);
  return !item.expired || (item.expired && this.options.returnExpired) ? item : null;
};

Voyair.prototype.add = function(relativePath, revision, data) {
  revision = revision || this.options.defaultRevision;
  if (!this._db[relativePath]) { // doesn't exist
    this.trigger('item:created', this._create(relativePath, revision, data, true));
  }
  else {
    this.update(relativePath, revision, data);
  }
  return this;
};

Voyair.prototype.update = function(relativePath, revision, data) {
  revision = revision || this.options.defaultRevision;
  var status = this.test(relativePath, revision)
    , item = this._get(relativePath);
  if (true === status) {
    this.trigger('item:current', item);
  }
  else if (false === status) {
    var acknowledge = function acknowledgeItemExpired() {
      item.revision = revision;
      item.expired = false;
    };
    item.expired = true;
    this.trigger('item:expired', item, acknowledge);
    if (item.provider && this.options.autoProvide) {
      this._provide(item, acknowledge);
    }
  }
  else {
    throw new Error('Cannot update because "' + relativePath + '" does not exist');
  }
};

Voyair.prototype.remove = function(relativePath) {
  // this.log.debug('remove', relativePath);
  if (this._db[relativePath]) {
    this.trigger('item:removed', this._get(relativePath));
    delete this._db[relativePath];
  }
  return this;
};

Voyair.prototype._provide = function(item, callback) {
  var _this = this;
  callback = callback || function(err){
    if (err) {
      return _this._error(err);
    }
  };
  item.callProvider({
    timeout: _this.options.providerTimeout,
    timeoutOutcome: _this.options.providerTimeoutOutcome
  }, callback);
};

Voyair.prototype.test = function(relativePath, revision) {
  revision = revision || this.options.defaultRevision;
  if (this._db[relativePath]) {
    return revision == this._db[relativePath].revision;
  }
  else {
    return;
  }
};

Voyair.prototype.stringify = function() {
  return this.options.savePretty ? JSON.stringify(this._db, null, 2) : JSON.stringify(this._db);
};

Voyair.prototype.save = function(destination, callback) {
  if (typeof destination === 'function') {
    callback = destination;
    destination = null;
  }
  destination = destination || this.options.saveDestination;
  fs.writeFile(destination, this.stringify(), callback);
};

Voyair.prototype.saveSync = function(destination) {
  destination = destination || this.options.saveDestination;
  this.log.debug('saveSync', destination);
  fs.writeFileSync(destination, this.stringify());
};

Voyair.consoleLogger = {
    info: console.info
  , warn: console.warn
  , error: console.error
  , debug: console.log
  , log: console.log
};

var nooplogger = {
    info: function(){}
  , warn: function(){}
  , error: function(){}
  , debug: function(){}
  , log: function(){}
};

module.exports = Voyair;
