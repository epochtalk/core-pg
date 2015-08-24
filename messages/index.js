var messages = {};
module.exports = messages;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var DeletionError = Promise.OperationalError;
var CreationError = Promise.OperationalError;
var NotFoundError = Promise.OperationalError;
var using = Promise.using;

messages.create = function(message) {
  message = helper.deslugify(message);
  var q = 'INSERT INTO private_messages(conversation_id, sender_id, receiver_id, copied_ids, body, created_at) VALUES ($1, $2, $3, $4, $5, now()) RETURNING id, created_at';
  var params = [message.conversation_id, message.sender_id, message.receiver_id, message.copied_ids || [], message.body];
  return using(db.createTransaction(), function(client) {
    return client.queryAsync(q, params)
    .then(function(results) {
      if (results.rows.length > 0) {
        message.id = results.rows[0].id;
        message.created_at = results.rows[0].created_at;
        message.viewed = false;
      }
      else { throw new CreationError('Private Message Could Not Be Saved'); }
    });
  })
  .then(function() { return helper.slugify(message); });
};

messages.latest = function(userId, opts) {
  userId = helper.deslugify(userId);
  opts = opts || {};

  var columns = 'mid.id, mid.conversation_id, mid.sender_id, mid.receiver_id, mid.copied_ids, mid.body, mid.created_at, mid.viewed, s.username as sender_username, s.deleted as sender_deleted, s.avatar as sender_avatar, r.username as receiver_username, r.deleted as receiver_deleted, r.avatar as receiver_avatar';
  var q = ' SELECT * FROM ( SELECT DISTINCT ON (conversation_id) conversation_id, id, sender_id, receiver_id, copied_ids, body, created_at, viewed FROM private_messages WHERE sender_id = $1 OR receiver_id = $1 ORDER BY conversation_id, created_at DESC ) AS m ORDER BY m.created_at DESC LIMIT $2 OFFSET $3';
  var q2 = 'SELECT u.username, u.deleted, up.avatar FROM users u LEFT JOIN users.profiles up ON u.id = up.user_id WHERE u.id = mid.sender_id';
  var q3 = 'SELECT u.username, u.deleted, up.avatar FROM users u LEFT JOIN users.profiles up ON u.id = up.user_id WHERE u.id = mid.receiver_id';
  var query = 'SELECT ' + columns + ' FROM ( ' +
    q + ' ) mid LEFT JOIN LATERAL ( ' +
    q2 + ' ) s ON true LEFT JOIN LATERAL ( ' +
    q3 + ' ) r ON true';

  var limit = 15;
  var page = 1;
  if (opts.limit) { limit = opts.limit; }
  if (opts.page) { page = opts.page; }
  var offset = (page * limit) - limit;

  // get all related posts
  var params = [userId, limit, offset];
  return db.sqlQuery(query, params)
  // get user info for each copied user id
  .map(function(message) {
    message.copied = message.copied_ids.map(function(userId) {
      var mapQuery = 'SELECT id, username, deleted, avatar FROM users WHERE id = $1';
      return db.sqlQuery(q, userId)
      .then(function(result) { return result[0]; });
    });
    delete message.copied_ids;
    return message;
  })
  .then(helper.slugify);
};

messages.delete = function(id) {
  id = helper.deslugify(id);
  var conversationId = '';

  return using(db.createTransaction(), function(client) {
    // Check if message exists
    var q = 'SELECT conversation_id from private_messages WHERE id = $1 FOR UPDATE';
    return client.queryAsync(q, [id])
    .then(function(results) {
      if (results.rows.length < 1) { throw new DeletionError('Message Does Not Exist'); }
      else { conversationId = results.rows[0].conversation_id; }
    })
    // delete the private message
    .then(function() {
      q = 'DELETE FROM private_messages WHERE id = $1';
      return client.queryAsync(q, [id]);
    })
    // clean up conversation if no more messages
    .then(function() {
      q = 'SELECT id FROM private_messages WHERE conversation_id = $1';
      return client.queryAsync(q, [conversationId])
      .then(function(results) {
        if (results.rows.length < 1) {
          q = 'DELETE FROM private_conversations WHERE id = $1';
          client.queryAsync(q, [conversationId]);
        }
      });
    });
  });
};

messages.findUser = function(username, limit) {
  var q = 'SELECT id, username FROM users WHERE username LIKE $1 ORDER BY username LIMIT $2';
  return db.sqlQuery(q, [username + '%', limit || 25])
  .then(helper.slugify);
};

messages.isMessageSender = function(messageId, userId) {
  messageId = helper.deslugify(messageId);
  userId = helper.deslugify(userId);

  var q = 'SELECT sender_id FROM private_messages WHERE id = $1';
  return db.sqlQuery(q, [messageId])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new NotFoundError('Message Not Found'); }
  })
  .then(function(message) { return message.sender_id === userId; });
};

messages.conversationCount = function(userId) {
  userId = helper.deslugify(userId);

  // count conversations by this user
  var q = 'SELECT DISTINCT ON (conversation_id) conversation_id FROM private_messages WHERE sender_id = $1 OR receiver_id = $1';
  return db.sqlQuery(q, [userId])
  .then(function(rows) { return rows.length; });
};
