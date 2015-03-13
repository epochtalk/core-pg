var db = {};
module.exports = db;
var path = require('path');
var pg = require('pg');
var Promise = require('bluebird');
var config = require(path.join(__dirname, 'config'));

db.sqlQuery = function(sqlQuery, sqlParams) {
  return new Promise(function(fulfill, reject) {
    pg.connect(config.cstring, function(err, client, done) {
      if (err) reject(err);
      else {
        client.query(sqlQuery, sqlParams, function(err, result) {
          done();
          if (err) reject(err);
          else fulfill(result.rows);
        });
      }
    });
  });
};

db.scalar = function(q, params) {
  return new Promise(function(fulfill, reject) {
    pg.connect(config.cstring, function(err, client, done) {
      if (err) reject(err);
      else {
        client.query(q, params, function(err, res) {
          done();
          if (err) reject(err);
          if (!res || res.rows.length === 0) {
            fulfill(null);
          }
          else {
            fulfill(res.rows[0]);
          }
        });
      }
    });
  });
};
