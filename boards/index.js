var boards = {};
module.exports = boards;

var _ = require('lodash');
var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var NotFoundError = Promise.OperationalError;
var using = Promise.using;

boards.all = function() {
  return db.sqlQuery('SELECT id, name, description, viewable_by, created_at, updated_at, imported_at from boards')
  .then(helper.slugify);
};

boards.create = function(board) {
  board = helper.deslugify(board);
  var q, params;
  return using(db.createTransaction(), function(client){
    // insert new board
    q = 'INSERT INTO boards(name, description, viewable_by, created_at) VALUES($1, $2, $3, now()) RETURNING id';
    params = [board.name, board.description, board.viewable_by];
    return client.queryAsync(q, params)
    .then(function(results) { board.id = results.rows[0].id; })
    // insert new board metadata
    .then(function() {
      q = 'INSERT INTO metadata.boards (board_id) VALUES ($1)';
      return client.queryAsync(q, [board.id]);
    });
  })
  .then(function() { return helper.slugify(board); });
};

boards.update = function(board) {
  board = helper.deslugify(board);
  var q, params;
  return using(db.createTransaction(), function(client) {
    q = 'SELECT * FROM boards WHERE id = $1 FOR UPDATE';
    return client.queryAsync(q, [board.id])
    .then(function(results) {
      if (results.rows.length > 0) { return results.rows[0]; }
      else { throw new NotFoundError('Board Not Found'); }
    })
    .then(function(oldBoard) {
      board.name = board.name || oldBoard.name;
      helper.updateAssign(board, oldBoard, board, "description");
      helper.updateAssign(board, oldBoard, board, "viewable_by");
    })
    .then(function() {
      q = 'UPDATE boards SET name = $1, description = $2, viewable_by = $3, updated_at = now() WHERE id = $4';
      params = [board.name, board.description || '', board.viewable_by, board.id];
      return client.queryAsync(q, params);
    });
  })
  .then(function() { return helper.slugify(board); });
};

boards.breadcrumb = function(boardId) {
  boardId = helper.deslugify(boardId);
  var q = 'SELECT b.id, b.name, bm.parent_id, bm.category_id FROM boards b LEFT JOIN board_mapping bm ON b.id = bm.board_id WHERE b.id = $1';
  return db.sqlQuery(q, [boardId])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { return {}; }
  })
  .then(helper.slugify);
};

boards.find = function(id) {
  id = helper.deslugify(id);

  // get board with given id
  var q = 'SELECT b.id, b.name, b.description, b.viewable_by, b.created_at, b.thread_count, b.post_count, b.updated_at, b.imported_at, (SELECT bm.parent_id FROM board_mapping bm WHERE bm.board_id = b.id) as parent_id, (SELECT json_agg(row_to_json((SELECT x FROM ( SELECT bm.user_id as id, u.username as username) x ))) as moderators from board_moderators bm LEFT JOIN users u ON bm.user_id = u.id WHERE bm.board_id = b.id) as moderators FROM boards b WHERE b.id = $1;';
  return db.sqlQuery(q, [id])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Board Not Found'); }
  })
  // append child boards
  .then(function(board) {
    // get all boards (inefficient) TODO: make effiecient
    return db.sqlQuery('SELECT * FROM ( SELECT b.id, b.name, b.description, b.viewable_by, b.thread_count, b.post_count, b.created_at, b.updated_at, b.imported_at, mb.last_post_username, mb.last_post_created_at, mb.last_thread_id, mb.last_thread_title, mb.last_post_position, bm.parent_id, bm.category_id, bm.view_order FROM board_mapping bm LEFT JOIN boards b ON bm.board_id = b.id LEFT JOIN metadata.boards mb ON b.id = mb.board_id ) blist LEFT JOIN LATERAL ( SELECT p.deleted as post_deleted, u.id as user_id, u.deleted as user_deleted FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE blist.last_thread_id = p.thread_id ORDER BY p.created_at DESC LIMIT 1 ) p ON true LEFT JOIN LATERAL (SELECT json_agg(row_to_json((SELECT x FROM ( SELECT bm.user_id as id, u.username as username) x ))) as moderators from board_moderators bm LEFT JOIN users u ON bm.user_id = u.id WHERE bm.board_id = blist.id) mods on true')
    // append all children board from all boards
    .then(function(boardMapping) {
      // get all children boards for this board
      board.children = _.filter(boardMapping, function(boardMap) {
        return boardMap.parent_id === board.id;
      });

      // sort all children boards by view_order
      board.children = _.sortBy(board.children, 'view_order');

      // handle deleted content for all children boards
      board.children.map(function(b) {
        if (b.post_deleted || b.user_deleted || !b.user_id) {
          b.last_post_username = 'deleted';
        }
        if (!b.user_id) {
          b.last_post_username = undefined;
          b.last_post_created_at = undefined;
          b.last_thread_id = undefined;
          b.last_thread_title = undefined;
          b.last_post_position = undefined;
        }
        return b;
      });

      // recurse through category boards
      board.children.map(function(childBoard) {
        return boardStitching(boardMapping, childBoard);
      });

      return board;
    });
  })
  .then(helper.slugify);
};

