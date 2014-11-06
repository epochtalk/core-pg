module.exports = Core;
var pg = require('pg');

function Core(opts) {
  if (!(this instanceof Core)) return new Core(opts);
  if (!opts) opts = {};
  this.opts = opts;
  this.test = function() {
    pg.connect(opts.cstring, function(err, client, done) {
      if(err) {
        return console.error('error fetching client from pool', err);
      }
      client.query('SELECT $1::int AS number', ['1'], function(err, result) {
        done();
        if(err) {
          return console.error('error running query', err);
        }
        console.log(result.rows[0].number);
      });
    });
  }
};

console.log('epochtalk: core-pg');
c = new Core({cstring: 'postgres://jianshi@localhost/data_service_dev'});
c.test();
