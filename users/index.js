var users = {};
module.exports = users;

var path = require('path');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));
var NotFoundError = Promise.OperationalError;
var CreationError = Promise.OperationalError;
var using = Promise.using;

/* returns array of usernames matching searchStr */
users.searchUsernames = function(searchStr, limit) {
  var q = 'SELECT username FROM users WHERE username LIKE $1 ORDER BY username LIMIT $2';
  var params = [searchStr + '%', limit || 15];
  return db.sqlQuery(q, params)
  .map(function(user) { return user.username; });
};

/* returns user with added role(s) */
users.addRoles = function(usernames, roleId) {
  roleId = helper.deslugify(roleId);
  var q = 'SELECT id, username, email, created_at, updated_at FROM users WHERE username = ANY($1::text[])';
  var params = [ usernames ];
  return using(db.createTransaction(), function(client) {
    return client.queryAsync(q, params)
    .then(function(results) { // fetch user and ensure user exists
      var rows = results.rows;
      if (rows.length > 0) { return rows; } // return role names to be mapped
      else { return Promise.reject(); } // users dont exist
    })
    .map(function(user) { // insert userid and roleid into roles_users if it doesnt exist already
      q = 'INSERT INTO roles_users(role_id, user_id) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM roles_users WHERE role_id = $1 AND user_id = $2);';
      params = [roleId, user.id];
      return client.queryAsync(q, params)
      .then(function() { // append roles to updated user and return
        q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
        params = [user.id];
        return client.queryAsync(q, params);
      })
      .then(function(results) {
        user.roles = results.rows;
        return user;
      });
    }).then(function(allUsers) { return allUsers; });
  })
  .then(helper.slugify);
};

/* returns user with removed role(s) */
users.removeRoles = function(userId, roleId) {
  userId = helper.deslugify(userId);
  roleId = helper.deslugify(roleId);
  var q = 'SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1';
  var params = [ userId ];
  var updatedUser;
  return using(db.createTransaction(), function(client) {
    return client.queryAsync(q, params)
    .then(function(results) { // fetch user and ensure user exists
      var rows = results.rows;
      if (rows.length > 0) { return rows[0]; } // return user
      else { return Promise.reject(); } // user doesnt exist
    })
    .then(function(user) {
      updatedUser = user;
      q = 'DELETE FROM roles_users WHERE role_id = $1 AND user_id = $2';
      params = [roleId, user.id];
      return client.queryAsync(q, params);
    })
    .then(function() { // append roles to updated user and return
      q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
      params = [userId];
      return client.queryAsync(q, params);
    })
    .then(function(results) {
      updatedUser.roles = results.rows;
      return updatedUser;
    });
  })
  .then(helper.slugify);
};

/* returns a limited set of users depending on limit and page */
users.page = function(opts) {
  var q;
  if (opts && opts.filter && opts.filter === 'banned') {
    q = 'SELECT u.id, u.username, u.email, u.deleted, u.created_at, u.updated_at, u.imported_at, b.expiration as ban_expiration FROM users u RIGHT JOIN (SELECT ub.expiration, ub.user_id FROM users.bans ub WHERE ub.expiration > now()) b ON (u.id = b.user_id)';
  }
  else {
    q = 'SELECT u.id, u.username, u.email, u.deleted, u.created_at, u.updated_at, u.imported_at, (SELECT ub.expiration FROM users.bans ub WHERE ub.user_id = u.id AND ub.expiration > now()) as ban_expiration FROM users u';
  }

  opts = opts || {};
  var limit = opts.limit || 25;
  var page = opts.page || 1;
  var offset = (page * limit) - limit;
  var sortField = opts.sortField || 'username';
  var order = opts.sortDesc ? 'DESC' : 'ASC';
  var params;
  if (opts && opts.searchStr) {
    q = [q, 'WHERE u.username LIKE $1 ORDER BY', sortField, order, 'LIMIT $2 OFFSET $3'].join(' ');
    params = [opts.searchStr + '%', limit, offset];
  }
  else {
    q = [q, 'ORDER BY', sortField, order, 'LIMIT $1 OFFSET $2'].join(' ');
    params = [limit, offset];
  }
  return db.sqlQuery(q, params)
  .then(helper.slugify);
};

