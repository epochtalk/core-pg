var boards = {};
module.exports = boards;

var path = require('path');
var pg = require('pg');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));
var db = require(path.join(__dirname, '..', 'db'));

boards.all = function() {
  return db.sqlQuery('SELECT * from boards');
};

boards.import = function(board) {
  var timestamp = new Date();
  board.imported_at = timestamp;
  var q = 'INSERT INTO boards(name, description, imported_at, smf_id_board) VALUES($1, $2, $3, $4) RETURNING id';
  var params = [board.name, board.description, board.imported_at, board.smf.ID_BOARD];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) return rows[0];
  });
};

boards.find = function(id) {
  var q = 'SELECT * FROM boards WHERE id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      return rows[0];
    }
  });
};

boards.allCategories = function() {
  var q = 'SELECT * FROM categories';
  return db.sqlQuery(q)
  .then(function(categories) {
    var categoryBoardQueries = [];
    categories.forEach(function(category) {
      var q = 'SELECT * from boards WHERE category_id = $1';
      var params = [category.id];
      var categoryBoardQuery = db.sqlQuery(q, params)
      .then(function(boards) {
        category.boards = boards;
      });
      categoryBoardQueries.push(categoryBoardQuery);
    })
    return Promise.all(categoryBoardQueries)
    .then(function() {
      return categories;
    });
  });
}
