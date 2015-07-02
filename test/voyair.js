'use strict';

var assert = require('assert');
// TODO: implement ramdisk tests
// var volume = require('./shared/volume.js');
var Voyair = require('../index.js');

describe('Voyair', function() {

  describe('#ctor', function() {

    it('should inherit eventemitter', function() {
      assert.strictEqual(true, new Voyair() instanceof require('events').EventEmitter);
    });

    it('should accept options', function() {
      assert.doesNotThrow(function() {
        assert.strictEqual(false, new Voyair({ savePretty: false }).options.savePretty);
      });
    });

    it('should not accept invalid options', function() {
      assert.throws(function() {
        new Voyair({ notSavePretty: false });
      });
    });

  });

  describe('#_error', function() {

    it('should have a private error helper', function(done) {
      var voyair = new Voyair();
      voyair.on('error', function(err) {
        assert.strictEqual(true, err instanceof Error);
        done();
      });
      voyair._error(new Error());
    });

  });

  describe('#trigger', function() {

    it('should have a helper to trigger events', function(done) {
      var voyair = new Voyair();
      voyair.on('test', function() {
        done();
      });
      voyair.trigger('test');
    });

    it('should fire on nextTick', function(done) {
      var voyair = new Voyair();
      voyair.trigger('test');
      voyair.on('test', function() {
        done();
      });
    });

    it('should pass arguments', function(done) {
      var voyair = new Voyair();
      voyair.trigger('test', 'str', 1, false);
      voyair.on('test', function(s, n, b) {
        assert.strictEqual('str', s);
        assert.strictEqual(1, n);
        assert.strictEqual(false, b);
        done();
      });
    });

  });

  describe('#start', function() {
    it('should call optional callback when ready', function(done) {
      var voyair = new Voyair();
      voyair.start('./*.*', null, function(err) {
        assert.ifError(err);
        done();
      });
    });

    it('should prevent option changes after starting');
    it('should enable auto save when options.saveEvery enabled');
  });

  describe('#shutdownSync', function() {
    it('should shutdown sync');
  });

  describe('#shutdown', function() {
    it('should shutdown async');
  });

  describe('#stop', function() {
    it('should stop async');
  });

  describe('#stopSync', function() {
    it('should stop sync');
  });

  describe('#_load', function() {
    it('should load a snapshot and import it');
    it('should handle missing');
  });

  describe('#_lastModFromStats', function() {
    it('should return last modified');
    it('should handle missing files');
  });

  describe('#_watch', function() {
    it('should add a new watcher');
  });

  describe('#import', function() {
    it('should import a db snapshot into the context');
  });

  describe('#_create', function() {
    it('should create the entry in the context');
  });

  describe('#all', function() {
    it('should return the db context');
    it('should return a copy to prevent direct manipulation');
  });

  describe('#_get', function() {
    it('should return an entry if it exists in context');
  });

  describe('#get', function() {
    it('should return an entry only if options allow');
  });

  describe('#add', function() {
    it('should add an entry to the context');
    it('should fire item:created after adding');
  });

  describe('#update', function() {
    it('should update an entry if it is expired or invalid');
    it('should trigger item:current if no update needed');
    it('should trigger item:expired if entry is expired');
  });

  describe('#remove', function() {
    it('should remove an entry from the context');
    it('should trigger item:removed after');
  });

  describe('#_provide', function() {
    it('should allow a provider to supply the content for the entry');
  });

  describe('#test', function() {
    it('should test for expired entries');
  });

  describe('#stringify', function() {
    it('should return JSON representation of db context');
  });

  describe('#save', function() {
    it('should write stringified snapshot async to disk');
  });

  describe('#saveSync', function() {
    it('should write stringified snapshot sync to disk');
  });

});
