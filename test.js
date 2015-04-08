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

    return req;
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

    return req;
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

test('can level an arbitrary object', function(t) {

    var object = {method: 'GET', url: '/something/fun'};

    var leveled = levelHttp.leveler(object);
    t.ok(leveled.value)

    object.value = 'some string value';
    leveled = levelHttp.leveler(object);
    t.notEqual(leveled.value, 'some string value');

    object.key   = 'to opening the lock';
    leveled = levelHttp.leveler(object);
    t.notEqual(leveled.value, 'to opening the lock');

    var prelevelized = {value:object}
    leveled = levelHttp.leveler(prelevelized);
    t.deepEqual(leveled.value, object, 'were deep equal');

    var prelevelized = {type:'put', value:object}
    leveled = levelHttp.leveler(prelevelized);
    t.deepEqual(leveled.value, object, 'were deep equal');

    var prelevelized = {key:'hi', value:object}
    leveled = levelHttp.leveler(prelevelized);
    t.deepEqual(leveled.value, object, 'were deep equal');

    var prelevelized = {key:'hi', type:'put', value:object}
    leveled = levelHttp.leveler(prelevelized);
    t.deepEqual(leveled.value, object, 'were deep equal');

    t.end();
})

test('can push values through a level database', function(t) {
    var db   = level('./test.db');

    var dbify = levelHttp.push(db);
    var stringify = JSONStream.stringify(false);

    dbify.pipe(stringify).pipe(process.stdout);

    dbify.write({key:'hi', value:"wisconsin"});

    dbify.on('end', function() {

        db.close(function(er) {
            if (er) throw er;

            rimraf(path.join(__dirname, 'test.db'), function(er) {
                if (er) throw er;
                console.log('');
                t.end();
            })

        })

    })

    dbify.end();

})


test('request value from a level database over http', function(t) {

    var dbname = './test2.db';

    setup(dbname, function(db, server, port) {

        put('{"value":"hello wisconsin"}\n', port, function(res) {

            var req = get({}, port, function(res) {
                console.log('result:');
                res.pipe(process.stdout);
                cleanup(db, server, dbname, function() {
                    req.abort()
                    t.end()
                });
            })

        })
    })

})

test('put values in a level database over http', function(t) {

    var dbname = './test1.db';

    setup(dbname, function(db, server, port) {

        var req = put('{"value":"hello wisconsin"}\n', port, function(res) {
            res.pipe(process.stdout);
            console.log('in response');
            res.on('end', function() {
                cleanup(db, server, dbname, function() {
                    console.log('done');
                    req.abort();
                    t.end();
                });
            })

        });

    });

})
