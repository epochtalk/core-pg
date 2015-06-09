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
  return db.sqlQuery('SELECT * FROM users')
  .then(helper.slugify);
};

/* returns array of usernames matching searchStr */
users.searchUsernames = function(searchStr, limit) {
  var q = 'Select username from users where username LIKE $1 ORDER BY username LIMIT $2';
  var params = [searchStr + '%', limit || 15];
  return db.sqlQuery(q, params)
  .map(function(user) { return user.username; });
};

/* returns user with added role(s) */
users.addRoles = function(userId, roles) {
  userId = helper.deslugify(userId);
  var userQuery = 'SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1';
  var userParams = [userId];
  var updatedUser;
  return db.sqlQuery(userQuery, userParams)
  .then(function(rows) { // fetch user and ensure user exists
    if (rows.length) {
      updatedUser = rows[0];
      return roles; // return role names to be mapped
    }
    else { return Promise.reject(); } // user doesnt exist
  })
  .map(function(role) { // lookup role id by name then return array of role ids
    var queryRoleId = 'SELECT id FROM roles WHERE name = $1';
    var roleParams = [role];
    var savedRoleId;
    return db.sqlQuery(queryRoleId, roleParams)
    .then(function(rows) { // return role id
      if (rows.length) { return rows[0].id; }
      else { return Promise.reject(); } // role id doesnt exist
    })
    .then(function(roleId) { // check if user already has role
      savedRoleId = roleId;
      var roleCheckQuery = 'SELECT user_id FROM roles_users WHERE user_id = $1 AND role_id = $2';
      var roleCheckParams = [userId, roleId];
      return db.sqlQuery(roleCheckQuery, roleCheckParams);
    })
    .then(function(rows) {
      if (rows.length) { return; } // dont return role id if user already has role
      else { return savedRoleId; } // return array of roles ids that user doesnt already have
    });
  })
  .each(function(roleId) { // insert new row for each roleId returned by previous map function
    var addRoleQuery = 'INSERT INTO roles_users (role_id, user_id) VALUES ($1, $2);';
    var addRoleParams = [roleId, userId];
    return db.sqlQuery(addRoleQuery, addRoleParams);
  })
  .then(function() { // append roles to updated user and return
    var rolesQuery = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
    var rolesParams = [userId];
    return db.sqlQuery(rolesQuery, rolesParams);
  })
  .then(function(rows) {  // Append users roles
    if (rows.length) { updatedUser.roles = rows; }
    else { updatedUser.roles = []; } // user has no roles
    return updatedUser;
  })
  .then(helper.slugify);
};

/* returns user with removed role(s) */
users.removeRoles = function(userId, roles) {
  userId = helper.deslugify(userId);
  var userQuery = 'SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1';
  var userParams = [userId];
  var updatedUser;
  return db.sqlQuery(userQuery, userParams)
  .then(function(rows) { // fetch user and ensure user exists
    if (rows.length) {
      updatedUser = rows[0];
      return roles; // return roles to be mapped by next promise
    }
    else { return Promise.reject(); } // user doesnt exist
  })
  .map(function(role) {
    var queryRoleId = 'SELECT id FROM roles WHERE name = $1';
    var roleParams = [role];
    return db.sqlQuery(queryRoleId, roleParams)
    .then(function(rows) {
      if (rows.length) { return rows[0].id; } // return role id
      else { return Promise.reject(); } // role doesnt exist
    });
  })
  .each(function(roleId) {
    var query = 'DELETE FROM roles_users WHERE user_id = $1 AND role_id = $2';
    var params = [userId, roleId];
    return db.sqlQuery(query, params); // delete
  })
  .then(function() { // append roles to updated user and return
    var rolesQuery = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
    var rolesParams = [userId];
    return db.sqlQuery(rolesQuery, rolesParams);
  })
  .then(function(rows) {  // Append users roles
    if (rows.length) { updatedUser.roles = rows; }
    else { updatedUser.roles = []; } // user has no roles
    return updatedUser;
  })
  .then(helper.slugify);
};

/* returns a limited set of users depending on limit and page */
users.page = function(opts) {
  var joinType;
  if (opts && opts.filter && opts.filter === 'banned') { joinType = 'RIGHT'; }
  else { joinType = 'LEFT' }
  var q = 'SELECT u.id, u.username, u.email, u.created_at, u.updated_at, u.imported_at, b.expiration as ban_expiration FROM users u ' + joinType + ' JOIN (SELECT ub.expiration, ub.user_id FROM users.bans ub WHERE ub.expiration > now()) b ON (u.id = b.user_id) ORDER BY';
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
  return db.sqlQuery(q, params)
  .then(helper.slugify);
};

/* returns a limited set of admins depending on limit and page */
users.pageAdmins = function(opts) {
  var q = 'SELECT u.username, u.email, u.created_at, ru.user_id, array_agg(r.name ORDER BY r.name) as roles from roles_users ru JOIN roles r ON ((r.name = \'Administrator\' OR r.name = \'Super Administrator\') AND r.id = ru.role_id) LEFT JOIN users u ON(ru.user_id = u.id) GROUP BY ru.user_id, u.username, u.email, u.created_at ORDER BY';
  var limit = 10;
  var page = 1;
  var sortField = 'username';
  var order = 'ASC';
  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.sortField) {
    sortField = opts.sortField;
    // Invert order if sorting by roles, so super admin is sorted to the top
    if (sortField === 'roles') { opts.sortDesc = !opts.sortDesc; }
  }
  if (opts && opts.sortDesc) { order = 'DESC'; }
  q = [q, sortField, order, 'LIMIT $1 OFFSET $2'].join(' ');
  var offset = (page * limit) - limit;
  var params = [limit, offset];
  return db.sqlQuery(q, params)
  .then(helper.slugify);
};

