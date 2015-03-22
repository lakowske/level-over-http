/*
 * (C) 2015 Seth Lakowske
 */

var test        = require('tape');
var freeport    = require('freeport');
var http        = require('http');
var level       = require('level');
var path        = require('path');
var rimraf      = require('rimraf');
var JSONStream  = require('JSONStream');
var levelHttp   = require('./');

function put(value, port, onResponse) {
    var options = {
        host : 'localhost',
        port : port,
        path : '/test',
        method : 'POST'
    }

    var req = http.request(options, onResponse);

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    })

    req.end(value);
}

function get(headers, port, onResponse) {
    var options = {
        host : 'localhost',
        port : port,
        path : '/test',
        headers : headers
    }

    var req = http.request(options, onResponse);

    req.end();
}

function setup(dbname, onSetup) {
    var db   = level(dbname);

    freeport(function(er, port) {
        var server = http.createServer(levelHttp.serve('/test', db)).listen(port, function() {
            onSetup(db, server, port);
        });
    })
}

function cleanup(db, server, dbname, onClean) {
    server.close();

    db.close(function(er) {
        if (er) throw er;

        rimraf(path.join(__dirname, dbname), function(er) {
            if (er) throw er;
            onClean();
        })

    });
}

test('can push values through a level database', function(t) {
    var db   = level('./test.db');

    var dbify = levelHttp.push(db);
    var stringify = JSONStream.stringify(false);

    dbify.pipe(stringify).pipe(process.stdout);

    dbify.write({key:'hi', value:"wisconsin"});

    db.close(function(er) {
        if (er) throw er;

        rimraf(path.join(__dirname, 'test.db'), function(er) {
            if (er) throw er;
            t.end();
        })

    })

})
/*
test('put values in a level database over http', function(t) {

    var dbname = './test1.db';

    setup(dbname, function(db, server, port) {

        put('{"value":"hello wisconsin"}', port, function(res) {
            res.pipe(process.stdout);
            res.on('end', function() {
                console.log('done');
                cleanup(db, server, t.end, dbname);
            })

        });

    });

})
*/
test('request value from a level database over http', function(t) {

    var dbname = './test2.db';

    setup(dbname, function(db, server, port) {

        put('{"value":"hello wisconsin"}', port, function(res) {

            get({}, port, function(res) {
                console.log('results:');
                res.pipe(process.stdout);

                cleanup(db, server, dbname, t.end);
            })

        })
    })

})
