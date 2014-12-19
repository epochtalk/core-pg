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
    if (rows.length > 0) {
     return rows[0];
    }
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
  var q = 'INSERT INTO users(email, username, passhash, confirmation_token, created_at, updated_at) VALUES($1, $2, $3, $4, $5, $6) RETURNING id';
  var params = [user.email, user.username, user.passhash, user.confirmation_token, user.created_at, user.updated_at];
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

users.update = function(user) {
  var q = 'SELECT * FROM users WHERE id = $1';
  var params = [user.id];
  var updatedUser;
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      updatedUser = rows[0];
      if (user.username) { updatedUser.username = user.username; }
      if (user.email) { updatedUser.email = user.email; }
      if (user.password) { updatedUser.passhash = bcrypt.hashSync(user.password, 12); }
      // if (user.reset_token) { updatedUser.reset_token = user.reset_token; }
      // if (user.reset_expiration) { updatedUser.reset_expiration = user.reset_expiration; }
      if (user.confirmation_token === undefined) { updatedUser.confirmation_token = null; }
      updatedUser.updated_at = new Date();

      delete updatedUser.password;
      delete updatedUser.confirmation;
      var q = 'UPDATE users SET username = $1, email = $2, passhash = $3, confirmation_token = $4, updated_at = $5 WHERE id = $6';
      var params = [updatedUser.username, updatedUser.email, updatedUser.passhash, updatedUser.confirmation_token, updatedUser.updated_at, updatedUser.id];
      return db.sqlQuery(q, params);
    }
    else { Promise.reject(); }
  })
  .then(function() {
    return updatedUser;
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

users.getUserViews = function(userId) {
  // build userView key
  var q = 'SELECT thread_id, time FROM userviews WHERE user_id = $1';
  var params = [userId];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows; }
    else { return []; }
  })
  .then(function(rows) {
    var userviews = {};
    rows.forEach(function(row) {
      userviews[row.thread_id] = row.time.getTime();
    });
    return userviews;
  });
};

users.putUserViews = function(userId, userViewsArray) {
  return Promise.each(userViewsArray, function(view) {
    userviewExists(userId, view.threadId) // check if userview exists
    .then(function(exists) {
      if (exists) { updateUserview(userId, view.threadId, view.timestamp); }
      else { insertUserview(userId, view.threadId, view.timestamp); }
    });
  });
};

var userviewExists = function(userId, threadId) {
  // build userView key
  var q = 'SELECT * FROM userviews WHERE user_id = $1 AND thread_id = $2';
  var params = [userId, threadId];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return true; }
    else { return false; }
  });
};

var insertUserview = function(userId, threadId, time) {
  var q = 'INSERT INTO userviews (user_id, thread_id, time) VALUES ($1, $2, $3)';
  var params = [userId, threadId, new Date(time)];
  return db.sqlQuery(q, params);
};

var updateUserview = function(userId, threadId, time) {
  var q = 'UPDATE userviews SET time = $1 WHERE user_id = $2 AND thread_id = $3';
  var params = [new Date(time), userId, threadId];
  return db.sqlQuery(q, params);
};
