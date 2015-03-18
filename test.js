/*
 * (C) 2015 Seth Lakowske
 */

var test        = require('tape');
var freeport    = require('freeport');
var http        = require('http');
var level       = require('level');
var path        = require('path');
var rimraf      = require('rimraf');
var levelHttp   = require('./');


test('put values in a level database over http', function(t) {

    var db   = level('./test.db');

    freeport(function(er, port) {

        var server = http.createServer(levelHttp.serve('/test', db)).listen(port);

        var options = {
            host : 'localhost',
            port : port,
            path : '/test',
            method : 'POST'
        }


        var req = http.request(options, function(res) {
            res.pipe(process.stdout);

            res.on('end', function() {

                server.close();
                db.close(function(er) {
                    if (er) throw er;
                    rimraf(path.join(__dirname, 'test.db'), function(er) {
                        if (er) throw er;
                    })
                });


                t.end();

            })
        })

        req.end('{"value":"hello wisconsin"}');
    })

})
