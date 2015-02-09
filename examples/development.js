// watches this library directory for changes

var Cuckold = require('../cuckold.js');

var cuckold = new Cuckold([ '../**/*', '!**/node_modules/**' ]);

console.log('Starting...');
cuckold.start();
