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
  var q = 'INSERT INTO boards(name, description, imported_at) VALUES($1, $2, $3) RETURNING id';
  var params = [board.name, board.description, board.imported_at];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) return rows[0];
  })
  .catch(function(err) {
    console.log(err)
  });
};
