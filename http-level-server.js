/*
 * (C) 2015 Seth Lakowske
 */

var levelHttp  = require('./');
var level      = require('level');
var http       = require('http');

var db     = level(process.argv[2]);
var port   = parseInt(process.argv[3], 10);

http.createServer(levelHttp.serve('/level', db)).listen(port);
