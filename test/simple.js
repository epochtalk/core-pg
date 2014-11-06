var path = require('path');
var pg = require('pg');
var core = require(path.join('..'));
var config = require(path.join(__dirname, '..', 'config'));
c = core();
console.log(config);
pg.connect(config.cstring, function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  client.query('SELECT $1::int AS number', ['1'], function(err, result) {
    //call `done()` to release the client back to the pool
    done();

    if(err) {
      return console.error('error running query', err);
    }
    console.log(result.rows[0].number);
    //output: 1
    client.end();
  });
});
