var categories = {};
module.exports = categories;

var path = require('path');
var pg = require('pg');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;

categories.all = function() {
  return db.sqlQuery('SELECT * from categories');
};

categories.create = function(category) {
  var insertCategoryQuery = 'INSERT INTO categories(name) VALUES($1) RETURNING id';
  var params = [category.name];
  return db.sqlQuery(insertCategoryQuery, params)
  .then(function(rows) {
    if (rows.length > 0) {
      return rows[0];
    }
  });
};

categories.import = function(category) {
  var catUUID = helper.intToUUID(category.smf.ID_CAT);
  var insertCategoryQuery = 'INSERT INTO categories(id, name, imported_at) VALUES($1, $2, now()) RETURNING id';
  var params = [catUUID, category.name];
  return db.sqlQuery(insertCategoryQuery, params)
  .then(function(rows) {
    if (rows.length > 0) {
      return rows[0];
    }
  });
};

categories.find = function(id) {
  var q = 'SELECT * FROM categories WHERE id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Category not found'); }
  });
};
