// watches this library directory for changes

var Voyeur = require('../voyeur.js');

var voyeur = new Voyeur();// '!**/node_modules/**' ]);

voyeur.start('./**/*', { ignored: '**/node_modules/**' }, function() {
  console.log('Done');
  console.log(voyeur.db);
});

[
  'ready',
  'reload',

  'create',
  'current',
  'expired',
  'remove',

  // 'watcher:add',
  // 'watcher:change',
  // 'watcher:delete',
].forEach(function(evt) {
  voyeur.on(evt, function(relativePath, itemData, acknowledge) {
    console.log('Event (%s): %s', evt, relativePath);
    if (acknowledge) {
      itemData.something = Math.random();
      acknowledge();
    }
  });
});

process.on('SIGINT', function() {
  voyeur.shutdownSync();
  process.exit();
});