/* returns a limited set of moderators depending on limit and page */
users.pageModerators = function(opts) {
  var q = 'SELECT u.username, u.email, u.deleted, u.created_at, ru.user_id, array_agg(r.name ORDER BY r.name) as roles from roles_users ru JOIN roles r ON ((r.lookup = \'moderator\' OR r.lookup = \'globalModerator\') AND r.id = ru.role_id) LEFT JOIN users u ON(ru.user_id = u.id) GROUP BY ru.user_id, u.username, u.email, u.created_at, u.deleted ORDER BY';
  opts = opts || {};
  var limit = opts.limit || 25;
  var page = opts.page || 1;
  var sortField = opts.sortField || 'username';
  var order = opts.sortDesc ? 'DESC' : 'ASC';
  q = [q, sortField, order, 'LIMIT $1 OFFSET $2'].join(' ');
  var offset = (page * limit) - limit;
  var params = [limit, offset];
  return db.sqlQuery(q, params)
  .then(helper.slugify);
};

/* returns total user count */
users.count = function(opts) {
  var q = 'SELECT COUNT(u.id) FROM users u';
  var params;
  if (opts && opts.filter && opts.filter === 'banned') {
    q += ' RIGHT JOIN users.bans b ON (u.id = b.user_id AND b.expiration > now())';
  }
  if (opts && opts.searchStr) {
    q += ' WHERE u.username LIKE $1';
    params = [opts.searchStr + '%'];
  }
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length) { return { count: Number(rows[0].count) }; }
    else { return Promise.reject(); }
  });
};

/* returns total mods count */
users.countModerators = function() {
  var q = 'SELECT COUNT(user_id) FROM (SELECT DISTINCT ru.user_id from roles_users ru JOIN roles r ON ((r.lookup = \'moderator\' OR r.lookup = \'globalModerator\') AND r.id = ru.role_id)) as mods';
  return db.sqlQuery(q)
  .then(function(rows) {
    if (rows.length) { return { count: Number(rows[0].count) }; }
    else { return Promise.reject(); }
  });
};

/* returns all values */
users.userByEmail = function(email) {
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
  // TODO: optimize calls by merge both queries
  var q = 'SELECT u.id, u.username, u.email, u.passhash, u.confirmation_token, u.reset_token, u.reset_expiration, u.deleted, u.created_at, u.updated_at, u.imported_at, p.avatar, p.position, p.signature, p.raw_signature, p.fields, p.post_count FROM users u LEFT JOIN users.profiles p ON u.id = p.user_id WHERE u.username = $1';
  var params = [username];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return formatUser(rows[0]); }
  })
  .then(function(user) {
    if (user) {
      var q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
      var params = [user.id];
      return db.sqlQuery(q, params)
      .then(function(rows) { user.roles = rows; })
      .then(function() { return user; });
    }
  })
  .then(helper.slugify);
};

