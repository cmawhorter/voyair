'use strict';

var fs = require('fs');

var volume = process.env.VOYEUR_TESTING_VOLUME || '/Volumes/VoyeurTestingDisk'

if (!fs.existsSync(volume)) {
  console.error('Testing volume "%s" does not exist.  Set env var VOYEUR_TESTING_VOLUME to override.', volume);
  process.exit(1);
}

var emptyCheck = fs.readdirSync(volume).filter(function(f) { return f[0] !== '.'; });
if (emptyCheck.length > 0) {
  console.error('Testing volume "%s" is not empty and cannot be used.', volume);
  process.exit(1);
}

