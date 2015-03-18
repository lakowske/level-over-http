/*
 * (C) 2015 Seth Lakowske
 */

var level      = require('level');
var stringify = require('JSONStream').stringify(false);

var db = level(process.argv[2]);

var dbStream = db.createReadStream().pipe(stringify).pipe(process.stdout);
