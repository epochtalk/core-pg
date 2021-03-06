var polls = {};
module.exports = polls;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.join(__dirname, '..', 'db'));
var helper = require(path.join(__dirname, '..', 'helper'));
var errors = require(path.normalize(__dirname + '/../errors'));
var CreationError = errors.CreationError;

polls.byThread = function(threadId) {
  threadId = helper.deslugify(threadId);

  var q = 'SELECT p.id, p.question, p.locked, p.max_answers, p.expiration, p.change_vote, p.display_mode, ';
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

polls.create = function(threadId, poll) {
  var slugThreadId = threadId;
  threadId = helper.deslugify(threadId);
  var pollId = '';

  var q = 'INSERT INTO polls (thread_id, question, max_answers, expiration, change_vote, display_mode) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
  return db.sqlQuery(q, [threadId, poll.question, poll.max_answers, poll.expiration || null, poll.change_vote, poll.display_mode])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0]; }
    else { throw new CreationError('ERROR creating poll'); }
  })
  .then(function(dbPoll) {
    pollId = dbPoll.id;
    var answerQ = 'INSERT INTO poll_answers (poll_id, answer) VALUES ';
    var params = [dbPoll.id];
    var answerCount = 2;
    var first = true;

    poll.answers.forEach(function(answer) {
      if (first) {
        answerQ += '($1, $' + answerCount + ')';
        first = false;
      }
      else { answerQ += ', ($1, $' + answerCount + ')'; }
      answerCount++;
      params.push(answer);
    });

    return db.sqlQuery(answerQ, params);
  })
  .then(function() { return polls.byThread(slugThreadId); });
};

polls.exists = function(threadId) {
  threadId = helper.deslugify(threadId);

  var q = 'SELECT EXISTS ( SELECT 1 FROM polls WHERE thread_id = $1 )';
  return db.sqlQuery(q, [threadId])
  .then(function(rows) { return rows[0].exists; });
};

polls.vote = function(answerIds, userId) {
  userId = helper.deslugify(userId);
  answerIds = answerIds.map(function(answerId) { return helper.deslugify(answerId); });

  return Promise.each(answerIds, function(answerId) {
    var q = 'INSERT INTO poll_responses (answer_id, user_id) VALUES ($1, $2)';
    return db.sqlQuery(q, [answerId, userId]);
  });
};

polls.removeVote = function(pollId, userId) {
  pollId = helper.deslugify(pollId);
  userId = helper.deslugify(userId);

  // remove any old votes
  var q = 'DELETE FROM poll_responses WHERE answer_id IN (SELECT id FROM poll_answers WHERE poll_id = $1) AND user_id = $2';
  return db.sqlQuery(q, [pollId, userId]);
};

polls.hasVoted = function(threadId, userId) {
  threadId = helper.deslugify(threadId);
  userId = helper.deslugify(userId);

  var q = 'SELECT EXISTS (SELECT 1 FROM poll_responses pr, poll_answers pa, polls p WHERE p.id = pa.poll_id AND pr.answer_id = pa.id AND p.thread_id = $1 AND pr.user_id = $2)';
  return db.sqlQuery(q, [threadId, userId])
  .then(function(rows) { return rows[0].exists; });
};

polls.lock = function(pollId, locked) {
  pollId = helper.deslugify(pollId);

  var q = 'UPDATE polls SET locked = $2 WHERE id = $1';
  return db.sqlQuery(q, [pollId, locked])
  .then(function() { return { id: pollId, locked }; })
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

polls.isRunning = function(pollId) {
  pollId = helper.deslugify(pollId);

  var q = 'SELECT expiration FROM polls WHERE id = $1';
  return db.sqlQuery(q, [pollId])
  .then(function(rows) {
    var value = false;
    if (rows.length > 0 && !rows[0].expiration) { value = true; }
    else if (rows.length > 0 && rows[0].expiration && rows[0].expiration > Date.now()) { value = true; }
    return value;
  });
};

polls.maxAnswers = function(pollId) {
  pollId = helper.deslugify(pollId);

  var q = 'SELECT max_answers FROM polls WHERE id = $1';
  return db.sqlQuery(q, [pollId])
  .then(function(rows) {
    if (rows.length > 0) { return rows[0].max_answers; }
  });
};

polls.answers = function(pollId) {
  pollId = helper.deslugify(pollId);

  var q = 'SELECT * FROM poll_answers WHERE poll_id = $1';
  return db.sqlQuery(q, [pollId]);
};

polls.changeVote = function(pollId) {
  pollId = helper.deslugify(pollId);

  var q = 'SELECT change_vote FROM polls WHERE id = $1';
  return db.sqlQuery(q, [pollId])
  .then(function(rows) {
    var retval = false;
    if (rows.length > 0) { retval = rows[0].change_vote; }
    return retval;
  });
};

polls.update = function(options) {
  options.id = helper.deslugify(options.id);
  var q = 'UPDATE polls SET (max_answers, change_vote, expiration, display_mode) = ($1, $2, $3, $4) WHERE id = $5';
  var params = [options.max_answers, options.change_vote, options.expiration, options.display_mode, options.id];
  return db.sqlQuery(q, params)
  .then(function() { return options; })
  .then(helper.slugify);
};
