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
    if (rows.length > 0) { return rows[0]; }
    else { return undefined; }
  });
};

users.userByUsername = function(username) {
  var q = 'SELECT u.id, u.username, u.email, u.passhash, u.confirmation_token, u.reset_token, u.reset_expiration, u.created_at, u.updated_at, u.imported_at, p.avatar, p.position, p.signature, p.fields FROM users u LEFT JOIN users.profiles p ON u.id = p.user_id WHERE u.username = $1';
  var params = [username];
  var user;
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
     user = formatUser(rows[0]);
     var q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
     var params = [user.id];
     return db.sqlQuery(q, params)
     .then(function(rows) {  // Append users roles
       if (rows.length > 0) {
         user.roles = rows;
         return user;
       }
       else { // User has no roles
         user.roles = [];
         return user;
       }
     });
    }
    else { return undefined; }
  });
};

users.import = function(user) {
  var timestamp = new Date();
  user.imported_at = timestamp;
  var q = 'INSERT INTO users(id, email, username, imported_at, created_at) VALUES($1, $2, $3, $4, $5) RETURNING id';
  var params = [user.smf.ID_MEMBER, user.email, user.username, user.imported_at, user.created_at];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
  })
  .then(function(returnObject) {
    var profile = {};
    profile.id = returnObject.id;
    profile.avatar = user.avatar || null;
    profile.position = user.position || null;
    profile.signature = user.signature || null;
    profile.fields = user.fields || null;
    insertUserProfile(profile);
    return returnObject;
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
      return;
    }
    else { Promise.reject(); }
  })
  .then(function() {
    var q = 'INSERT INTO roles_users(role_id, user_id) VALUES($1, $2)';
    var params = [1, user.id]; // 1 is Hardcoded "User" role
    return db.sqlQuery(q, params);
  })
  .then(function() { // Query for users roles
    var q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
    var params = [user.id];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) {  // Append users roles
    if (rows.length > 0) {
      user.roles = rows;
      return user;
    }
    else { Promise.reject(); }
  });
};

users.update = function(user) {
  var q = 'SELECT u.id, u.username, u.email, u.passhash, u.confirmation_token, u.reset_token, u.reset_expiration, u.created_at, u.updated_at, u.imported_at, p.avatar, p.position, p.signature, p.fields FROM users u LEFT JOIN users.profiles p ON u.id = p.user_id WHERE u.id = $1';
  var params = [user.id];
  var updatedUser;
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      updatedUser = rows[0];
      if (user.username)          { updatedUser.username = user.username; }
      if (user.email)             { updatedUser.email = user.email; }
      if (user.password)          { updatedUser.passhash = bcrypt.hashSync(user.password, 12); }
      if (user.reset_token)       { updatedUser.reset_token = user.reset_token; }
      if (user.reset_expiration)  { updatedUser.reset_expiration = user.reset_expiration; }

      if (user.confirmation_token === undefined) { updatedUser.confirmation_token = null; }
      updatedUser.updated_at = new Date();

      delete updatedUser.password;
      delete updatedUser.confirmation;
      var q = 'UPDATE users SET username = $1, email = $2, passhash = $3, reset_token = $4, reset_expiration = $5, confirmation_token = $6, updated_at = $7 WHERE id = $8';
      var params = [updatedUser.username, updatedUser.email, updatedUser.passhash, updatedUser.reset_token, new Date(updatedUser.reset_expiration), updatedUser.confirmation_token, updatedUser.updated_at, updatedUser.id];
      return db.sqlQuery(q, params)
      .then(function() { return userProfileExists(updatedUser.id); })
      .then(function(exists) { // Update or Insert profile fields

        // Special Profile Fields
        if (user.avatar)                  { updatedUser.avatar = user.avatar; }
        else if (user.avatar === '')      { updatedUser.avatar = null; }
        if (user.position)                { updatedUser.position = user.position; }
        else if (user.position === '')    { updatedUser.position = null; }
        if (user.signature)               { updatedUser.signature = user.signature; }
        else if (user.signature === '')   { updatedUser.signature = null; }

        // Generic Profile Fields
        if (!updatedUser.fields)          { updatedUser.fields = {}; }
        if (user.name)                    { updatedUser.fields.name = user.name; }
        else if (user.name === '')        { updatedUser.fields.name = null; }
        if (user.website)                 { updatedUser.fields.website = user.website; }
        else if (user.website === '')     { updatedUser.fields.website = null; }
        if (user.btcAddress)              { updatedUser.fields.btcAddress = user.btcAddress; }
        else if (user.btcAddress === '')  { updatedUser.fields.btcAddress = null; }
        if (user.gender)                  { updatedUser.fields.gender = user.gender; }
        else if (user.gender === '')      { updatedUser.fields.gender = null; }
        if (user.dob)                     { updatedUser.fields.dob = user.dob; }
        else if (user.dob === '')         { updatedUser.fields.dob = null; }
        if (user.location)                { updatedUser.fields.location = user.location; }
        else if (user.location === '')    { updatedUser.fields.location = null; }
        if (user.language)                { updatedUser.fields.language = user.language; }
        else if (user.language === '')    { updatedUser.fields.language = null; }

        if (exists) { return updateUserProfile(updatedUser); }
        else { return insertUserProfile(updatedUser); }
      });
    }
    else { Promise.reject(); }
  })
  .then(function() { return formatUser(updatedUser); });
};

