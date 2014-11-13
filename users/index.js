var users = {};
module.exports = users;

var path = require('path');
var pg = require('pg');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));
var db = require(path.join(__dirname, '..', 'db'));

users.all = function() {
  return db.sqlQuery('select * from users')
};

users.create = function(user) {
  var timestamp = new Date();
  if (!user.created_at) {
    user.created_at = timestamp;
    user.updated_at = timestamp;
  }
  else if (!user.updated_at) {
    user.updated_at = user.created_at;
  }
  if (user.password) {
    user.passhash = bcrypt.hashSync(user.password, 12);
  }
  delete user.password;
  return new Promise(function(fulfill, reject) {
    pg.connect(config.cstring, function(err, client, done) {
      var q = 'INSERT INTO users(email, username, passhash, created_at, updated_at) VALUES($1, $2, $3, $4, $5) RETURNING id';
      client.query(q, [user.email, user.username, user.passhash, user.created_at, user.updated_at], function(err, result) {
        if(err) reject(err);
        done();
        user.id = result.rows[0].id;
        fulfill(user);
      });
    });
  });
};

users.find = function(id) {
  var user;
  return new Promise(function(fulfill, reject) {
    pg.connect(config.cstring, function(err, client, done) {
      client.query('SELECT * FROM users WHERE id = $1', [id], function(err, result) {
        if(err) reject(err);
        done();
        if (result.rows.length > 0) {
          user = result.rows[0];
        }
        fulfill(user);
      });
    });
  });
};
