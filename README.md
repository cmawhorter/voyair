Voyair
======

Watches and maintains a persistent, accurate cache of post-processing data pulled from a collection of files on disk.  

What that means is that Voyair is for when you have a lot of files that can change often, and you need to perform some sort of computational-heavy work on them to make them usable in your app.

Huh? See Usecase immediately below for an example that should make things clearer on how Voyair can help you.

Uses [chokidar](https://github.com/paulmillr/chokidar) for watching (which was the only fsevent library I could find that actually worked as advertised.)

## A Usecase

Let's say you have a directory filled with html files. 

You want to display a list of contents of the title tags from each file.  

You could parse each file to find the `<title>` every time you want to display the list and do some sort of caching to disk or you could let Voyair manage it all for you.

Read the "File Processing Example" section below for commented code that illustrates this example a little bit better.

## Getting Started



## File Processing Example

Using the example we started above, we have a directory of *.html files that change often and we want to keep an accurate list of what their `<title>` tags are. 

```javascript
// note: this snippet is untested
var fs = require('fs');
var voyair = new Voyair();

// Starts watching the glob pattern (passed directly to chokidar so those options apply)
voyair.start('./**/*.html');

// As new files are discovered and created inside Voyair, item:created events are fired for each

// Once voyair knows about a file, it will not fire item:created again unless the 
// file becomes invalid

// item:created is where you want to do your file processing.  In our case we're
// grabbing the title tag, but it could just as easily be generating a thumbnail 
// from a video or some other CPU-heavy task
voyair.on('item:created', function(item) {
  // item is the target file wrapped in helpers

  // item.path is the relative path (to cwd) of the file
  // pretend item.path = some/path/to.html
  // and we can load the contents like so:
  var html = fs.readFileSync(item.path).toString(); // using sync version here for readability. async would be better

  // item contains helpers including item.data(key[, value]), which is what lets you
  // glue meta data to files without modifying the source file

  // Here we set our local meta data for this file to "<title>" 
  // or null if no title tag exists
  item.data('title', html.match(/<title>/)[0] || null); 

  // now we can do item.data('title') to retrieve our value

  // and we can also do process.exit() and re-run our app and item.data would persist
  // and item:created would not fire again

  // if the file changed while our app was offline, item:created would fire again for the file
  // and we'd process it again as if it were a newly created file
});

// if a file is already known and unmodified, item:current fires instead of item:create
voyair.on('item:current', function(item) {
  // This means item:created alread fired 
  // we can now grab the work we did before
  console.log(item.data('title')); // "<title>"
});

// or alternatively, you could retrieve an entry by relative path once Voyair is ready:
voyair.on('ready', function() {
  // our pretend file from above
  var item = voyair.get('some/path/to.html'); 

  // same as item:current, we have access to the meta data
  console.log(item.data('title')); // <title>
});

// These are all the item:* (file) events:
// 'item:imported', -- When reloading/importing a snapshot, item:imported fires for each entry regardless of state
// 'item:created', -- Fires once for each new/changed/expired file
// 'item:current', -- Fires instead of item:created for known files
// 'item:expired', -- Fires when a file has changed or otherwise become invalid/expired
// 'item:removed', -- File deleted. Fires immediately prior to entry being removed from snapshot

// There are also a few watcher:* events that bubble from chokidar
// See examples/development.js

// When shutting down the Voyair snapshot/database will persist to disk
voyair.shutdownSync(); // by default, writes to ./watched.json

process.exit();
```

## Serializing/Unserializing 

If the data you're storing needs some sort of serialization before being converted to json, be sure to add a `toJSON` method to your objects.  To unserialze data from json, an `item:imported` event is called for each item being loaded from disk.
