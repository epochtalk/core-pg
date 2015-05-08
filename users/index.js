var users = {};
module.exports = users;

var path = require('path');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));
var NotFoundError = Promise.OperationalError;

/* returns all values */
users.all = function() {
  // TODO: scrub passhash
  return db.sqlQuery('SELECT * FROM users');
};

users.page = function(opts) {
  var q = 'SELECT u.id, u.username, u.email, u.created_at, u.updated_at, u.imported_at, p.avatar, p.position, p.signature, p.raw_signature, p.fields, p.post_count FROM users u LEFT JOIN users.profiles p ON u.id = p.user_id ORDER BY';
  var limit = 10;
  var page = 1;
  var sortField = 'username';
  var order = 'ASC';
  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.sortField) { sortField = opts.sortField; }
  if (opts && opts.sortDesc) { order = 'DESC'; }
  q = [q, sortField, order, 'LIMIT $1 OFFSET $2'].join(' ');
  var offset = (page * limit) - limit;
  var params = [limit, offset];
  return db.sqlQuery(q, params);
};

users.pageAdmins = function(opts) {
  var filter;
  if (opts && opts.filter === 'admin') { filter = 'r.name = \'Administrator\''; }
  else if (opts && opts.filter === 'super') { filter = 'r.name = \'Super Administrator\''; }
  else { filter = '(r.name = \'Administrator\' OR r.name = \'Super Administrator\')'; }
  var q = 'SELECT u.username, u.email, u.created_at, u.id, r.name as role from roles_users ru JOIN roles r ON (' + filter + ' AND r.id = ru.role_id) LEFT JOIN users u ON (ru.user_id = u.id) GROUP BY u.id, u.username, u.email, u.created_at, r.name ORDER BY';
  var limit = 10;
  var page = 1;
  var sortField = 'username';
  var order = 'ASC';
  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.sortField) {
    sortField = opts.sortField;
    // Invert order if sorting by role, so super admin is sorted to the top
    if (sortField === 'role') { opts.sortDesc = !opts.sortDesc; }
  }
  if (opts && opts.sortDesc) { order = 'DESC'; }

  q = [q, sortField, order, 'LIMIT $1 OFFSET $2'].join(' ');
  var offset = (page * limit) - limit;
  var params = [limit, offset];
  return db.sqlQuery(q, params);
};

users.pageModerators = function(opts) {
  var filter;
  if (opts && opts.filter === 'moderator') { filter = 'r.name = \'Moderator\''; }
  else if (opts && opts.filter === 'global') { filter = 'r.name = \'Global Moderator\''; }
  else { filter = '(r.name = \'Global Moderator\' OR r.name = \'Moderator\')'; }
  var q = 'SELECT u.username, u.email, u.created_at, u.id, r.name as role from roles_users ru JOIN roles r ON (' + filter + ' AND r.id = ru.role_id) LEFT JOIN users u ON (ru.user_id = u.id) GROUP BY u.id, u.username, u.email, u.created_at, r.name ORDER BY';
  var limit = 10;
  var page = 1;
  var sortField = 'username';
  var order = 'ASC';
  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.sortField) { sortField = opts.sortField; }
  if (opts && opts.sortDesc) { order = 'DESC'; }
  q = [q, sortField, order, 'LIMIT $1 OFFSET $2'].join(' ');
  var offset = (page * limit) - limit;
  var params = [limit, offset];
  return db.sqlQuery(q, params);
};

users.count = function() {
  var q = 'SELECT COUNT(*) FROM users';
  return db.sqlQuery(q)
  .then(function(rows) {
    if (rows.length) { return { count: Number(rows[0].count) }; }
    else { return Promise.reject(); }
  });
};

users.countAdmins = function(opts) {
  var filter;
  if (opts && opts.filter === 'admin') { filter = 'r.name = \'Administrator\''; }
  else if (opts && opts.filter === 'super') { filter = 'r.name = \'Super Administrator\''; }
  else { filter = '(r.name = \'Administrator\' OR r.name = \'Super Administrator\')'; }

  var q = 'SELECT COUNT(ru.user_id) as count from roles_users ru JOIN roles r ON (' + filter + ' AND r.id = ru.role_id)';
  return db.sqlQuery(q)
  .then(function(rows) {
    if (rows.length) { return { count: Number(rows[0].count) }; }
    else { return Promise.reject(); }
  });
};

