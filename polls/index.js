var polls = {};
module.exports = polls;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var DeletionError = Promise.OperationalError;
var CreationError = Promise.OperationalError;
var using = Promise.using;

polls.byThread = function(threadId) {
  threadId = helper.deslugify(threadId);

  var q = 'SELECT p.id, p.question, p.locked, ';
  q += '(SELECT json_agg(row_to_json((SELECT x FROM ( ';
  q +=   'SELECT pa.id, pa.answer, ';
  q +=   '(SELECT COUNT(*) ';
  q +=     'FROM poll_responses pr ';
  q +=     'WHERE pr.answer_id = pa.id) as votes';
  q +=   ') x ))) as answers ';
  q +=   'FROM poll_answers pa ';
  q +=   'WHERE pa.poll_id = p.id ';
  q += ') as answers ';
  q += 'FROM polls p ';
  q += 'WHERE p.thread_id = $1';
  return db.sqlQuery(q, [threadId])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { return; }
  })
  .then(helper.slugify);
};

polls.create = function(threadId, pollQuestion, pollAnswers) {
  threadId = helper.deslugify(threadId);

  var q = 'INSERT INTO polls (thread_id, question) VALUES ($1, $2) RETURNING id';
  return db.sqlQuery(q, [threadId, pollQuestion])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new CreationError('ERROR creating poll'); }
  })
  .then(function(poll) {
    var answerQ = 'INSERT INTO poll_answers (poll_id, answer) VALUES ';
    var params = [poll.id];
    var answerCount = 2;
    var first = true;

    pollAnswers.forEach(function(answer) {
      if (first) {
        answerQ += '($1, $' + answerCount + ')';
        first = false;
      }
      else { answerQ += ', ($1, $' + answerCount + ')'; }
      answerCount++;
      params.push(answer);
    });

    return db.sqlQuery(answerQ, params);
  });
};

polls.exists = function(threadId) {
  threadId = helper.deslugify(threadId);

  var q = 'SELECT EXISTS ( SELECT 1 FROM polls WHERE thread_id = $1 )';
  return db.sqlQuery(q, [threadId])
  .then(function(rows) { return rows[0].exists; });
};

polls.vote = function(pollId, answerId, userId) {
  pollId = helper.deslugify(pollId);
  answerId = helper.deslugify(answerId);
  userId = helper.deslugify(userId);

  var q = 'INSERT INTO poll_responses (poll_id, answer_id, user_id) VALUES ($1, $2, $3)';
  return db.sqlQuery(q, [pollId, answerId, userId])
  .then(function() { return { id: answerId }; })
  .then(helper.slugify);
};

polls.hasVoted = function(threadId, userId) {
  threadId = helper.deslugify(threadId);
  userId = helper.deslugify(userId);

  var q = 'SELECT EXISTS ( SELECT 1 FROM poll_responses pr LEFT JOIN polls p ON p.id = pr.poll_id WHERE p.thread_id = $1 AND pr.user_id = $2)';
  return db.sqlQuery(q, [threadId, userId])
  .then(function(rows) { return rows[0].exists; });
};

polls.lock = function(pollId, lockValue) {
  pollId = helper.deslugify(pollId);

  var q = 'UPDATE polls SET locked = $2 WHERE id = $1';
  return db.sqlQuery(q, [pollId, lockValue])
  .then(function() { return { id: pollId, lockValue: lockValue }; })
  .then(helper.slugify);
};

polls.isLocked = function(pollId) {
  pollId = helper.deslugify(pollId);

  var q = 'SELECT locked FROM polls WHERE id = $1';
  return db.sqlQuery(q, [pollId])
  .then(function(rows) {
    var retval = false;
    if (rows.length > 0) { retval = rows[0].locked; }
    return retval;
  });
};
