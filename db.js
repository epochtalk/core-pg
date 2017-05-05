var db = {};
module.exports = db;
var pg = require('pg');
var path = require('path');
var Promise = require('bluebird');
var config = require(path.join(__dirname, 'config'));
var errors = require(path.join(__dirname, 'errors'));
Promise.promisifyAll(pg);

db.testConnection = function(q, params) {
  return new Promise(function(resolve, reject) {
    pg.connect(config.conString, function(err, client, done) {
      if (err) { return reject(err); }
      else { return resolve(); }
    });
  });
};

db.sqlQuery = function(q, params) {
  return new Promise(function(resolve, reject) {
    pg.connect(config.conString, function(err, client, done) {
      if (err) { return reject(err); }
      else { return resolve([client, done]); }
    });
  })
  .spread(function(client, done) {
    return client.queryAsync(q, params)
    .then(function(result) { return result.rows; })
    .finally(done);
  })
  .catch(errors.handlePgError);
};

db.scalar = function(q, params) {
  return new Promise(function(resolve, reject) {
    pg.connect(config.conString, function(err, client, done) {
      if (err) { return reject(err); }
      else { return resolve([client, done]); }
    });
  })
  .spread(function(client, done) {
    return client.queryAsync(q, params)
    .then(function(result) {
      var ret = null;
      if (result && result.rows.length > 0) { ret = result.rows[0]; }
      return ret;
    })
    .finally(done);
  })
  .catch(errors.handlePgError);
};

db.createTransaction = function() {
  var close;
  return new Promise(function(resolve, reject) {
    pg.connect(config.conString, function(err, client, done) {
      if (err) { return reject(err); }
      else { return resolve([client, done]); }
    });
  })
  .spread(function(client, done) {
    close = done;
    return client.queryAsync('BEGIN')
    .then(function() { return client; });
  })
  .disposer(function(client, promise) {
    function closeConnection() { if (close) { close(); } }

    if (promise.isFulfilled()) {
      return client.queryAsync('COMMIT').then(closeConnection);
    }
    else {
      return client.queryAsync('ROLLBACK')
      .then(closeConnection)
      .catch(function(err) {
        if (close) { close(client); }
        if (err) { return errors.handlePgError(err); }
      });
    }
  });
};
