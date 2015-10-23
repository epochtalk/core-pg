var moderators = {};
module.exports = moderators;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));

// addModerator
moderators.add = function(userId, boardId) {
  userId = helper.deslugify(userId);
  boardId = helper.deslugify(boardId);
  var q = 'INSERT INTO board_moderators (user_id, board_id) VALUES ($1, $2)';
  return db.sqlQuery(q, [userId, boardId]);
};

// removeModerator
moderators.remove = function(userId, boardId) {
  userId = helper.deslugify(userId);
  boardId = helper.deslugify(boardId);
  var q = 'DELETE FROM board_moderators WHERE user_id = $1 AND board_id = $2';
  return db.sqlQuery(q, [userId, boardId]);
};

moderators.getUsersBoards = function(userId) {
  userId = helper.deslugify(userId);
  var q = 'SELECT board_id FROM board_moderators WHERE user_id = $1';
  return db.sqlQuery(q, [userId]).then(helper.slugify);
};

moderators.isModerator = function(userId, boardId) {
  userId = helper.deslugify(userId);
  boardId = helper.deslugify(boardId);
  var q = 'SELECT user_id FROM board_moderators WHERE user_id = $1 AND board_id = $2';
  return db.sqlQuery(q, [userId, boardId])
  .then(function(rows) {
    if (rows.length > 0) { return true; }
    else { return false; }
  });
};

moderators.isModeratorWithThreadId = function(userId, threadId) {
  userId = helper.deslugify(userId);
  threadId = helper.deslugify(threadId);

  var q = 'SELECT bm.user_id FROM board_moderators bm LEFT JOIN boards b ON bm.board_id = b.id LEFT JOIN threads t ON b.id = t.board_id WHERE bm.user_id = $1 AND t.id = $2';
  return db.sqlQuery(q, [userId, threadId])
  .then(function(rows) {
    if (rows.length > 0) { return true; }
    else { return false; }
  });
};

moderators.isModeratorWithPostId = function(userId, postId) {
  userId = helper.deslugify(userId);
  postId = helper.deslugify(postId);

  var q = 'SELECT bm.user_id FROM board_moderators bm LEFT JOIN boards b ON bm.board_id = b.id LEFT JOIN threads t ON b.id = t.board_id LEFT JOIN posts p ON p.thread_id = t.id WHERE bm.user_id = $1 AND p.id = $2';
  return db.sqlQuery(q, [userId, postId])
  .then(function(rows) {
    if (rows.length > 0) { return true; }
    else { return false; }
  });
};