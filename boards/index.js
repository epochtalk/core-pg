var boards = {};
module.exports = boards;

var path = require('path');
var pg = require('pg');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));
var db = require(path.join(__dirname, '..', 'db'));
var _ = require('lodash');

boards.all = function() {
  return db.sqlQuery('SELECT * from boards');
};


boards.create = function(board) {
  var timestamp = new Date();
  if (!board.created) { board.created_at = timestamp; }
  if (!board.updated_at) { board.updated_at = timestamp; }
  var q = 'INSERT INTO boards(category_id, name, description, created_at, updated_at, parent_id, children_ids) VALUES($1, $2, $3, $4, $5, $6, $7)';
  var params = [board.category_id, board.name, board.description, board.created_at, board.updated_at, board.parent_id, board.children_ids];
  var createdBoard;
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      createdBoard = rows[0];
      return;
    }
    else { Promise.reject(); }
  })
  // set up board metadata
  .then(function() {
    var setup = 'INSERT INTO metadata.boards (board_id) VALUES ($1)';
    params = [createdBoard.id];
    return db.sqlQuery(setup, params);
  })
  .then(function() {
    if (board.parent_id) {
      return addChildToBoard(board.id, board.parent_id);
    }
    else { return; }
  })
  .then(function() {
    return createdBoard;
  });
};

var addChildToBoard = function(childId, parentId) {
  var parentBoard;
  return new Promise(function(fulfill, reject) {
    var q = 'SELECT * FROM boards WHERE id = $1';
    var params = [parentId];
    return db.sqlQuery(q, params)
    .then(function(dbParentBoard) {
      parentBoard = dbParentBoard;
      parentBoard.children_ids = dbParentBoard.children_ids || [];
      if (!_.contains(parentBoard.children_ids, childId)) {
        parentBoard.children_ids.push(childId);
        var q = 'UPDATE boards SET children_ids = $1 WHERE id = $2';
        var params = [parentBoard.children_ids, parentId];
        return db.sqlQuery(q, params);
      }
      // parent board already has child board id in children_ids
      else { return; }
    })
    .then(function() { fulfill(parentBoard); })
    .catch(function(err) { reject(err); });
  });
};

boards.update = function(board) {
  var q = 'SELECT * FROM boards WHERE id = $1';
  var params = [board.id];
  var updatedBoard;
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) {
      updatedBoard = rows[0];
      if (board.name) { updatedBoard.name = board.name; }

      if (board.description) { updatedBoard.description = board.description; }
      else if (board.description === null || board.description === '') { updatedBoard.description = ''; }

      if (board.category_id) { updatedBoard.category_id = board.category_id; }
      else if (board.category_id === null || board.category_id === '') { updatedBoard.category_id = null; }

      if (board.parent_id) { updatedBoard.parent_id = board.parent_id; }
      else if (board.parent_id === null || board.category_id === '') { updatedBoard.parent_id = null; }

      if (board.children_ids) { updatedBoard.children_ids = board.children_ids; }
      else if (board.children_ids === null) { updatedBoard.children_ids = null; }
      else if (board.children_ids && board.children_ids.length === 0) { updatedBoard.children_ids = null; }

      updatedBoard.updated_at = new Date();
      var q = 'UPDATE boards SET name = $1, description = $2, category_id = $3, parent_id = $4, children_ids = $5, updated_at = $6 WHERE id = $7';
      var params = [updatedBoard.name, updatedBoard.description, updatedBoard.category_id, updatedBoard.parent_id, updatedBoard.children_ids, updatedBoard.updated_at, updatedBoard.id];
      return db.sqlQuery(q, params);
    }
    else { Promise.reject(); }
  })
  .then(function() {
    if (board.parent_id) {
      return addChildToBoard(board.id, board.parent_id);
    }
    else { return; }
  })
  .then(function() { return updatedBoard; });
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
