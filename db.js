var db = {};
module.exports = db;
var path = require('path');
var pg = require('pg');
var Promise = require('bluebird');
var config = require(path.join(__dirname, 'config'));

db.sqlQuery = function(sqlQuery, sqlParams) {
  return new Promise(function(fulfill, reject) {
    pg.connect(config.cstring, function(err, client, done) {
      client.query(sqlQuery, sqlParams, function(err, result) {
        done();
        if (err) reject(err);
        else fulfill(result.rows);
      });
    });
  });
};
