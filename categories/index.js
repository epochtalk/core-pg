var categories = {};
module.exports = categories;

var pg = require('pg');
var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var config = require(path.join(__dirname, '..', 'config'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;

categories.all = function() {
  var q = 'SELECT id, name, view_order, imported_at from categories';
  return db.sqlQuery(q)
  .then(helper.slugify);
};

categories.create = function(category) {
  var q = 'INSERT INTO categories(name) VALUES($1) RETURNING id';
  var params = [category.name];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    return {
      id: row[0].id,
      name: category.name
    };
  })
  .then(helper.slugify);
};

categories.import = function(category) {
  var catUUID = helper.intToUUID(category.smf.ID_CAT);
  var q = 'INSERT INTO categories(id, name, imported_at) VALUES($1, $2, now()) RETURNING id, imported_at';
  var params = [catUUID, category.name];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    return {
      id: row[0].id,
      name: category.name,
      imported_at: row[0].imported_at
    };
  })
  .then(helper.slugify);
};

categories.find = function(id) {
  id = helper.deslugify(id);
  var q = 'SELECT id, name, view_order, imported_at FROM categories WHERE id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Category not found'); }
  })
  .then(helper.slugify);
};
