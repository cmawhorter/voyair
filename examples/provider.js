// watches this library directory for changes

var fs = require('fs');

var Voyeur = require('../voyeur.js');

var voyeur = new Voyeur({
  defaultProvider: function(item, callback) {
    console.log('defaultProvider', item.path, item.toJSON());
    fs.stat(item.path, function(err, stats) {
      if (err) {
        return callback(err);
      }
      item.data('stats', stats);
      callback(null);
    });
  },
  logger: Voyeur.consoleLogger
}).start('./**/*', { ignored: '**/node_modules/**' }, function(err) {
  if (err) throw err;
  console.log('Voyeur initialization complete');
});

[
  'item:imported',
  'item:created',
  'item:current',
  'item:expired',
  'item:removed',
].forEach(function(evt) {
  console.log('\t-> Added event %s', evt);
  voyeur.on(evt, function(item) {
    console.log('Item Event (%s): %s => %s', evt, item.path, JSON.stringify(item, null, 2));
  });
});

[
  'watcher:add',
  'watcher:change',
  'watcher:delete',
].forEach(function(evt) {
  console.log('\t-> Added event %s', evt);
  voyeur.on(evt, function(relativePath, stats) {
    console.log('Watcher Event (%s): %s => %j', evt, relativePath, stats && stats.mtime ? stats.mtime : 'unknown last modified time');
  });
});

if (process.argv[2]) {
  process.on('SIGINT', function() {
    voyeur.shutdownSync();
    process.exit();
  });
}