/* returns a limited set of moderators depending on limit and page */
users.pageModerators = function(opts) {
  var q = 'SELECT u.username, u.email, u.created_at, ru.user_id, array_agg(r.name ORDER BY r.name) as roles from roles_users ru JOIN roles r ON ((r.name = \'Moderator\' OR r.name = \'Global Moderator\') AND r.id = ru.role_id) LEFT JOIN users u ON(ru.user_id = u.id) GROUP BY ru.user_id, u.username, u.email, u.created_at ORDER BY';
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
  return db.sqlQuery(q, params)
  .then(helper.slugify);
};

/* returns total user count */
users.count = function(opts) {
  var q = 'SELECT COUNT(u.id) FROM users u';
  if (opts && opts.filter && opts.filter === 'banned') {
    q += ' RIGHT JOIN users.bans b ON (u.id = b.user_id)'
  }
  return db.sqlQuery(q)
  .then(function(rows) {
    if (rows.length) { return { count: Number(rows[0].count) }; }
    else { return Promise.reject(); }
  });
};

/* returns total admins count */
users.countAdmins = function() {
  var q = 'SELECT COUNT(user_id) FROM (SELECT DISTINCT ru.user_id FROM roles_users ru JOIN roles r ON ((r.name = \'Administrator\' OR r.name = \'Super Administrator\') AND r.id = ru.role_id)) AS admins';
  return db.sqlQuery(q)
  .then(function(rows) {
    if (rows.length) { return { count: Number(rows[0].count) }; }
    else { return Promise.reject(); }
  });
};

/* returns total mods count */
users.countModerators = function() {
  var q = 'SELECT COUNT(user_id) FROM (SELECT DISTINCT ru.user_id from roles_users ru JOIN roles r ON ((r.name = \'Moderator\' OR r.name = \'Global Moderator\') AND r.id = ru.role_id)) as mods';
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
  })
  .then(helper.slugify);
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
  .then(function() { return helper.slugify(user); });
};

/* returns the created row in users.bans */
users.ban = function(userId, expiration) {
  userId = helper.deslugify(userId);
  var q = 'SELECT id FROM users.bans WHERE user_id = $1';
  var params = [userId];
  expiration = expiration ? expiration : new Date(8640000000000000); // permanent ban
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length) { // user has been previously banned
      q = 'UPDATE users.bans SET expiration = $1, updated_at = now() WHERE user_id = $2 RETURNING id, user_id, expiration, created_at, updated_at';
      params = [expiration, userId];
    }
    else { // user has never been banned
      q = 'INSERT INTO users.bans(user_id, expiration, created_at, updated_at) VALUES($1, $2, now(), now()) RETURNING id, user_id, expiration, created_at, updated_at';
      params = [userId, expiration];
    }
    return db.sqlQuery(q, params);
  })
  .then(function(rows) {
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(helper.slugify);
};

/* returns the created row in users.bans */
users.unban = function(userId) {
  userId = helper.deslugify(userId);
  var q = 'UPDATE users.bans SET expiration = now(), updated_at = now() WHERE user_id = $1 RETURNING id, user_id, expiration, created_at, updated_at';
  var params = [userId];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length) { return rows[0]; }
    else { return Promise.reject(); }
  })
  .then(helper.slugify);
};

/* returns only imported user id */
users.import = function(user) {
  user.created_at = new Date(user.created_at) || Date.now();
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
  })
  .then(helper.slugify);
};

/* returns values including email, confirm token, and roles */
users.create = function(user, isAdmin) {
  var firstUser, passhash;
  if (user.password) { passhash = bcrypt.hashSync(user.password, 12); }
  delete user.password;
  var q = 'INSERT INTO users(email, username, passhash, confirmation_token, created_at, updated_at) VALUES($1, $2, $3, $4, now(), now()) RETURNING id';
  var params = [user.email, user.username, passhash, user.confirmation_token];

  return db.sqlQuery(q, params)
  .then(function(rows) { // get user id
    if (rows.length > 0) { user.id = rows[0].id; }
    else { return Promise.reject(); }
  })
  .then(function() { // add user roles
    var q = 'INSERT INTO roles_users(role_id, user_id) VALUES($1, $2)';
    var defaultRole = 'edcd8f77-ce34-4433-ba85-17f9b17a3b60';
    if (isAdmin) defaultRole = '06860e6f-9ac0-4c2a-8d9c-417343062fb8';
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
  .then(function() { return helper.slugify(user); });
};

/* returns values including email, confirm and reset tokens */
users.update = function(user) {
  user = helper.deslugify(user);
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
  .then(function() { return formatUser(_user); })
  .then(helper.slugify);
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
  id = helper.deslugify(id);
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
  })
  .then(helper.slugify);
};

users.getUserThreadViews = function(userId) {
  userId = helper.deslugify(userId);
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
      userviews[helper.slugify(row.thread_id)] = row.time.getTime();
    });
    return userviews;
  })
  .then(helper.slugify);
};

users.putUserThreadViews = function(userId, userViewsArray) {
  userId = helper.deslugify(userId);
  userViewsArray = helper.deslugify(userViewsArray);
  return Promise.each(userViewsArray, function(view) {
    view.threadId = helper.deslugify(view.threadId);
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
