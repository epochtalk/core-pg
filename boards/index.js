var boards = {};
module.exports = boards;

var pg = require('pg');
var _ = require('lodash');
var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var config = require(path.join(__dirname, '..', 'config'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;
var using = Promise.using;

boards.all = function() {
  return db.sqlQuery('SELECT id, name, description, created_at, updated_at, imported_at from boards')
  .then(helper.slugify);
};

boards.import = function(board) {
  var timestamp = Date.now();
  board.created_at = new Date(board.created_at) || timestamp;
  board.updated_at = new Date(board.updated_at) || timestamp;
  board.id = helper.intToUUID(board.smf.ID_BOARD);
  var q, params;
  return using(db.createTransaction(), function(client) {
    // insert import board
    q = 'INSERT INTO boards(id, name, description, created_at, updated_at, imported_at) VALUES($1, $2, $3, $4, $5, now())';
    params = [board.id, board.name, board.description, board.created_at, board.updated_at];
    return client.queryAsync(q, params)
    // insert import board metadata
    .then(function() {
      q = 'INSERT INTO metadata.boards (board_id) VALUES ($1)';
      params = [board.id];
      return client.queryAsync(q, params);
    });
  })
  .then(function() { return helper.slugify(board); });
};

boards.create = function(board) {
  board = helper.deslugify(board);
  var q, params;
  return using(db.createTransaction(), function(client){
    // insert new board
    q = 'INSERT INTO boards(name, description, created_at) VALUES($1, $2, now()) RETURNING id';
    params = [board.name, board.description];
    return client.queryAsync(q, params)
    .then(function(results) { board.id = results.rows[0].id; })
    // insert new board metadata
    .then(function() {
      q = 'INSERT INTO metadata.boards (board_id) VALUES ($1)';
      params = [board.id];
      return client.queryAsync(q, params);
    });
  })
  .then(function() { return helper.slugify(board); });
};

boards.update = function(board) {
  board = helper.deslugify(board);
  var q, params;
  return using(db.createTransaction(), function(client) {
    q = 'SELECT * FROM boards WHERE id = $1 FOR UPDATE';
    params = [board.id];
    return client.queryAsync(q, params)
    .then(function(results) { return results.rows[0]; })
    .then(function(oldBoard) {
      board.name = board.name || oldBoard.name;
      helper.updateAssign(board, oldBoard, board, "description");
    })
    .then(function() {
      q = 'UPDATE boards SET name = $1, description = $2, updated_at = now() WHERE id = $3';
      params = [board.name, board.description || '', board.id];
      return client.queryAsync(q, params);
    });
  })
  .then(function() { return helper.slugify(board); });
};

boards.find = function(id) {
  id = helper.deslugify(id);
  var columns = 'b.id, b.name, b.description, b.created_at, b.updated_at, b.imported_at, mb.thread_count, mb.post_count';
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
  })
  .then(helper.slugify);
};

boards.updateCategories = function(categories) {
  categories = helper.deslugify(categories);
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

// TODO: Candidate for DB optimization
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
  .then(function() { return helper.slugify(categories); });
};