boards.updateCategories = function(boardMapping) {
  boardMapping = helper.deslugify(boardMapping);
  var q, params;
  return using(db.createTransaction(), function(client) {
    q = 'DELETE FROM board_mapping WHERE board_id IS NOT NULL';
    return client.queryAsync(q)
    .then(function() {
      return Promise.map(boardMapping, function(mapping) {
        var promise;
        // Category
        if (mapping.type === 'category') {
          q = 'UPDATE categories SET name = $1, viewable_by = $2, view_order = $3 WHERE id = $4';
          params = [mapping.name, mapping.viewable_by || null, mapping.view_order, mapping.id];
          promise = client.queryAsync(q, params);
        }
        // Boards
        else if (mapping.type === 'board' && mapping.parent_id) {
          q = 'INSERT INTO board_mapping (board_id, parent_id, view_order) VALUES ($1, $2, $3)';
          params = [mapping.id, mapping.parent_id, mapping.view_order];
          promise = client.queryAsync(q, params);
        }
        else if (mapping.type === 'board' && mapping.category_id) {
          q = 'INSERT INTO board_mapping (board_id, category_id, view_order) VALUES ($1, $2, $3)';
          params = [mapping.id, mapping.category_id, mapping.view_order];
          promise = client.queryAsync(q, params);
        }
        return promise;
      });
    });
  });
};