users.countModerators = function(opts) {
  var filter;
  if (opts && opts.filter === 'moderator') { filter = 'r.name = \'Moderator\''; }
  else if (opts && opts.filter === 'global') { filter = 'r.name = \'Global Moderator\''; }
  else { filter = '(r.name = \'Global Moderator\' OR r.name = \'Moderator\')'; }

  var q = 'SELECT COUNT(ru.user_id) as count from roles_users ru JOIN roles r ON (' + filter + ' AND r.id = ru.role_id)';
  return db.sqlQuery(q)
  .then(function(rows) {
    if (rows.length) { return { count: Number(rows[0].count) }; }
    else { return Promise.reject(); }
  });
};

/* returns all values */
users.userByEmail = function(email) {
  // TODO: scrub passhash
  var q = 'SELECT * FROM users WHERE email = $1';
  var params = [email];
  return db.sqlQuery(q, params).then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { return undefined; }
  });
};

/* returns all values */
users.userByUsername = function(username) {
  var user;
  // TODO: optimize calls using promise.join
  var q = 'SELECT u.id, u.username, u.email, u.passhash, u.confirmation_token, u.reset_token, u.reset_expiration, u.created_at, u.updated_at, u.imported_at, p.avatar, p.position, p.signature, p.raw_signature, p.fields, p.post_count FROM users u LEFT JOIN users.profiles p ON u.id = p.user_id WHERE u.username = $1';
  var params = [username];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { user = formatUser(rows[0]); }
  })
  .then(function() {
    if (user) {
      var q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
      var params = [user.id];
      return db.sqlQuery(q, params)
      .then(function(rows) {  // Append users roles
        if (rows.length > 0) { user.roles = rows; }
        else { user.roles = []; } // user has no roles
      });
    }
  })
  .then(function() { return user; });
};

/* returns only imported user id */
users.import = function(user) {
  var q = 'INSERT INTO users(id, email, username, created_at, imported_at) VALUES($1, $2, $3, $4, now()) RETURNING id';
  var userUUID = helper.intToUUID(user.smf.ID_MEMBER);
  var params = [userUUID, user.email, user.username, user.created_at];
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
    profile.raw_signature = user.raw_signature || null;
    profile.fields = {};
    profile.fields.name = user.name || null;
    profile.fields.website = user.website || null;
    profile.fields.btcAddress = user.btcAddress || null;
    profile.fields.gender = user.gender || null;
    profile.fields.dob = user.dob || null;
    profile.fields.language = user.lanugage || null;
    profile.fields.location = user.location || null;
    insertUserProfile(profile);
    return returnObject;
  });
};

/* returns values including email, confirm token, and roles */
users.create = function(user) {
  var firstUser, passhash;
  if (user.password) { passhash = bcrypt.hashSync(user.password, 12); }
  delete user.password;

  var q = 'SELECT COUNT(id) FROM users';
  return db.sqlQuery(q)
  .then(function(rows) { // count number of total users
    var count = Number(rows[0].count);
    firstUser = (count === 0);
  })
  .then(function() { // insert user
    var q = 'INSERT INTO users(email, username, passhash, confirmation_token, created_at, updated_at) VALUES($1, $2, $3, $4, now(), now()) RETURNING id';
    var params = [user.email, user.username, passhash, user.confirmation_token];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) { // get user id
    if (rows.length > 0) { user.id = rows[0].id; }
    else { return Promise.reject(); }
  })
  .then(function() { // add user roles
    var q = 'INSERT INTO roles_users(role_id, user_id) VALUES($1, $2)';
    // user role - edcd8f77-ce34-4433-ba85-17f9b17a3b60
    var defaultRole = 'edcd8f77-ce34-4433-ba85-17f9b17a3b60';
    // admin role = 06860e6f-9ac0-4c2a-8d9c-417343062fb8
    if (firstUser) defaultRole = '06860e6f-9ac0-4c2a-8d9c-417343062fb8';
    var params = [defaultRole, user.id];
    return db.sqlQuery(q, params);
  })
  .then(function() { // Query for users roles
    var q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
    var params = [user.id];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) {  // Append users roles
    if (rows.length > 0) { user.roles = rows; }
    else { return Promise.reject(); }
  })
  .then(function() { return user; });
};

