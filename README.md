level-over-http
===============
Serves and stores items to a level db over the http protocol.

level-over-http can live stream a level database and accept the same options defined in the LevelDOWN API.

```js
var level       = require('level');
var http        = require('http');
var levelHttp   = require('level-over-http');

var db   = level('test.db');
var server = http.createServer(levelHttp.serve('/test', db)).listen(3000);
```



