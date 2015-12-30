var categories = {};
module.exports = categories;

var pg = require('pg');
var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var config = require(path.join(__dirname, '..', 'config'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;
var using = Promise.using;

categories.all = function() {
  var q = 'SELECT id, name, view_order, viewable_by, imported_at from categories';
  return db.sqlQuery(q)
  .then(helper.slugify);
};

categories.create = function(category) {
  var q = 'INSERT INTO categories(name, viewable_by) VALUES($1, $2) RETURNING id';
  var params = [category.name, category.viewable_by];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    return {
      id: rows[0].id,
      name: category.name,
      viewable_by: category.viewable_by
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
      id: rows[0].id,
      name: category.name,
      imported_at: rows[0].imported_at
    };
  })
  .then(helper.slugify);
};

categories.find = function(id) {
  id = helper.deslugify(id);
  var q = 'SELECT id, name, view_order, viewable_by, imported_at FROM categories WHERE id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Category Not Found'); }
  })
  .then(helper.slugify);
};

categories.delete = function(catId) {
  catId = helper.deslugify(catId);
  var q, params;

  return using(db.createTransaction(), function(client) {
    q = 'SELECT * FROM categories WHERE id = $1 FOR UPDATE';
    return client.queryAsync(q, [catId])
    .then(function(results) {
      if (results.rows.length > 0) { return results.rows[0]; }
      else { return Promise.reject('Category Not Found'); }
    })
    .then(function() {
      q = 'WITH RECURSIVE find_boards(board_id, parent_id, category_id) AS ( SELECT bm.board_id, bm.parent_id, bm.category_id FROm board_mapping bm WHERE bm.category_id = $1 UNION ALL SELECT bm.board_id, bm.parent_id, bm.category_id FROM find_boards fb, board_mapping bm WHERE bm.parent_id = fb.board_id ) DELETE FROM board_mapping WHERE board_id IN ( SELECT board_id FROM find_boards )';
      return client.queryAsync(q, [catId]);
    })
    .then(function() {
      q = 'DELETE FROM categories WHERE id = $1';
      return client.queryAsync(q, [catId]);
    });
  });
};
