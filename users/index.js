var users = {};
module.exports = users;

var path = require('path');
var pg = require('pg');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));
var db = require(path.join(__dirname, '..', 'db'));

users.all = function() {
  return db.sqlQuery('SELECT * FROM users');
};

users.userByEmail = function(email) {
  var q = 'SELECT * FROM users WHERE email = $1';
  var params = [email];
  return db.sqlQuery(q, params).then(function(rows) {
    if (rows.length > 0) return rows[0];
  });
};

users.userByUsername = function(username) {
  var q = 'SELECT * FROM users WHERE username = $1';
  var params = [username];
  return db.sqlQuery(q, params).then(function(rows) {
    if (rows.length > 0) return rows[0];
  });
};

users.import = function(user) {
  var timestamp = new Date();
  user.imported_at = timestamp;
  var q = 'INSERT INTO users(id, email, username, imported_at) VALUES($1, $2, $3, $4) RETURNING id';
  var params = [user.smf.ID_MEMBER, user.email, user.username, user.imported_at];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) return rows[0];
  });
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
  var q = 'INSERT INTO users(email, username, passhash, created_at, updated_at) VALUES($1, $2, $3, $4, $5) RETURNING id';
  var params = [user.email, user.username, user.passhash, user.created_at, user.updated_at];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      user.id = rows[0].id;
      delete user.passhash;
      return user;
    }
    else {
      Promise.reject();
    }
  });
};

users.find = function(id) {
  var q = 'SELECT * FROM users WHERE id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      return rows[0];
    }
  });
};
