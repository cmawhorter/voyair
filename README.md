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
    , m = html.match(/&lt;title&gt;/);
  if (m) {
    item.data('title', m[0]);
    console.log(item.data('title')); // &lt;title&gt;
  }
});

// ...

voyeur.shutdownSync(); // by default, writes to ./watched.json
process.exit();

// ... Start back up ...

voyeur.on('ready', function() {
  var item = voyeur.get('some/path/to.html'); // our file from above
  console.log(item.data('title')); // &lt;title&gt;
});

```
