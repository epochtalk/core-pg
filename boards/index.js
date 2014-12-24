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


// TODO: ADD SUPPORT FOR CHILD BOARDS WHEN BOARDS.UPDATE IS ADDED
boards.create = function(board) {
  var timestamp = new Date();
  if (!board.created) { board.created_at = timestamp; }
  if (!board.updated_at) { board.updated_at = timestamp; }
  var q = 'INSERT INTO boards(category_id, name, description, created_at, updated_at) VALUES($1, $2, $3, $4, $5) RETURNING id';
  var params = [board.category_id, board.name, board.description, board.created_at, board.updated_at];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { Promise.reject(); }
  })
  // set up board metadata
  .then(function(createdBoard) {
    var setup = 'INSERT INTO metadata.boards (board_id) VALUES ($1)';
    params = [createdBoard.id];
    db.sqlQuery(setup, params);
    return createdBoard;
  });
};

boards.import = function(board) {
  var timestamp = new Date();
  board.imported_at = timestamp;
  var q = 'INSERT INTO boards(id, category_id, name, description, imported_at) VALUES($1, $2, $3, $4, $5) RETURNING id';
  var params = [board.smf.ID_BOARD, board.smf.ID_CAT, board.name, board.description, board.imported_at];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { Promise.reject(); }
  })
  // set up board metadata
  .then(function(importBoard) {
    var setup = 'INSERT INTO metadata.boards (board_id) VALUES ($1)';
    params = [importBoard.id];
    db.sqlQuery(setup, params);
    return importBoard;
  });
};

boards.find = function(id) {
  var q = 'SELECT * FROM boards WHERE id = $1';
  var params = [id];
  var board;
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) return rows[0];
    else Promise.resolve();
  })
  .then(function(dbBoard) {
    board = dbBoard;
    var q = 'SELECT count(id) FROM threads WHERE board_id = $1';
    var params = [dbBoard.id];
    return db.sqlQuery(q, params);
  })
  .then(function(rows) {
    if (rows.length > 0) {
      var threadCount = Number(rows[0].count);
      board.thread_count = threadCount;
    }
    return board;
  });
};

boards.allCategories = function() {
  var q = 'SELECT * FROM categories';
  var categories;
  return db.sqlQuery(q)
  .then(function(dbCategories) { categories = dbCategories; })
  .then(function() {
    return Promise.map(categories, function(category) {
      var q = 'SELECT * from boards WHERE category_id = $1';
      var params = [category.id];
      return db.sqlQuery(q, params)
      .then(function(boards) {
        return Promise.map(boards, function(board) {
          var b = 'SELECT * from metadata.boards WHERE board_id = $1';
          var bParams = [board.id];
          return db.sqlQuery(b, bParams)
          .then(function(rows) {
            if (rows.length > 0){
              var boardMeta = rows[0];
              board.post_count = boardMeta.post_count;
              board.thread_count = boardMeta.thread_count;
              board.total_post_count = boardMeta.total_post_count;
              board.total_thread_count = boardMeta.total_thread_count;
              board.last_post_username = boardMeta.last_post_username;
              board.last_thread_id = boardMeta.last_thread_id;
              board.last_post_created_at = boardMeta.last_post_created_at;
              board.last_thread_title = boardMeta.last_thread_title;
            }
            return board;
          });
        });
      })
      .then(function(boards) { category.boards = boards; });
    });
  })
  .then(function() { return categories; });
};
