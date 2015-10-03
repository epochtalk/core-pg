var roles = {};
module.exports = roles;

var path = require('path');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));

roles.all = function() {
  var q = 'SELECT id, name, description, lookup, priority, highlight_color, permissions FROM roles';
  return db.sqlQuery(q)
  .then(helper.slugify);
};

roles.update = function(role) {
  var permissions = JSON.stringify(role.permissions);
  var q = 'UPDATE roles SET permissions = $1 WHERE id = $2 RETURNING id';
  return db.sqlQuery(q, [permissions, role.id])
  .then(helper.slugify);
};

/* returns user with added role(s) */
roles.add = function(role) {
  var q, params;
  var permissions = JSON.stringify(role.permissions);
  if (role.id) {
    q = 'INSERT INTO roles (id, name, description, lookup, priority, highlight_color, permissions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now()) RETURNING id';
    params = [role.id, role.name, role.description || '', role.lookup, role.priority, role.highlightColor, permissions];
  }
  else {
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
