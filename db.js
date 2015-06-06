var db = {};
module.exports = db;
var path = require('path');
var pg = require('pg');
var Promise = require('bluebird');
var config = require(path.join(__dirname, 'config'));
Promise.promisifyAll(pg);

db.sqlQuery = function(q, params) {
  return pg.connectAsync(config.cstring)
  .spread(function(client, done) {
    return client.queryAsync(q, params)
    .then(function(result) { return result.rows; })
    .finally(done);
  });
};

db.scalar = function(q, params) {
  return pg.connectAsync(config.cstring)
  .spread(function(client, done) {
    return client.queryAsync(q, params)
    .then(function(result) {
      var ret = null;
      if (result && result.rows.length > 0) { ret = result.rows[0]; }
      return ret;
    })
    .finally(done);
  });
};

db.createTransaction = function() {
  var close;
  return pg.connectAsync(config.cstring)
  .spread(function(client, done) {
    close = done;
    return client.queryAsync('BEGIN')
    .then(function() { return client; });
  })
  .disposer(function(client, promise) {
    function closeConnection() { if (close) { close(client); } }

    if (promise.isFulfilled()) {
      return client.queryAsync('COMMIT').then(closeConnection);
    }
    else {
      return client.queryAsync('ROLLBACK').then(closeConnection);
    }
  });
};
