var roles = {};
module.exports = roles;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));
var using = Promise.using;

roles.all = function() {
  var q = 'SELECT id, name, description, lookup, priority, highlight_color, permissions FROM roles ORDER BY priority';
  return db.sqlQuery(q)
  .then(helper.slugify);
};

roles.find = function(roleId) {
  var q = 'SELECT id, name, description, lookup, priority, highlight_color, permissions FROM roles WHERE id = $1';
  return db.scalar(q, [helper.deslugify(roleId)])
  .then(helper.slugify);
};

roles.update = function(role) {
  role.id = helper.deslugify(role.id);
  role.permissions = JSON.stringify(role.permissions);
  var q = 'UPDATE roles SET name = $1, description = $2, lookup = $3, priority = $4, highlight_color = $5, permissions = $6, updated_at = now() WHERE id = $7 RETURNING id, lookup';
  var params = [role.name, role.description, role.lookup, role.priority, role.highlight_color || role.highlightColor, role.permissions, role.id];
  return db.scalar(q, params)
  .then(helper.slugify);
};

/* returns user with added role(s) */
roles.create = function(role) {
  var q, params;
  var permissions = JSON.stringify(role.permissions);
  if (role.id) { // for hardcoded roles with ids, don't slugify id
    q = 'INSERT INTO roles (id, name, description, lookup, priority, highlight_color, permissions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now()) RETURNING id';
    params = [role.id, role.name, role.description || '', role.lookup, role.priority, role.highlight_color || role.highlightColor, permissions];
    return db.scalar(q, params)
    .then(helper.slugify);
  }
  else { // for custom roles
    q = 'INSERT INTO roles (name, description, lookup, priority, highlight_color, permissions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id';
    params = [role.name, role.description || '', role.name, role.priority, role.highlight_color || role.highlightColor, permissions];
    return using(db.createTransaction(), function(client) {
      return client.query(q, params)
      .then(function(results) {
        // Add Lookup as slugified id, guarantees uniqueness
        var row = results.rows[0];
        var addedRoleId = row.id;
        var slugifiedRow = helper.slugify(row);
        q = 'UPDATE roles SET lookup = $1 WHERE id = $2 RETURNING id';
        params = [slugifiedRow.id, addedRoleId];
        return client.query(q, params)
        .then(function(results) { return results.rows[0]; });
      });
    })
    .then(helper.slugify);
  }
};

/* returns removed role id */
roles.delete = function(roleId) {
  roleId = helper.deslugify(roleId);
  var result = { id: roleId };
  return using(db.createTransaction(), function(client) {
    var q = 'DELETE FROM roles WHERE id = $1 RETURNING name;';
    return client.query(q, [roleId]) //remove role
    .then(function(results) {
      result.name = results.rows[0].name;
      q = 'DELETE FROM roles_users WHERE role_id = $1;';
      return client.query(q, [roleId]); // remove users from role
    })
    .then(function() {
      q = 'SELECT id, priority FROM roles ORDER BY priority';
      return client.query(q); // get all roles with priority
    })
    .then(function(results) { return results.rows; })
    .then(function(roles) {
      var curPriority = 0; // fix priorities after removing a role
      roles.forEach(function(role) { role.priority = curPriority++; });
      q = 'UPDATE roles SET priority = $1 WHERE id = $2';
      return Promise.map(roles, function(role) { // reprioritize all roles
        return client.query(q, [role.priority, role.id]);
      });
    });
  })
  .then(function() { return result; }) // return id of removed role
  .then(helper.slugify);
};

roles.reprioritize = function(orderedRoles) {
  orderedRoles = helper.deslugify(orderedRoles);
  var q, params;
  return using(db.createTransaction(), function(client) {
    q = 'UPDATE roles SET priority = $1 WHERE id = $2';
    return Promise.map(orderedRoles, function(role) {
      params = [role.priority, role.id];
      return client.query(q, params);
    });
  })
  .then(function() { return {}; });
};

