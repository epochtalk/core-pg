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

  // insert any new categories
  var insertBoards = [], q, params;
  return using(db.createTransaction(), function(client) {
    return Promise.each(categories, function(cat, index) {
      var promise;
      if (cat.id === -1) {
        q = 'INSERT INTO categories(name, view_order) VALUES($1, $2) RETURNING id';
        params = [cat.name, index];
        promise = client.queryAsync(q, params)
        .then(function(results) { cat.id = results.rows[0].id; });
      }
      else {
        q = 'UPDATE categories SET name = $1, view_order = $2 WHERE id = $3';
        promise = client.queryAsync(q, [cat.name, index, cat.id]);
      }
      return promise;
    })
    // parse out all rows
    .then(function() {
      categories.forEach(function(cat) {
        cat.board_ids.forEach(function(board, index) {
          insertBoards.push({ id: board, category_id: cat.id, view_order: index });
        });
      });
    })
    // clear board_mapping table
    .then(function() {
      q = 'DELETE FROM board_mapping WHERE board_id IS NOT NULL';
      return client.queryAsync(q);
    })
    // bulk insert into board_mapping
    .then(function() {
      insertBoards.forEach(function(board) {
        q = 'INSERT INTO board_mapping (board_id, parent_id, category_id, view_order) VALUES ($1, $2, $3, $4)';
        params = [board.id, board.parent_id, board.category_id, board.view_order];
        client.queryAsync(q, params);
      });
    });
  });
};

boards.allCategories = function() {
  // get all categories
  var categories;
  return db.sqlQuery('SELECT * FROM categories')
  .then(function(dbCategories) { categories = dbCategories; })
  // get all board mappings
  .then(function() {
    return db.sqlQuery('SELECT b.id, b.name, b.description, b.created_at, b.updated_at, b.imported_at, mb.post_count, mb.thread_count, mb.last_post_username, mb.last_post_created_at, mb.last_thread_id, mb.last_thread_title, bm.parent_id, bm.category_id, bm.view_order FROM board_mapping bm LEFT JOIN boards b ON bm.board_id = b.id LEFT JOIN metadata.boards mb ON b.id = mb.board_id');
  })
  // stitch boards together
  .then(function(boardMapping) {
    return categories.map(function(category) {
      // get all child boards for this category
      category.boards = _.filter(boardMapping, function(board) {
        return board.category_id === category.id;
      });
      category.boards = _.sortBy(category.boards, 'view_order');

      // recurse through other boards
      category.boards.map(function(board) {
        return boardStitching(boardMapping, board);
      });

      // return category
      return category;
    });
  })
  // sort categories by view_order
  .then(function() {
    categories = _.sortBy(categories, 'view_order');
  })
  .then(function() { return helper.slugify(categories); });
};

function boardStitching(boardMapping, currentBoard) {
  var hasChildren = _.find(boardMapping, function(board) {
    return board.parent_id === currentBoard.id;
  });

  if (hasChildren) {
    currentBoard.children = _.filter(boardMapping, function(board) {
      return board.parent_id === currentBoard.id;
    });
    currentBoard.children = _.sortBy(currentBoard.children, 'view_order');
    currentBoard.children.map(function(board) {
      return boardStitching(boardMapping, board);
    });
    return currentBoard;
  }
  else {
    currentBoard.children = [];
    return currentBoard;
  }
}
