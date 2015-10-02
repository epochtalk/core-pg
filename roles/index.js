var roles = {};
module.exports = roles;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));
var NotFoundError = Promise.OperationalError;
var CreationError = Promise.OperationalError;
var using = Promise.using;

roles.all = function() {
  var q = 'SELECT id, name, description, lookup, priority, highlight_color, permissions FROM roles';
  return db.sqlQuery(q);
};

roles.update = function(role) {
  var permissions = JSON.stringify(role.permissions);
  var q = 'UPDATE roles SET permissions = $1 WHERE id = $2';
  return db.sqlQuery(q, [permissions, role.id]);
};

/* returns user with added role(s) */
roles.add = function(role) {
  var q, params;
  var permissions = JSON.stringify(role.permissions);
  if (role.id) {
    q = 'INSERT INTO roles (id, name, description, lookup, priority, highlight_color, permissions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())';
    params = [role.id, role.name, role.description || '', role.lookup, role.priority, role.highlightColor, permissions];
  }
  else {
    q = 'INSERT INTO roles (name, description, lookup, priority, highlight_color permissions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now(), now())';
    params = [role.name, role.description || '', role.lookup, role.priority, permissions];
  }
  return db.sqlQuery(q, params);
};

/* returns user with removed role(s) */
roles.remove = function(roleId) {
  var q = 'DELETE FROM roles WHERE id = $1';
  return sqlQuery(q, [roleId]);
};
