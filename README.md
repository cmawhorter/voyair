voyeur
======

__Currently a work in progress.__

File watching and disk cache designed to persist complex file processing across application runs.

## Example

```javascript
// note: this snippet is untested
var fs = require('fs');
var voyeur = new Voyeur();
voyeur.start('./**/*.html');
voyeur.on('item:created', function(item) {
  // assume item.path = some/path/to.html
  var html = fs.readFileSync(item.path).toString()
    , m = html.match(/<title>/);
  if (m) {
    item.data('title', m[0]);
    console.log(item.data('title')); // <title>
  }
});

// ...

voyeur.shutdownSync(); // by default, writes to ./watched.json
process.exit();

// ... Start back up ...

voyeur.on('ready', function() {
  var item = voyeur.get('some/path/to.html'); // our file from above
  console.log(item.data('title')); // <title>
});

```

## Serializing/Unserializing 

If the data you're storing needs some sort of serialization before being converted to json, be sure to add a `toJSON` method to your objects.  To unserialze data from json, an `item:imported` event is called for each item being loaded from disk.