/* returns the created row in users.bans */
users.ban = function(userId, expiration) {
  userId = helper.deslugify(userId);
  var q = 'SELECT id FROM users.bans WHERE user_id = $1';
  var params = [userId];
  expiration = expiration ? expiration : new Date(8640000000000000); // permanent ban
  return using(db.createTransaction(), function(client) {
    return client.queryAsync(q, params)
    .then(function(results) {
      var rows = results.rows;
      if (rows.length > 0) { // user has been previously banned
        q = 'UPDATE users.bans SET expiration = $1, updated_at = now() WHERE user_id = $2 RETURNING id, user_id, expiration, created_at, updated_at';
        params = [expiration, userId];
      }
      else { // user has never been banned
        q = 'INSERT INTO users.bans(user_id, expiration, created_at, updated_at) VALUES($1, $2, now(), now()) RETURNING id, user_id, expiration, created_at, updated_at';
        params = [userId, expiration];
      }
      return client.queryAsync(q, params);
    })
    .then(function(results) {
      var rows = results.rows;
      if (rows.length > 0) { return rows[0]; }
      else { return Promise.reject(); }
    });
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
  var q, params;
  var timestamp = Date.now();
  user.created_at = new Date(user.created_at) || timestamp;
  user.updated_at = new Date(user.updated_at) || timestamp;
  user.id = helper.intToUUID(user.smf.ID_MEMBER);

  return using(db.createTransaction(), function(client) {
    // insert user row
    q = 'INSERT INTO users(id, email, username, created_at, updated_at, imported_at) VALUES($1, $2, $3, $4, $5, now()) RETURNING id';
    params = [user.id, user.email, user.username, user.created_at, user.updated_at];
    return client.queryAsync(q, params)
    .then(function(results) {
      if (results.rows.length > 0) { return results.rows[0]; }
      else { throw new CreationError('User Cound Not Be Imported'); }
    })
    // insert user profile
    .then(function() {
      var profile = {};
      profile.id = user.id;
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
      return insertUserProfile(profile, client);
    });
  })
  .then(function() { return helper.slugify(user); });
};

/* returns values including email, confirm token, and roles */
users.create = function(user, isAdmin) {
  var q, params, passhash;
  if (user.password) { passhash = bcrypt.hashSync(user.password, 12); }
  delete user.password;

  return using(db.createTransaction(), function(client) {
    // insert user
    q = 'INSERT INTO users(email, username, passhash, confirmation_token, created_at, updated_at) VALUES($1, $2, $3, $4, now(), now()) RETURNING id';
    params = [user.email, user.username, passhash, user.confirmation_token];
    return client.queryAsync(q, params)
    .then(function(results) {
      if (results.rows.length > 0) { user.id = results.rows[0].id; }
      else { throw new CreationError('User Could Not Be Created'); }
    })
    // insert default user role
    .then(function() {
      q = 'INSERT INTO roles_users(role_id, user_id) VALUES($1, $2)';
      if (isAdmin) {
        var superAdminRole = '8ab5ef49-c2ce-4421-9524-bb45f289d42c';
        return client.queryAsync(q, [superAdminRole, user.id]);
      }
    })
    .then(function() { return insertUserProfile(user, client); })
    // Query for users roles
    .then(function() {
      q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
      return client.queryAsync(q, [user.id])
      .then(function(results) { user.roles = results.rows; });
    });
  })
  .then(function() { return helper.slugify(user); });
};

/* returns values including email, confirm and reset tokens */
users.update = function(user) {
  user = helper.deslugify(user);
  var q, params, oldUser;

  return using(db.createTransaction(), function(client) {
    // query original user row
    q = 'SELECT u.id, u.username, u.email, u.passhash, u.confirmation_token, u.reset_token, u.reset_expiration, u.created_at, u.updated_at, u.imported_at, p.avatar, p.position, p.signature, p.raw_signature, p.fields FROM users u LEFT JOIN users.profiles p ON u.id = p.user_id WHERE u.id = $1';
    params = [user.id];
    return client.queryAsync(q, params)
    .then(function(results) {
      if (results.rows.length > 0) { oldUser = results.rows[0]; }
      else { throw new CreationError('User Not Found'); }
    })
    // update user information, and update user row
    .then(function() {
      user.username = user.username || oldUser.username;
      user.email = user.email || oldUser.email;
      helper.updateAssign(user, oldUser, user, 'reset_expiration');
      helper.updateAssign(user, oldUser, user, 'reset_token');
      helper.updateAssign(user, oldUser, user, 'confimation_token');

      var passhash = null;
      if (user.password) { passhash = bcrypt.hashSync(user.password, 12); }
      else { passhash = oldUser.passhash; }
      delete user.password;

      q = 'UPDATE users SET username = $1, email = $2, passhash = $3, reset_token = $4, reset_expiration = $5, confirmation_token = $6, updated_at = now() WHERE id = $7';
      params = [user.username, user.email, passhash, user.reset_token, new Date(user.reset_expiration), user.confirmation_token, user.id];
      return client.queryAsync(q, params);
    })
    // query for user profile row
    .then(function() {
      q = 'SELECT * FROM users.profiles WHERE user_id = $1 FOR UPDATE';
      return client.queryAsync(q, [user.id])
      .then(function(results) {
        var exists = false;
        if (results.rows.length > 0) { exists = true; }
        return exists;
      });
    })
    // update or insert user profile row
    .then(function(exists) {
      var oldFields = oldUser.fields || {};

      // Special Profile Fields
      helper.updateAssign(user, oldUser, user, 'avatar');
      helper.updateAssign(user, oldUser, user, 'position');
      helper.updateAssign(user, oldUser, user, 'signature');
      helper.updateAssign(user, oldUser, user, 'raw_signature');

      // Generic Profile Fields
      user.fields = {};
      helper.updateAssign(user.fields, oldFields, user, 'name');
      helper.updateAssign(user.fields, oldFields, user, 'website');
      helper.updateAssign(user.fields, oldFields, user, 'btcAddress');
      helper.updateAssign(user.fields, oldFields, user, 'gender');
      helper.updateAssign(user.fields, oldFields, user, 'dob');
      helper.updateAssign(user.fields, oldFields, user, 'location');
      helper.updateAssign(user.fields, oldFields, user, 'language');

      if (exists) { return updateUserProfile(user, client); }
      else { return insertUserProfile(user, client); }
    })
    .then(function() { return formatUser(user); });
  })
  .then(helper.slugify);
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

var insertUserProfile = function(user, client) {
  var q = 'INSERT INTO users.profiles (user_id, avatar, position, signature, raw_signature, fields) VALUES ($1, $2, $3, $4, $5, $6)';
  var params = [user.id, user.avatar, user.position, user.signature, user.raw_signature, user.fields];
  return client.queryAsync(q, params);
};

var updateUserProfile = function(user, client) {
  var q = 'UPDATE users.profiles SET user_id = $1, avatar = $2, position = $3, signature = $4, raw_signature = $5, fields = $6 WHERE user_id = $1';
  var params = [user.id, user.avatar, user.position, user.signature, user.raw_signature, user.fields];
  return client.queryAsync(q, params);
};

/* return all values */
users.find = function(id) {
  // TODO: optimize calls by merge both queries
  id = helper.deslugify(id);
  var q = 'SELECT u.id, u.username, u.email, u.passhash, u.confirmation_token, u.reset_token, u.reset_expiration, u.deleted, u.created_at, u.updated_at, u.imported_at, p.avatar, p.position, p.signature, p.raw_signature, p.fields, p.post_count FROM users u LEFT JOIN users.profiles p ON u.id = p.user_id WHERE u.id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('User Not Found'); }
  })
  .then(function(user) {
    var q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
    var params = [user.id];
    return db.sqlQuery(q, params)
    .then(function(rows) { user.roles = rows; })
    .then(function() { return user; });
  })
  .then(helper.slugify);
};

users.putUserThreadViews = function(userId, threadId) {
  userId = helper.deslugify(userId);
  threadId = helper.deslugify(threadId);

  return using(db.createTransaction(), function(client) {
    // query for existing user-thread row for user view
    return userThreadViewExists(userId, threadId, client)
    // update or insert user-thread row
    .then(function(row) {
      if (row) { updateUserThreadview(row, userId, threadId, client); }
      else { insertUserThreadview(userId, threadId, client); }
    });
  });
};

var userThreadViewExists = function(userId, threadId, client) {
  var q = 'SELECT * FROM users.thread_views WHERE user_id = $1 AND thread_id = $2 FOR UPDATE';
  var params = [userId, threadId];
  return client.queryAsync(q, params)
  .then(function(results) {
    if (results.rows.length > 0) { return results.rows[0]; }
    else { return; }
  });
};

var insertUserThreadview = function(userId, threadId, client) {
  var q = 'INSERT INTO users.thread_views (user_id, thread_id, time) VALUES ($1, $2, now())';
  var params = [userId, threadId];
  return client.queryAsync(q, params);
};

var updateUserThreadview = function(row, userId, threadId, client) {
  var q = 'UPDATE users.thread_views SET time = now() WHERE user_id = $1 AND thread_id = $2';
  var params = [userId, threadId];
  return client.queryAsync(q, params);
};

users.deactivate = function(userId) {
  userId = helper.deslugify(userId);
  return using(db.createTransaction(), function(client) {
    var q = 'UPDATE users SET deleted = True WHERE id = $1';
    return client.queryAsync(q, [userId]);
  });
};

users.reactivate = function(userId) {
  userId = helper.deslugify(userId);
  return using(db.createTransaction(), function(client) {
    var q = 'UPDATE users SET deleted = False WHERE id = $1';
    return client.queryAsync(q, [userId]);
  });
};

users.delete = function(userId) {
  userId = helper.deslugify(userId);
  var q;

  return using(db.createTransaction(), function(client) {
    // delete user bans TODO: cascade delete?
    q = 'DELETE FROM users.bans WHERE user_id = $1';
    return client.queryAsync(q, [userId])
    // delete user roles TODO: cascade delete?
    .then(function() {
      q = 'DELETE FROM roles_users WHERE user_id = $1';
      return client.queryAsync(q, [userId]);
    })
    // get threads user has started
    .then(function() {
      q = ' SELECT thread_id FROM ( SELECT DISTINCT(thread_id) AS id FROM posts WHERE user_id = $1 ) t LEFT JOIN LATERAL ( SELECT thread_id FROM (SELECT user_id, thread_id FROM posts WHERE thread_id = t.id ORDER BY created_at LIMIT 1) f WHERE f.user_id = $1 ) pFirst ON true WHERE thread_id IS NOT NULL';
      return client.queryAsync(q, [userId]);
    })
    // parse out thread ids
    .then(function(userThreads) {
      var threads = [];
      userThreads.rows.forEach(function(thread) {
        threads.push(thread.thread_id);
      });
      return threads;
    })
    // delete user's thread
    .then(function(userThreads) {
      q = 'DELETE FROM threads WHERE id = ANY($1::uuid[])';
      return client.queryAsync(q, [userThreads]);
    })
    // delete user
    .then(function() {
      q = 'DELETE FROM users WHERE id = $1';
      return client.queryAsync(q, [userId]);
    });
  });
};
