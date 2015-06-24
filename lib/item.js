'use strict';

function doubleCallbackError() {
  throw new Error('Provider rallback was called twice');
}

function callbackTimedOut() {
  throw new Error('Callback called after timeout');
}

function callbackTimedOutSoft() {
  console.warn('Callback called after timeout');
}

function callbackTimedOutIgnore() {}

function Item(relativePath, revision, dataOrProvider) {
  var _path, _revision, _data, _provider;
  var _this = this;

  _revision = revision;
  Object.defineProperty(this, 'revision', {
    get: function() {
      return _revision;
    },
    set: function(value) {
      _revision = value;
    }
  });

  _path = relativePath;
  Object.defineProperty(this, 'path', { // read only
    get: function() {
      return _path;
    }
  });

  _data = {};
  _provider = null;

  switch(typeof dataOrProvider) {
    case 'function':
      _provider = dataOrProvider;
    break;
    case 'object':
      _data = dataOrProvider;
    break;
  }

  Object.defineProperty(this, 'data', { // private
    value: function(k, v) {
      switch (arguments.length) {
        // enable this? returning ref will lead to problems as will the flipside.  use toJSON methinks.
        // case 0: // get all (cloned)
        //   return Object.create(_data);
        case 1: // getter
          return _data[k];
        case 2: // setter
          return _data[k] = v;
        default:
          throw new Error('Invalid argument length');
      }
    }
  });

  Object.defineProperty(this, 'provider', {
    get: function() {
      return _provider;
    },
    set: function(value) {
      if (Item.isValidProvider(value)) {
        _provider = value;
      }
      else {
        throw new Error('Provider must be null or a function that takes two arguments fn(item, callback): ' + toString.call(value) + ' provided');
      }
    }
  });
  this.provider = _provider; // validate passed provider

  Object.defineProperty(this, 'toJSON', {
    value: function() {
      return {
          revision: _revision
        , data: _data
        , expired: _this.expired
      };
    }
  });

  this.expired = false;
}

Item.prototype.callProvider = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  var _this = this,
    wrapped = function() {
      if (timeoutProvider) {
        clearTimeout(timeoutProvider);
      }
      wrapped = doubleCallbackError;
      setImmediate(function() {
        callback.apply(_this, arguments);
      });
    },
    timeoutProvider;

  if (options.timeout) {
    timeoutProvider = setTimeout(function() {
      switch (options.timeoutOutcome) {
        default:
        case 'fatal':
          wrapped = callbackTimedOut;
        break;
        case 'warn':
          wrapped = callbackTimedOutSoft;
        break;
        case 'ignore':
          wrapped = callbackTimedOutIgnore;
        break;
      }
    }, options.timeout);
  }

  this.provider(this, wrapped);
};

Item.create = function(obj) {
  return new Item(obj.path, obj.revision, obj.data);
};

Item.isValidProvider = function(value) {
  return value === null || (typeof value === 'function' && value.length === 2);
};

module.exports = Item;
