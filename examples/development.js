// watches this library directory for changes

var Voyeur = require('../voyeur.js');

var voyeur = new Voyeur({ logger: Voyeur.consoleLogger }).start('./**/*', { ignored: '**/node_modules/**' });

[
  'ready',
  'reload',
].forEach(function(evt) {
  console.log('\t-> Added event %s', evt);
  voyeur.on(evt, function() {
    console.log('Event (%s)', evt);
  });
});

[
  'item:created',
  'item:current',
  'item:expired',
  'item:removed',
].forEach(function(evt) {
  console.log('\t-> Added event %s', evt);
  voyeur.on(evt, function(item) {
    console.log('Item Event (%s): %s => %s', evt, item.path, JSON.stringify(item, null, 2));
    if (evt === 'item:expired') {
      var acknowledgeExpiration = arguments[1];
      item.data('some data', Math.random());
      acknowledgeExpiration();
    }
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