/* returns values including email, confirm and reset tokens */
users.update = function(user) {
  var oldUser, oldFields, _user = {}, _fields = {};
  var q = 'SELECT u.id, u.username, u.email, u.passhash, u.confirmation_token, u.reset_token, u.reset_expiration, u.created_at, u.updated_at, u.imported_at, p.avatar, p.position, p.signature, p.raw_signature, p.fields FROM users u LEFT JOIN users.profiles p ON u.id = p.user_id WHERE u.id = $1';
  var params = [user.id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { oldUser = rows[0]; }
    else { return Promise.reject(); }
  })
  .then(function() {
    _user.id = oldUser.id;
    _user.username = user.username || oldUser.username;
    _user.email = user.email || oldUser.email;
    updateAssign(_user, oldUser, user, 'reset_expiration');
    updateAssign(_user, oldUser, user, 'reset_token');
    updateAssign(_user, oldUser, user, 'confimation_token');

    var passhash = null;
    if (user.password) { passhash = bcrypt.hashSync(user.password, 12); }
    else { passhash = oldUser.passhash; }

    var q = 'UPDATE users SET username = $1, email = $2, passhash = $3, reset_token = $4, reset_expiration = $5, confirmation_token = $6, updated_at = now() WHERE id = $7';
    var params = [_user.username, _user.email, passhash, _user.reset_token, new Date(_user.reset_expiration), _user.confirmation_token, _user.id];
    return db.sqlQuery(q, params);
  })
  .then(function() { return userProfileExists(user.id); })
  .then(function(exists) { // Update or Insert profile fields
    oldFields = oldUser.fields || {};

    // Special Profile Fields
    updateAssign(_user, oldUser, user, 'avatar');
    updateAssign(_user, oldUser, user, 'position');
    updateAssign(_user, oldUser, user, 'signature');
    updateAssign(_user, oldUser, user, 'raw_signature');

    // Generic Profile Fields
    updateAssign(_fields, oldFields, user, 'name');
    updateAssign(_fields, oldFields, user, 'website');
    updateAssign(_fields, oldFields, user, 'btcAddress');
    updateAssign(_fields, oldFields, user, 'gender');
    updateAssign(_fields, oldFields, user, 'dob');
    updateAssign(_fields, oldFields, user, 'location');
    updateAssign(_fields, oldFields, user, 'language');

    _user.fields = _fields;
    if (exists) { return updateUserProfile(_user); }
    else { return insertUserProfile(_user); }
  })
  .then(function() { return formatUser(_user); });
};

/**
 * This function will check the source copy for merging. If the
 * source copy is undefined, it'll default to the original copy. If the
 * source copy is an empty string, it'll set the dest property to null.
 * All other source values will be copied over to the dest object.
 *
 * dest - destination object after merging
 * orginal - old user copy
 * source - new user data
 * key - the object property to transfer over
 */
var updateAssign = function(dest, original, source, key) {
  var value = source[key];
  if (source[key] === '') { value = null; }
  else if (source[key] === undefined) { value = original[key]; }
  dest[key] = value;
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
  var q = 'INSERT INTO users.profiles (user_id, avatar, position, signature, raw_signature, fields) VALUES ($1, $2, $3, $4, $5, $6)';
  var params = [user.id, user.avatar, user.position, user.signature, user.raw_signature, user.fields];
  return db.sqlQuery(q, params);
};

var updateUserProfile = function(user) {
  var q = 'UPDATE users.profiles SET user_id = $1, avatar = $2, position = $3, signature = $4, raw_signature = $5, fields = $6 WHERE user_id = $1';
  var params = [user.id, user.avatar, user.position, user.signature, user.raw_signature, user.fields];
  return db.sqlQuery(q, params);
};

/* return all values */
users.find = function(id) {
  // TODO: fix indentation
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
    else { throw new NotFoundError('User not found'); }
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
