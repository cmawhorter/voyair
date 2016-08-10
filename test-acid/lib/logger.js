'use strict';

var bunyan = require('bunyan');
var PrettyStream = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

var logger = bunyan.createLogger({
  name: 'voyair-fuzz-tester',
  // src: true,
  streams: [ { level: 'trace', type: 'raw', stream: prettyStdOut } ],
  serializers: {
    err: bunyan.stdSerializers.err,
    // site: function site(site) {
    //   if (!site) return site;
    //   return site.dataPath;
    // },
    // properties: function properties(properties) {
    //   if (!properties) return properties;
    //   return {
    //     path: properties.relativePath,
    //     id: properties.getProperty('id'),
    //     route: properties.getProperty('route')
    //   };
    // },
    diskItem: function item(item) {
      if (!item) return item;
      return {
        path: item.path,
        revision: item.revision,
        data: item.toJSON().data,
        expired: item.expired
      };
    },
    list: function list(list) {
      if (!list || !Array.isArray(list)) return list;
      return list.length + ' item(s)\n\t' + list.join('\n\t');
    }
  },
});

module.exports = logger;
