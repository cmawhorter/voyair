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

Read the "File Processing Example" section at the end of the readme for commented code that illustrates this example a little bit better.

## Getting Started

Windows untested but in theory it should work if chokidar supports it.

`npm install voyair`

```javascript
var Voyair = require('voyair');
var voyair = new Voyair();

// glob (any valid chokidar pattern)
voyair.start('./path/to/watch/**/*.html');

// process file and store result in item.data(key, value)
voyair.on('item:created', function(item) {
  // do work
});

// our data is ready to use
voyair.on('ready', function() {
  var item = voyair.get('path/to/watch/ed/file.html');
  // use values created in item:created above: item.data(key)
});

// by default, writes to ./watched.json
voyair.shutdownSync(); 
```

## Options

```javascript
  // default options.  overwrite with new Voyair(options) 
  // e.g. new Voyair({ saveDestination: './something-else.json' })
  // nonexistent or misspelled options throw
  {
      // this is where the voyeur snapshot/db is read/written
      // this file also includes the item.data meta data
      saveDestination: './watched.json'

      // should snapshot be pretty printed or not
    , savePretty: true

      // Automatically persist snapshot to disk every N milliseconds
      // Falsey to disable
    , saveEvery: 360000

      // voyair.get returns entry even if item.expired = true
    , returnExpired: true

      // If now revision time provided, defaultRevision will be used
      // Can't think of a reason you'd want to change this but it's here anyway
    , defaultRevision: -Infinity

      // Logger to use
      //  - Set to logger: Voyair.consoleLogger to log to console
      //  - Falsey disables log
      //  - Any object matching format.  See Loggers below
    , logger: null

      // PROVIDER OPTIONS
      // See Providers section below for details on providers

      // Automatically call the provider attached to the file's Item
    , autoProvide: true

      // A default provider function to assign to all Items
    , defaultProvider: null

      // How long should provider be given to complete
    , providerTimeout: 5000

      // What should happen if provider times out
      // valid options are: 
      //  - fatal: throws
      //  - warn: console.warn
      //  - ignore: noop
    , providerTimeoutOutcome: 'warn' 
  };
```

### Loggers

A console logger is included with Voyair and the source is below.  You could also pass a bunyan instance as the logger option or any other object that matches the format.

```javascript
Voyair.consoleLogger = {
    info: console.info
  , warn: console.warn
  , error: console.error
  , debug: console.log
  , log: console.log
};
```

### Providers

In addition to events, Voyair provides a mechanism known as "providers" for dealing with processing files.  

A provider is basically a function that gets called every time a file's meta data needs updating.   It's a little bit like a combination of item:created and item:expired in one, but has some extra functionality with timeouts built on top of it.

In most cases, you'll probably be happier with using providers instead of juggling the `item:*` events.  Either works, though with providers there is a bit more to understand.


## Serializing/Unserializing Meta Data

If the meta data you're storing needs some sort of serialization before being converted to json, be sure to add a `toJSON` method to your object.  

To unserialze data from json, an `item:imported` event is called for each item being loaded from disk at which point you can do the unserializing.

## Status / Todo

As far as I know things are pretty complete and working well.  I've been using this with my static site generator [fancy](https://github.com/cmawhorter/fancy) with positive results.

Here's the list of things that could be better:

  - Tests, of course.  There are some minimal tests and a lot of placeholders
  - confirm adding/removing entire directories works (it seems to)
  - confirm providers work as expected (they seem to)
  - Windows testing


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

## License

Copyright (c) 2015 Cory Mawhorter Licensed under the MIT license.