roles.users = function(roleId, opts) {
  roleId = helper.deslugify(roleId);
  var q = 'SELECT u.id, u.username, u.email FROM users u LEFT JOIN roles_users ru ON u.id = ru.user_id WHERE ru.role_id = $1';
  opts = opts || {};
  var limit = opts.limit || 25;
  var page = opts.page || 1;
  var offset = (page * limit) - limit;
  var params;
  var userData = {};
  if (opts && opts.searchStr) {
    q = [q, 'AND u.username LIKE $2 ORDER BY username LIMIT $3 OFFSET $4'].join(' ');
    params = [roleId, opts.searchStr + '%', limit, offset];
  }
  else {
    q = [q, 'ORDER BY username LIMIT $2 OFFSET $3'].join(' ');
    params = [roleId, limit, offset];
  }
  return db.sqlQuery(q, params)
  .map(function(user) {
    var q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
    var params = [user.id];
    return db.sqlQuery(q, params)
    .then(function(rows) { user.roles = rows; })
    .then(function() { return user; });
  })
  .then(function(users) {
    userData.users = users;
    return users;
  })
  .then(function() {
    if (opts && opts.searchStr) {
      q = 'SELECT COUNT(u.id) FROM users u LEFT JOIN roles_users ru ON u.id = ru.user_id WHERE ru.role_id = $1 AND u.username LIKE $2';
      params = [roleId, opts.searchStr + '%'];
    }
    else {
      q = 'SELECT COUNT(u.id) FROM users u LEFT JOIN roles_users ru ON u.id = ru.user_id WHERE ru.role_id = $1';
      params = [roleId];
    }
    return db.scalar(q, params);
  })
  .then(function(row) {
    userData.count = Number(row.count);
    return userData;
  })
  .then(helper.slugify);
};

/* returns user with added role(s) */
roles.addRoles = function(usernames, roleId) {
  roleId = helper.deslugify(roleId);
  var q = 'SELECT id, username, email, created_at, updated_at FROM users WHERE username = ANY($1::text[])';
  var params = [ usernames ];
  return using(db.createTransaction(), function(client) {
    return client.query(q, params)
    .then(function(results) { // fetch user and ensure user exists
      var rows = results.rows;
      if (rows.length > 0) { return rows; } // return role names to be mapped
      else { return Promise.reject(); } // users dont exist
    })
    .then(function(users) {
      return Promise.map(users,
        function(user) { // insert userid and roleid into roles_users if it doesnt exist already
          q = 'INSERT INTO roles_users(role_id, user_id) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM roles_users WHERE role_id = $1 AND user_id = $2);';
          params = [roleId, user.id];
          return client.query(q, params)
          .then(function() { // append roles to updated user and return
            q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
            params = [user.id];
            return client.query(q, params);
          })
          .then(function(results) {
            user.roles = results.rows;
            return user;
          });
        }
      );
    }).then(function(allUsers) { return allUsers; });
  })
  .then(helper.slugify);
};

/* returns user with removed role(s) */
roles.removeRoles = function(userId, roleId) {
  userId = helper.deslugify(userId);
  roleId = helper.deslugify(roleId);
  var q = 'SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1';
  var params = [ userId ];
  var updatedUser;
  return using(db.createTransaction(), function(client) {
    return client.query(q, params)
    .then(function(results) { // fetch user and ensure user exists
      var rows = results.rows;
      if (rows.length > 0) { return rows[0]; } // return user
      else { return Promise.reject(); } // user doesnt exist
    })
    .then(function(user) {
      updatedUser = user;
      q = 'DELETE FROM roles_users WHERE role_id = $1 AND user_id = $2';
      params = [roleId, user.id];
      return client.query(q, params);
    })
    .then(function() {
      q = 'SELECT lookup FROM roles WHERE id = $1';
      return client.query(q, [roleId]);
    })
    .then(function(results) {
      var rows = results.rows;
      // Remove ban from users.ban table if the role being removed is the banned role
      if (rows.length && rows[0].lookup === 'banned') {
        q = 'UPDATE users.bans SET expiration = now(), updated_at = now() WHERE user_id = $1';
        return client.query(q, [userId]);
      }
      return;
    })
    .then(function() { // append roles to updated user and return
      q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
      params = [userId];
      return client.query(q, params);
    })
    .then(function(results) {
      updatedUser.roles = results.rows;
      return updatedUser;
    });
  })
  .then(helper.slugify);
};

roles.posterHasRole = function(postId, roleLookup) {
  postId = helper.deslugify(postId);

  var q =
  `SELECT EXISTS (
  SELECT 1
  FROM roles r
  LEFT JOIN roles_users ru ON ru.role_id = r.id
  LEFT JOIN posts p ON ru.user_id = p.user_id
  WHERE p.id = $1
  AND r.lookup = $2);`;
  return db.sqlQuery(q, [postId, roleLookup])
  .then(function(rows) { return rows[0].exists; });
};
