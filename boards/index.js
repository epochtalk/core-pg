var boards = {};
module.exports = boards;

var path = require('path');
var pg = require('pg');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var config = require(path.join(__dirname, '..', 'config'));
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var _ = require('lodash');
var NotFoundError = Promise.OperationalError;

boards.all = function() {
  return db.sqlQuery('SELECT * from boards');
};

boards.create = function(board) {
  var q = 'INSERT INTO boards(category_id, name, description, created_at, parent_board_id, children_ids) VALUES($1, $2, $3, now(), $4, $5) RETURNING id';
  var params = [board.category_id || null, board.name, board.description, board.parent_board_id, board.children_ids];
  var createdBoard = board;
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { createdBoard.id = rows[0].id; }
    else { return Promise.reject(); }
  })
  // set up board metadata
  .then(function() {
    var setup = 'INSERT INTO metadata.boards (board_id) VALUES ($1)';
    params = [createdBoard.id];
    return db.sqlQuery(setup, params);
  })
  .then(function() {
    if (board.parent_board_id) {
      return addChildToBoard(board.id, board.parent_board_id);
    }
  })
  .then(function() { return createdBoard; });
};

var addChildToBoard = function(childId, parentId) {
  var parentBoard;
  var q = 'SELECT * FROM boards WHERE id = $1';
  var params = [parentId];
  return db.sqlQuery(q, params)
  .then(function(dbParentBoard) {
    parentBoard = dbParentBoard[0];
    parentBoard.children_ids = parentBoard.children_ids || [];
    if (!_.contains(parentBoard.children_ids, childId)) {
      parentBoard.children_ids.push(childId);
      var q = 'UPDATE boards SET children_ids = $1 WHERE id = $2';
      var params = [parentBoard.children_ids, parentId];
      return db.sqlQuery(q, params);
    }
    // parent board already has child board id in children_ids
    else { return; }
  })
  .then(function() { return parentBoard; });
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

      if (board.parent_board_id) { updatedBoard.parent_board_id = board.parent_board_id; }
      else if (board.parent_board_id === null || board.category_id === '') { updatedBoard.parent_board_id = null; }

      if (board.children_ids) { updatedBoard.children_ids = board.children_ids; }
      else if (board.children_ids === null) { updatedBoard.children_ids = null; }
      else if (board.children_ids && board.children_ids.length === 0) { updatedBoard.children_ids = null; }

      var q = 'UPDATE boards SET name = $1, description = $2, category_id = $3, parent_board_id = $4, children_ids = $5, updated_at = now() WHERE id = $6';
      var params = [updatedBoard.name, updatedBoard.description, updatedBoard.category_id, updatedBoard.parent_board_id, updatedBoard.children_ids, updatedBoard.id];
      return db.sqlQuery(q, params);
    }
    else { Promise.reject(); }
  })
  .then(function() {
    if (board.parent_board_id) {
      return addChildToBoard(board.id, board.parent_board_id);
    }
  })
  .then(function() { return updatedBoard; });
};

boards.import = function(board) {
  var timestamp = Date.now();
  board.created_at = board.created_at || timestamp;
  board.updated_at = board.updated_at || timestamp;
  var q = 'INSERT INTO boards(id, category_id, name, description, created_at, updated_at, imported_at) VALUES($1, $2, $3, $4, $5, $6, now()) RETURNING id';
  var boardUUID = helper.intToUUID(board.smf.ID_BOARD);
  var catUUID = helper.intToUUID(board.smf.ID_CAT);
  var params = [boardUUID, catUUID, board.name, board.description, board.created_at, board.updated_at];
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
  var columns = 'b.id, b.parent_board_id, b.children_ids, b.category_id, b.name, b.description, b.created_at, b.updated_at, b.imported_at, mb.thread_count';
  var q = 'SELECT ' + columns + ' FROM boards b ' +
    'LEFT JOIN metadata.boards mb ON b.id = mb.board_id WHERE b.id = $1';
  var params = [id];
  return db.sqlQuery(q, params)
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Board not found'); }
  })
  .then(function(board) { // add board moderators
    var q = 'SELECT bm.user_id as id, u.username from board_moderators bm LEFT JOIN users u ON bm.user_id = u.id WHERE bm.board_id = $1';
    var params = [id];
    return db.sqlQuery(q, params)
    .then(function(rows) {
      board.moderators = rows;
      return board;
    });
  });
};

boards.updateCategories = function(categories) {
  var q = 'UPDATE boards SET category_id = $1';
  var params = [null];
  return db.sqlQuery(q, params) // Clear boards of categories
  .then(function() {
    var viewOrder = 1;
    return Promise.each(categories, function (category) {
      if (category.id === -1) { category.id = undefined; }
      // Check if category exists
      var q = 'SELECT * FROM categories WHERE id = $1';
      var params = [category.id];
      return db.sqlQuery(q, params)
      .then(function(rows) {
        var q, params;
        if (rows.length > 0) { // Update view order based on array order
          q = 'UPDATE categories SET name = $1, view_order = $2 WHERE id = $3 RETURNING id';
          params = [category.name, viewOrder++, category.id];
        }
        else { // Category doesn't exist create it
          q = 'INSERT INTO categories(name, view_order) VALUES($1, $2) RETURNING id';
          params = [category.name, viewOrder++];
        }

        return db.sqlQuery(q, params)
        .then(function(rows) { // Update boards for this category
          var categoryId = rows[0].id;
          var q = 'UPDATE boards SET category_id = $1 WHERE id = ANY($2::uuid[])';
          var params = [categoryId, category.board_ids];
          return db.sqlQuery(q, params);
        });
      });
    });
  });
};

boards.allCategories = function() {
  var columns = 'b.id, b.parent_board_id, b.children_ids, b.category_id, b.name, b.description, b.created_at, b.updated_at, b.imported_at, mb.post_count, mb.thread_count, mb.total_post_count, mb.total_thread_count, mb.last_post_username, mb.last_post_created_at, mb.last_thread_id, mb.last_thread_title';

  var q = 'SELECT * FROM categories';
  var categories;
  return db.sqlQuery(q)
  .then(function(dbCategories) { categories = dbCategories; })
  .then(function() {
    return Promise.map(categories, function(category) {
      var q = 'SELECT ' + columns + ' from boards b LEFT JOIN metadata.boards mb ON b.id = mb.board_id WHERE category_id = $1';
      var params = [category.id];
      return db.sqlQuery(q, params)
      .then(function(boards) {
        return Promise.map(boards, function(board) {
          var q = 'SELECT bm.user_id as id, u.username from board_moderators bm LEFT JOIN users u ON bm.user_id = u.id WHERE bm.board_id = $1';
          var params = [board.id];
          return db.sqlQuery(q, params)
          .then(function(rows) {
            board.moderators = rows;
            return board;
          });
        });
      })
      .then(function(boards) { category.boards = boards; });
    });
  })
  .then(function() { return categories; });
};
