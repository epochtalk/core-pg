var bans = {};
module.exports = bans;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));
var using = Promise.using;

/* returns the created row in bans.bans */
bans.ban = function(userId, expiration) {
  userId = helper.deslugify(userId);
  var q = 'SELECT id FROM users.bans WHERE user_id = $1';
  var params = [userId];
  var returnObj;
  expiration = expiration ? expiration : new Date(8640000000000000); // permanent ban
  return using(db.createTransaction(), function(client) {
    return client.queryAsync(q, params)
    .then(function(results) {
      var rows = results.rows;
      if (rows.length > 0) { // user has been previously banned
        q = 'UPDATE users.bans SET expiration = $1, updated_at = now() WHERE user_id = $2 RETURNING id, user_id, expiration, created_at, updated_at';
        params = [expiration, userId];
      }
      else { // user has never been banned
        q = 'INSERT INTO users.bans(user_id, expiration, created_at, updated_at) VALUES($1, $2, now(), now()) RETURNING id, user_id, expiration, created_at, updated_at';
        params = [userId, expiration];
      }
      return client.queryAsync(q, params);
    })
    .then(function(results) {
      var rows = results.rows;
      if (rows.length > 0) {
        returnObj = rows[0];
        return;
      }
      else { return Promise.reject(); }
    })
    .then(function() { // lookup the banned role id to add to user
      q = 'SELECT id FROM roles where lookup = $1';
      return client.queryAsync(q, ['banned']);
    })
    .then(function(results) {
      var rows = results.rows;
      if (rows.length > 0) { return rows[0].id; }
      else { return Promise.reject(); }
    })
    .then(function(bannedRoleId) {
      q = 'INSERT INTO roles_users(role_id, user_id) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM roles_users WHERE role_id = $1 AND user_id = $2);';
      params = [bannedRoleId, userId];
      return client.queryAsync(q, params)
      .then(function() { // append roles to updated user and return
        q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
        params = [userId];
        return client.queryAsync(q, params);
      })
      .then(function(results) {
        returnObj.roles = results.rows;
        return returnObj;
      });
    });
  })
  .then(helper.slugify);
};

/* returns the created row in users.bans */
bans.unban = function(userId) {
  userId = helper.deslugify(userId);
  var q = 'UPDATE users.bans SET expiration = now(), updated_at = now() WHERE user_id = $1 RETURNING id, user_id, expiration, created_at, updated_at';
  var params = [userId];
  var returnObj;
  return using(db.createTransaction(), function(client) {
    return client.queryAsync(q, params)
    .then(function(results) {
      var rows = results.rows;
      if (rows.length > 0) {
        returnObj = rows[0];
        return;
      }
      else { return Promise.reject(); }
    })
    .then(function() { // lookup the banned role id
      q = 'SELECT id FROM roles where lookup = $1';
      return client.queryAsync(q, ['banned']);
    })
    .then(function(results) {
      var rows = results.rows;
      if (rows.length > 0) { return rows[0].id; }
      else { return Promise.reject(); }
    })
    .then(function(bannedRoleId) {
      q = 'DELETE FROM roles_users WHERE role_id = $1 AND user_id = $2';
      params = [bannedRoleId, userId];
      return client.queryAsync(q, params);
    })
    .then(function() { // append roles to updated user and return
      q = 'SELECT roles.* FROM roles_users, roles WHERE roles_users.user_id = $1 AND roles.id = roles_users.role_id';
      params = [userId];
      return client.queryAsync(q, params);
    })
    .then(function(results) {
      returnObj.roles = results.rows;
      return returnObj;
    });
  })
  .then(helper.slugify);
};

bans.banFromBoards = function(userId, boardIds) {
  var deslugifiedBoardIds = boardIds.map(function(boardId) { return helper.deslugify(boardId); });
  var deslugifiedUserId = helper.deslugify(userId);
  var q = 'INSERT INTO users.board_bans(user_id, board_id) SELECT $1, $2 WHERE NOT EXISTS (SELECT user_id, board_id FROM users.board_bans WHERE user_id = $1 AND board_id = $2)';
  return Promise.each(deslugifiedBoardIds, function(boardId) {
    var params = [ deslugifiedUserId, boardId ];
    return db.sqlQuery(q, params);
  })
  .then(function() { return { user_id: userId, board_ids: boardIds }; });
};

bans.unbanFromBoards = function(userId, boardIds) {
  var deslugifiedBoardIds = boardIds.map(function(boardId) { return helper.deslugify(boardId); });
  var deslugifiedUserId = helper.deslugify(userId);
  var q = 'DELETE FROM users.board_bans WHERE user_id = $1 AND board_id = ANY($2) RETURNING user_id, board_id';
  var params = [ deslugifiedUserId, deslugifiedBoardIds ];
  return db.sqlQuery(q, params)
  .then(function() { return { user_id: userId, board_ids: boardIds }; });
};

