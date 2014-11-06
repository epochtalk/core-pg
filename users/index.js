var users = {};
module.exports = users;

var path = require('path');
var pg = require('pg');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));

users.all = function() {
  return new Promise(function(fulfill, reject) {
    pg.connect(config.cstring, function(err, client, done) {
      client.query('SELECT * FROM users', function(err, result) {
        if(err) reject(err);
        done();
        fulfill(result.rows);
      });
    });
  });
}
