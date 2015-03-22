/*
 * (C) 2015 Seth Lakowske
 *
 * store and pipe requests to a level db.
 * serve requests from a level db.
 */

var through2         = require('through2');
var livestream       = require('level-live-stream');
var JSONStream       = require('JSONStream');
var timestamper      = require('lexicographic-timestamp').timestampStream(16, 9, 'key');

var routes         = require('routes');
var methods        = require('http-methods');

/*
 * input items to the database and output a status.
 */
function push(db) {

    return through2.obj(function(levelRequest, enc, cb) {

        var self = this;

        db.put(levelRequest.key, levelRequest.value, {sync:true}, function(error) {
            if (error) {
                console.log('encountered an error while putting ' + JSON.stringify(levelRequest) + ' on the database: '
                            + error);
                self.push({result:'error', key: levelRequest.key, msg: error});
            } else {
                self.push({result:'success', key: levelRequest.key});
            }
            cb();
        });

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
        var stringify = JSONStream.stringify(false);

        res.statusCode = 200;

        dbStream.pipe(stringify).pipe(res);

        dbStream.on('end', function() { console.log('donsoo') });

    }

}

/*
 * Store json encoded values to the level db. If a key is not given, then
 * generate from the system time.
 */
function store(db) {

    return function(req, res, params) {
        //We'll use JSONStream to parse json encoded items on the request stream
        var parseify  = new JSONStream.parse();
        var stringify = JSONStream.stringify(false);
        var dbify     = push(db);

        var strungout = req.pipe(parseify).pipe(timestamper).pipe(dbify).pipe(stringify);//.pipe(res);
        strungout.pipe(res);
        req.on('end', function() {
            console.log('no more puts. no more data');

        })
        res.on('finish', function() {
            console.log('all finished');
            res.end('');
            //res.end('');
        })

        //strungout.pipe(res);
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