var formatUser = function(user) {
  Object.keys(user).forEach(function(key) {
    var value = user[key];
    if (!value) { delete user[key];}
  });
  if (user.fields) {
   Object.keys(user.fields).forEach(function(fieldKey) {
    var value = user.fields[fieldKey];
    if (value) { user[fieldKey] = value; }
   });
  }
  delete user.fields;
  return user;
};

var userProfileExists = function(userId) {
  var q = 'SELECT * FROM users.profiles WHERE user_id = $1';
  var params = [userId];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return true; }
    else { return false; }
  });
};

var insertUserProfile = function(user) {
  var q = 'INSERT INTO users.profiles (user_id, avatar, position, signature, fields) VALUES ($1, $2, $3, $4, $5)';
  var params = [user.id, user.avatar, user.position, user.signature, user.fields];
  return db.sqlQuery(q, params);
};

var updateUserProfile = function(user) {
  var q = 'UPDATE users.profiles SET user_id = $1, avatar = $2, position = $3, signature = $4, fields = $5 WHERE user_id = $1';
  var params = [user.id, user.avatar, user.position, user.signature, user.fields];
  return db.sqlQuery(q, params);
};

users.find = function(id) {
  var q = 'SELECT * FROM users WHERE id = $1';
  var params = [id];
  var user;
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      user = rows[0];
      var q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
      var params = [user.id];
      return db.sqlQuery(q, params)
      .then(function(rows) {  // Append users roles
        if (rows.length > 0) {
          user.roles = rows;
          return user;
        }
        else { // User has no roles
          user.roles = [];
          return user;
        }
      });
    }
    else { return undefined; }
  });
};

users.getUserThreadViews = function(userId) {
  // build userView key
  var q = 'SELECT thread_id, time FROM users.thread_views WHERE user_id = $1';
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

users.putUserThreadViews = function(userId, userViewsArray) {
  return Promise.each(userViewsArray, function(view) {
    userThreadViewExists(userId, view.threadId) // check if userview exists
    .then(function(exists) {
      if (exists) { updateUserThreadview(userId, view.threadId, view.timestamp); }
      else { insertUserThreadview(userId, view.threadId, view.timestamp); }
    });
  });
};

var userThreadViewExists = function(userId, threadId) {
  // build userView key
  var q = 'SELECT * FROM users.thread_views WHERE user_id = $1 AND thread_id = $2';
  var params = [userId, threadId];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return true; }
    else { return false; }
  });
};

var insertUserThreadview = function(userId, threadId, time) {
  var q = 'INSERT INTO users.thread_views (user_id, thread_id, time) VALUES ($1, $2, $3)';
  var params = [userId, threadId, new Date(time)];
  return db.sqlQuery(q, params);
};

var updateUserThreadview = function(userId, threadId, time) {
  var q = 'UPDATE users.thread_views SET time = $1 WHERE user_id = $2 AND thread_id = $3';
  var params = [new Date(time), userId, threadId];
  return db.sqlQuery(q, params);
};