bans.isNotBannedFromBoard = function(userId, opts) {
  var q = 'SELECT user_id FROM users.board_bans WHERE user_id = $1 AND board_id = ';
  var params = [ helper.deslugify(userId) ];
  if (opts.boardId) {
    q += '$2';
    params.push(helper.deslugify(opts.boardId));
  }
  else if (opts.threadId) {
    q += '(SELECT t.board_id FROM threads t WHERE id = $2)';
    params.push(helper.deslugify(opts.threadId));
  }
  else if (opts.postId) {
    q += '(SELECT t.board_id FROM posts p JOIN threads t ON p.thread_id = t.id WHERE p.id = $2)';
    params.push(helper.deslugify(opts.postId));
  }
  return db.sqlQuery(q, params)
  .then(function(rows) { return rows.length < 1; });
};

bans.getBannedBoards = function(username) {
  var q = 'SELECT b.id, b.name FROM users.board_bans JOIN boards b ON board_id = b.id WHERE user_id = (SELECT id from users WHERE username = $1)';
  var params = [ username ];
  return db.sqlQuery(q, params)
  .then(helper.slugify);
};

bans.byBannedBoards = function(opts) {
  var limit = 25;
  var page = 1;

  // Build results object for return
  var results = Object.assign({}, opts);
  results.prev = results.page > 1 ? results.page - 1 : undefined;

  // Calculate query vars
  var modId, boardId, search;
  var searchUserId; // if populated search keyword is a userId
  if (opts && opts.limit) { limit = opts.limit; }
  if (opts && opts.page) { page = opts.page; }
  if (opts && opts.userId) { modId = opts.userId; }
  if (opts && opts.boardId) { boardId = opts.boardId; }
  if (opts && opts.search) { // search can be a username, email or userId
    search = opts.search;
    // Try to deslugify search to determine if it is a userId
    searchUserId = helper.deslugify(search);
    var uuidv4 = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
    searchUserId = new RegExp(uuidv4).test(searchUserId) ? searchUserId : undefined;
    search = searchUserId || '%' + search + '%';
  }

  // Dynamically build query and params
  var baseQuery = 'SELECT u.username, u.id as user_id, u.created_at, u.email, array_agg(b.id) as board_ids, array_agg(b.name) as board_names FROM users.board_bans ubb JOIN users u ON u.id = ubb.user_id JOIN boards b ON b.id = ubb.board_id';
  var groupByClause = 'GROUP BY u.username, u.id';
  var query = [ baseQuery, groupByClause ]; // Array used to build query
  var params = []; // holds parameters
  var paramPos; // tracks position of current parameter

  // 1) Append filter to query which only returns data for moderated boards
  if (modId) {
    params.push(helper.deslugify(modId));
    paramPos = params.length;
    query.unshift('SELECT * FROM (');
    query.push(') AS mdata WHERE mdata.board_ids && (SELECT array_agg(board_id) AS board_ids FROM board_moderators WHERE user_id = $' + paramPos + ')::uuid[]');
  }

  // 2) Append filter to query which only returns users banned from a specific board
  if (boardId) {
    params.push(helper.deslugify(boardId));
    paramPos = params.length;
    query.unshift('SELECT * FROM (');
    query.push(') AS bdata WHERE $' + paramPos + ' = ANY(bdata.board_ids)');
  }

  // 3) Append search to query and params if present
  if (search) {
    params.push(search);
    paramPos = params.length;
    var clauseSep = paramPos === 1 ? 'WHERE' : 'AND';
    var clause = clauseSep + (
      searchUserId ?
      ' user_id = $' + paramPos :
      ' (username LIKE $' + paramPos + ' OR LOWER(email) LIKE LOWER($' + paramPos + '))'
    );
    // GROUP BY must be after WHERE clause if a search without filters is being performed
    if (clauseSep === 'WHERE') { query = [ baseQuery, clause, groupByClause ]; }
    else { query.push(clause); }
  }

  // 4) Append offset and limit
  // Calculate Offset
  var offset = (page * limit) - limit;
  params.push(offset);
  // query one extra to see if there's another page
  limit = limit + 1;
  params.push(limit);
  paramPos = params.length;
  query.push('ORDER by username OFFSET $' + (paramPos - 1) + ' LIMIT $' + paramPos);

  // Join the array of clauses into a single string
  query = query.join(' ').replace('  ', ' ');

  return db.sqlQuery(query, params)
  .then(function(data) {
    // Change userId for mod back to modded
    results.modded = results.userId ? true : undefined;
    delete results.userId;

    // Change boardId back to board
    results.board = results.boardId;
    delete results.boardId;

    // Check for next page then remove extra record
    if (data.length === limit) {
      results.next = page + 1;
      data.pop();
    }
    // Append page data and slugify
    results.data = helper.slugify(data);
    return results;
  });
};
