var plugins = {};
module.exports = plugins;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var DeletionError = Promise.OperationalError;
var CreationError = Promise.OperationalError;
var using = Promise.using;

plugins.all = function() {
  var q = 'SELECT * FROM plugins';
  return db.sqlQuery(q)
  .then(helper.slugify);
};

plugins.exists = function(pluginName) {
  var q = 'SELECT EXISTS( SELECT 1 FROM plugins WHERE name = $1 )';
  return db.sqlQuery(q, [pluginName])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0].exists; }
    else { return false; }
  });
};

plugins.add = function(pluginName) {
  var q = 'INSERT INTO plugins (name) VALUES ($1)';
  return db.sqlQuery(q, [pluginName]);
};

plugins.remove = function(pluginId) {
  var q = 'DELETE FROM plugins WHERE id = $1';
  return db.sqlQuery(q, [pluginId]);
};

plugins.migrateUp = function(migration) {
  return db.sqlQuery(migration);
};

plugins.migrateDown = function(migration) {
  return db.sqlQuery(migration);
};
