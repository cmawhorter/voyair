'use strict';

var Voyair = require('../../index.js');
var logger = require('./logger.js');

Voyair.consoleLogger = {
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger),
  log: logger.debug.bind(logger),
};

var voyair = new Voyair();

module.exports = voyair;
