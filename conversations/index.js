var conversations = {};
module.exports = conversations;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var DeletionError = Promise.OperationalError;
var CreationError = Promise.OperationalError;
var using = Promise.using;

conversations.create = function() {
  var conversation = {};
  var q = 'INSERT INTO private_conversations(created_at) VALUES (now()) RETURNING id, created_at';
  return using(db.createTransaction(), function(client) {
    return client.queryAsync(q)
    .then(function(results) {
      if (results.rows.length > 0) {
        conversation.id = results.rows[0].id;
        conversation.created_at = results.rows[0].created_at;
      }
      else { throw new CreationError('Private Conversation Could Not Be Saved'); }
    });
  })
  .then(function() { return helper.slugify(conversation); });
};

conversations.messages = function(conversationId, viewerId, opts) {
  conversationId = helper.deslugify(conversationId);
  viewerId = helper.deslugify(viewerId);

  opts = opts || {};
  var limit = opts.limit || 15;
  var timestamp = opts.timestamp || new Date();
  var messageId = opts.messageId;
  if (messageId) { messageId = helper.deslugify(messageId); }
  var params = [conversationId, viewerId, timestamp, limit];

  var columns = 'mid.id, mid.conversation_id, mid.sender_id, mid.receiver_id, mid.copied_ids, mid.body, mid.created_at, mid.viewed, s.username as sender_username, s.deleted as sender_deleted, s.avatar as sender_avatar, r.username as receiver_username, r.deleted as receiver_deleted, r.avatar as receiver_avatar';
  var q = 'SELECT conversation_id, id, sender_id, receiver_id, copied_ids, body, created_at, viewed FROM private_messages WHERE conversation_id = $1 AND (sender_id = $2 OR receiver_id = $2) AND created_at <= $3';
  var q2 = 'SELECT u.username, u.deleted, up.avatar FROM users u LEFT JOIN users.profiles up ON u.id = up.user_id WHERE u.id = mid.sender_id';
  var q3 = 'SELECT u.username, u.deleted, up.avatar FROM users u LEFT JOIN users.profiles up ON u.id = up.user_id WHERE u.id = mid.receiver_id';

  if (messageId) {
    var withId = ' AND id != $4 ORDER BY created_at DESC LIMIT $5';
    q = q + withId;
    params = [conversationId, viewerId, timestamp, messageId, limit];
  }
  else { q = q + ' ORDER BY created_at DESC LIMIT $4'; }

  var query = 'SELECT ' + columns + ' FROM ( ' +
    q + ' ) mid LEFT JOIN LATERAL ( ' +
    q2 + ' ) s ON true LEFT JOIN LATERAL ( ' +
    q3 + ' ) r ON true';

  // get all related posts
  return db.sqlQuery(query, params)
  // get user info for each copied user id
  .map(function(message) {
    message.copied = message.copied_ids.map(function(userId) {
      var q = 'SELECT id, username, deleted, avatar FROM users WHERE id = $1';
      return db.sqlQuery(q, userId)
      .then(function(result) { return result[0]; });
    });
    delete message.copied_ids;
    return message;
  })
  .then(helper.slugify);
};

conversations.delete = function(id) {
  id = helper.deslugify(id);

  return using(db.createTransaction(), function(client) {
    // Check if conversation exists
    var q = 'SELECT id from private_conversations WHERE id = $1 FOR UPDATE';
    return client.queryAsync(q, [id])
    .then(function(results) {
      if (results.rows.length < 1) { throw new DeletionError('Conversation Does Not Exist'); }
    })
    // delete the private conversation
    .then(function() {
      q = 'DELETE FROM private_conversations WHERE id = $1';
      return client.queryAsync(q, [id]);
    });
  });
};

conversations.isConversationMember = function(conversationId, userId) {
  conversationId = helper.deslugify(conversationId);
  userId = helper.deslugify(userId);

  var q = 'SELECT id FROM private_messages WHERE conversation_id = $1 AND (sender_id = $2 OR receiver_id = $2)';
  return db.sqlQuery(q, [conversationId, userId])
  .then(function(rows) { return rows.length > 0; });
};