boards.allCategories = function(userPriority, opts) {
  // get all categories
  var categories;
  opts = opts || {};
  return db.sqlQuery('SELECT * FROM categories')
  .then(function(dbCategories) { categories = dbCategories; })
  // get all board mappings
  .then(function() {
    return db.sqlQuery('SELECT * FROM ( SELECT b.id, b.name, b.description, b.viewable_by, b.thread_count, b.post_count, b.created_at, b.updated_at, b.imported_at, mb.last_post_username, mb.last_post_created_at, mb.last_thread_id, mb.last_thread_title, mb.last_post_position, bm.parent_id, bm.category_id, bm.view_order FROM board_mapping bm LEFT JOIN boards b ON bm.board_id = b.id LEFT JOIN metadata.boards mb ON b.id = mb.board_id ) blist LEFT JOIN LATERAL ( SELECT p.deleted as post_deleted, u.id as user_id, u.deleted as user_deleted FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE blist.last_thread_id = p.thread_id ORDER BY p.created_at DESC LIMIT 1 ) p ON true LEFT JOIN LATERAL (SELECT json_agg(row_to_json((SELECT x FROM ( SELECT bm.user_id as id, u.username as username) x ))) as moderators from board_moderators bm LEFT JOIN users u ON bm.user_id = u.id WHERE bm.board_id = blist.id) mods on true');
  })
  // handle deleted users
  .then(function(boards) {
    return boards.map(function(board) {
      if (board.post_deleted || board.user_deleted || !board.user_id) {
        board.last_post_username = 'deleted';
      }
      if (!board.user_id) {
        board.last_post_username = undefined;
        board.last_post_created_at = undefined;
        board.last_thread_id = undefined;
        board.last_thread_title = undefined;
        board.last_post_position = undefined;
      }
      return board;
    });
  })
  // stitch boards together
  .then(function(boardMapping) {
    return categories.map(function(category) {
      // get all child boards for this category
      category.boards = _.filter(boardMapping, function(board) {
        return board.category_id === category.id;
      });
      category.boards = _.sortBy(category.boards, 'view_order');

      // Filter out private boards
      if (opts.hidePrivate) {
        // remove boards not matching user priority
        category.boards = _.filter(category.boards, function(board) {
          if (board.viewable_by !== 0 && !board.viewable_by) { return true; }
          return userPriority <= board.viewable_by;
        });
      }

      // recurse through category boards
      category.boards.map(function(board) {
        return boardStitching(boardMapping, board);
      });

      // return category
      return category;
    });
  })
  // sort categories by view_order
  .then(function() { categories = _.sortBy(categories, 'view_order'); })
  // remove categories not matching user priority
  .then(function() {
    if (opts.hidePrivate) {
      categories = _.filter(categories, function(category) {
        if (category.viewable_by !== 0 && !category.viewable_by) { return true; }
        return userPriority <= category.viewable_by;
      });
    }
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
    currentBoard.children.map(function(childBoard) {
      return boardStitching(boardMapping, childBoard);
    });
    return currentBoard;
  }
  else {
    currentBoard.children = [];
    return currentBoard;
  }
}

boards.getBoardInBoardMapping = function(boardId, userPriority) {
  boardId = helper.deslugify(boardId);

  var q = 'WITH RECURSIVE find_parent(board_id, parent_id, category_id) AS ( ';
  q += 'SELECT bm.board_id, bm.parent_id, bm.category_id ';
  q += 'FROM board_mapping bm where board_id = $1 ';
  q += 'UNION ';
  q += 'SELECT bm.board_id, bm.parent_id, bm.category_id ';
  q += 'FROM board_mapping bm, find_parent fp ';
  q += 'WHERE bm.board_id = fp.parent_id ';
  q += ') ';
  q += 'SELECT fp.board_id, fp.parent_id, fp.category_id, b.viewable_by as board_viewable, c.viewable_by as cat_viewable ';
  q += 'FROM find_parent fp ';
  q += 'LEFT JOIN boards b on fp.board_id = b.id ';
  q += 'LEFT JOIN categories c on fp.category_id = c.id';
  return db.sqlQuery(q, [boardId])
  .then(function(rows) {
    if (rows.length < 1) { return false; }

    var boardVisible = false;
    var catVisible = false;
    var board_viewable = rows[0].board_viewable;
    var cat_viewable = rows[rows.length - 1].cat_viewable;

    if (board_viewable !== 0 && !board_viewable) { boardVisible = true; }
    else if (userPriority <= board_viewable) { boardVisible = true; }

    if (cat_viewable !== 0 && !cat_viewable) { catVisible = true; }
    else if (userPriority <= cat_viewable) { catVisible = true; }

    return boardVisible && catVisible;
  });
};

/**
 * This sets off a cascade delete that also sets off the delete triggers
 * for both threads and posts. This should properly update all the metadata
 * across the db. The only side effect is that the metadata.boards row needs
 * to be deleted before the board row. This is because the threads delete has
 * a pre trigger that tries to update the metadata.boards row, but at that
 * point, the board no longer exists causing an exception to be raised on
 * that constraint. The proper fix would be to merge all the metadata tables
 * back into the modal tables.
 */
boards.delete = function(boardId){
  boardId = helper.deslugify(boardId);
  var q;

  return using(db.createTransaction(), function(client) {
    // Remove board data from DB
    q = 'WITH RECURSIVE find_boards(board_id, parent_id, category_id) AS ( SELECT bm.board_id, bm.parent_id, bm.category_id FROM board_mapping bm WHERE bm.board_id = $1 UNION ALL SELECT bm.board_id, bm.parent_id, bm.category_id FROM find_boards fb, board_mapping bm WHERE bm.parent_id = fb.board_id ) DELETE FROM board_mapping WHERE board_id IN ( SELECT board_id FROM find_boards )';
    return client.queryAsync(q, [boardId])
    .then(function() {
      q = 'DELETE FROM metadata.boards WHERE board_id = $1';
      return client.queryAsync(q, [boardId]);
    })
    .then(function() {
      q = 'DELETE FROM boards WHERE id = $1';
      return client.queryAsync(q, [boardId]);
    });
  });
};

boards.watching = function(boardId, userId) {
  boardId = helper.deslugify(boardId);
  userId = helper.deslugify(userId);

  var q = 'SELECT board_id FROM users.watch_boards WHERE board_id = $1 AND user_id = $2';
  return db.sqlQuery(q, [boardId, userId])
  .then(function(rows) {
    if (rows.length > 0) { return true; }
    else { return false; }
  });
};
