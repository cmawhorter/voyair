// watches this library directory for changes

var Voyair = require('../index.js');

var voyair = new Voyair({ logger: Voyair.consoleLogger }).start('./**/*', { ignored: '**/node_modules/**' }, function(err) {
  if (err) throw err;
  console.log('Voyair initialization complete');
});

[
  'item:imported',
  'item:created',
  'item:current',
  'item:expired',
  'item:removed',
].forEach(function(evt) {
  console.log('\t-> Added event %s', evt);
  voyair.on(evt, function(item) {
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
  voyair.on(evt, function(relativePath, stats) {
    console.log('Watcher Event (%s): %s => %j', evt, relativePath, stats && stats.mtime ? stats.mtime : 'unknown last modified time');
  });
});

if (process.argv[2]) {
  process.on('SIGINT', function() {
    voyair.shutdownSync();
    process.exit();
  });
}
