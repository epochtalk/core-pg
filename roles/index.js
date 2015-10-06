var roles = {};
module.exports = roles;

var path = require('path');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));
var Promise = require('bluebird');
var using = Promise.using;

roles.all = function() {
  var q = 'SELECT id, name, description, lookup, priority, highlight_color, permissions FROM roles ORDER BY priority';
  return db.sqlQuery(q)
  .then(helper.slugify);
};

roles.update = function(role) {
  role.id = helper.deslugify(role.id);
  role.permissions = JSON.stringify(role.permissions);
  var q = 'UPDATE roles SET name = $1, description = $2, lookup = $3, priority = $4, highlight_color = $5, permissions = $6, updated_at = now() WHERE id = $7 RETURNING id';
  var params = [role.name, role.description, role.lookup, role.priority, role.highlightColor, role.permissions, role.id];
  return db.scalar(q, params)
  .then(helper.slugify);
};

/* returns user with added role(s) */
roles.add = function(role) {
  var q, params;
  var permissions = JSON.stringify(role.permissions);
  if (role.id) { // for hardcoded roles with ids, don't slugify id
    q = 'INSERT INTO roles (id, name, description, lookup, priority, highlight_color, permissions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now()) RETURNING id';
    params = [role.id, role.name, role.description || '', role.lookup, role.priority, role.highlightColor, permissions];
  }
  else { // for custom roles
    q = 'INSERT INTO roles (name, description, lookup, priority, highlight_color, permissions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id';
    params = [role.name, role.description || '', role.lookup, role.priority, role.highlightColor, permissions];
  }
  return db.scalar(q, params)
  .then(helper.slugify);
};

/* returns user with removed role(s) */
roles.remove = function(roleId) {
  roleId = helper.deslugify(roleId);
  var q = 'DELETE FROM roles WHERE id = $1 RETURNING id';
  return db.scalar(q, [roleId])
  .then(helper.slugify);
};

roles.reprioritize = function(orderedRoles) {
  orderedRoles = helper.deslugify(orderedRoles);
  var q, params;
  return using(db.createTransaction(), function(client) {
    q = 'UPDATE roles SET priority = $1 WHERE id = $2';
    return Promise.map(orderedRoles, function(role) {
      params = [role.priority, role.id];
      return client.queryAsync(q, params);
    });
  })
  .then(function() { return {}; });
};
