level-over-http
===============
Serves and stores items to a level db over the http protocol.

level-over-http can live stream a level database and accept the same options defined in the LevelDOWN API.

Here is an example of serving a leveldb named 'test.db' over http://localhost:3000/test

```js
var level       = require('level');
var http        = require('http');
var levelHttp   = require('level-over-http');

var db   = level('test.db');
var server = http.createServer(levelHttp.serve('/test', db)).listen(3000);
```

To push something to the leveldb you may POST

```js
    var options = {
        host : 'localhost',
        port : 3000,
        path : '/test',
        method : 'POST'
    }

    var req = http.request(options, function(res) {
    	res.pipe(process.stdout);
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    })

    req.end('{"value":"hello wisconsin"}\n');
```

I got the following response streamed to stdout

```
{"result":"success","key":"0001427765362253.000000000"}
```

To get something from the leveldb you may GET

```js
    var options = {
        host : 'localhost',
        port : 3000,
        path : '/test',
        headers : { gt : 0001427765362253.000000000 }
    }

    var req = http.request(options, onResponse);

    req.end();
```

Notice the headers object can contain the same options defined in the LevelDOWN API.

```
{"key":"0001427765362229.000000000","value":"hello wisconsin"}
```

level-over-http makes use of [lexicographic-timestamp](http://github.com/lakowske/lexicographic-timestamp) for key generation.
