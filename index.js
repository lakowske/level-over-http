/*
 * (C) 2015 Seth Lakowske
 *
 * store and pipe requests to a level db.
 * serve requests from a level db.
 */

var through        = require('through');
var livestream     = require('level-live-stream');
var JSONStream     = require('JSONStream');

var routes         = require('routes');
var methods        = require('http-methods');

/*
 * Push level encoded requests to the database.
 */
function push(db) {

    var self = this;

    return through(function(levelRequest) {
        db.put(levelRequest.key, levelRequest.value);
        this.queue(levelRequest);
    })

}

/*
 * Live stream json encoded items from a level database.  Users may specify
 * options in the http header corresponding to the level retrieval options (e.g. gt, lt, etc...)
 */
function live(db) {

    var self = this;

    return function(req, res, params, cb) {

        //allow the requestor to set options
        var options = req.headers;
        if (options.tail === 'false') {options.tail = false}

        var dbStream = livestream(db, options);
        res.statusCode = 200;

        dbStream.on('data', function(data) {
            res.write(JSON.stringify(data) + '\n');
        });

        dbStream.on('end', function() { console.log('donsoo') });

    }

}

/*
 * Store json encoded values to the level db. If a key is not given, then
 * generate from the system time.
 */
function store(db) {

    var self = this;

    return function(req, res, params) {
        //We'll use JSONStream to parse json encoded items on the request stream
        var parseify = new JSONStream.parse();

        req.pipe(parseify);

        //When a (key/)value is parsed, put it on the level db
        parseify.on('data', function(dbrequest) {

            var key    = dbrequest.key;

            if (!dbrequest.key) {
                key = new Date().getTime();
            }

            var value  = dbrequest.value;

            db.put(key, value, {}, function(error) {
                if (error) {
                    res.write(JSON.stringify({result:'error', key: key, msg: error}));
                } else {
                    res.write(JSON.stringify({result:'success', key: key}));
                }
                res.end();
            });

        });
    }
}

/*
 * A convenience method used to create and serve a level database over http.  Typically used
 * for one-liner servers and testing.
 */
function serve(route, db) {
    var router = routes();
    router.addRoute(route, methods({GET:live(db), POST:store(db)}))

    return function(req, res) {
        var m = router.match(req.url);
        if (m) m.fn(req, res, m.params, function() {console.log("all done")});
        else res.end('request url invalid.\n');
    }
}

module.exports.store = store;
module.exports.live  = live;
module.exports.push  = push;
module.exports.serve = serve;
