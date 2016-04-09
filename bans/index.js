var bans = {};
module.exports = bans;

var path = require('path');
var Promise = require('bluebird');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));
var using = Promise.using;
var reverse = Promise.promisify(require('dns').reverse);

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
    .then(function() {
      q = 'UPDATE users SET malicious_score = null WHERE id = $1';
      return client.queryAsync(q, [ userId ]);
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

bans.pageBannedAddresses = function(opts) {
  opts = opts || { page: 1, limit: 25 };
  // Set defaults
  var limit = 25;
  var page = 1;
  var sortField = 'created_at';
  var sortOrder = opts.desc ? 'DESC' : 'ASC';
  var search = opts.search;

  // Build results object for return
  var results = Object.assign({}, opts);
  results.prev = results.page > 1 ? results.page - 1 : undefined;

  // Calculate query vars
  if (opts.limit) { limit = opts.limit; }
  if (opts.page) { page = opts.page; }
  if (opts.field) {
    sortField = opts.field;
    // If sortfield is updates, sort by the last timestamp in updates array
    if (sortField === 'updates') {
      sortField = 'CASE WHEN updates[array_upper(updates, 1)] IS NULL THEN 1 else 0 END, updates[array_upper(updates, 1)] ' + sortOrder + ', created_at';
    }
    else if (sortField === 'update_count') {
      sortField = 'CASE WHEN array_upper(updates, 1) IS NULL THEN 0 ELSE array_upper(updates, 1) END';
    }
  }

  // Base paging query for banned addresses
  var baseQuery = 'SELECT hostname, ip1, ip2, ip3, ip4, weight, decay, created_at, updates, updates[array_upper(updates, 1)] as updated_at, array_upper(updates, 1) AS update_count FROM banned_addresses';

  // Calculate pagination vars
  var offset = (page * limit) - limit;
  limit = limit + 1; // query one extra result to see if theres another page

  var q, params;
  if (search) { // Update query to accomodate search
    var searchArr = search.split('.');
    var whereClause = 'WHERE hostname LIKE $1 OR CAST(ip1 AS TEXT) LIKE $1';
    params = ['%' + search + '%', offset, limit];
    // Append like clause for each arr element
    var ipParamStart = 4;
    for(var x = 0; x < searchArr.length; x++) {
      var clause = x === 0 ? ' OR' : ' AND';
      whereClause += clause + ' CAST(ip' + (x + 1) + ' AS TEXT) LIKE $' + (x + ipParamStart);
      params.push(searchArr[x]);
    }
    q = [baseQuery, whereClause, 'ORDER BY', sortField, sortOrder, 'OFFSET $2', 'LIMIT $3'].join(' ');
  }
  else { // Join query and opts ( no search )
    q = [baseQuery, 'ORDER BY', sortField, sortOrder, 'OFFSET $1', 'LIMIT $2'].join(' ');
    params = [offset, limit];
  }


  // Run query
  return db.sqlQuery(q, params)
  .then(function(data) {
    // Check for next page then remove extra record
    if (data.length === limit) {
      results.next = page + 1;
      data.pop();
    }
    return data;
  })
  .map(function(address) {
    // Calculate current weight
    address.weight = calculateScoreDecay(address);

    // Replace wildcard % with *
    if (address.hostname) {
      address.hostname = address.hostname.replace(new RegExp('%', 'g'), '*');
    }
    // Remove Hostname if not present and calculate joined ip address
    else {
      delete address.hostname;
      address.ip = [address.ip1, address.ip2, address.ip3, address.ip4].join('.');
    }

    // Remove individual IP fields
    delete address.ip1;
    delete address.ip2;
    delete address.ip3;
    delete address.ip4;
    return address;
  })
  .then(function(data) {
    // Append banned addresses data to results
    results.data = data;
    return results;
  });
};

bans.getMaliciousScore = function(opts) {
  var ip = opts.ip;
  var userId = helper.deslugify(opts.userId);
  // EG: 127.0.0.1
  var ipArr = ip.split('.');

  // Base select statement for querying banend addresses
  var baseQuery = 'SELECT weight, decay, created_at, updates FROM banned_addresses';

  var maliciousScore = null;

  // 1) Calculate sum for hostname matches
  var hostnameScore = reverse(ip)
  .map(function(hostname) { // Calculate hostname score
    return db.scalar(baseQuery + ' WHERE $1 LIKE hostname', [ hostname ])
    .then(calculateScoreDecay); // Calculate decay for each result
  })
  .then(sumArr) // Sum the weight for each match
  .catch(function() { return 0; }); // hostname doesn't exit for ip return 0 for weight

  // 2) Get score for ip32 (There should only be 1 match since address is unique)
  var ip32Score = db.scalar(baseQuery + ' WHERE ip1 = $1 AND ip2 = $2 AND ip3 = $3 AND ip4 = $4', [ ipArr[0], ipArr[1], ipArr[2], ipArr[3] ])
  .then(calculateScoreDecay); // calculate the decayed weight for full ip match

  // 3) Calculate sum for ip24 matches
  var ip24Score = db.sqlQuery(baseQuery + ' WHERE ip1 = $1 AND ip2 = $2 AND ip3 = $3', [ ipArr[0], ipArr[1], ipArr[2] ])
  .map(calculateScoreDecay) // calculate decayed weight for each ip24 match
  .then(sumArr); // sum all decayed weights for ip24

  // 4) calculate sum for ip16 matches
  var ip16Score = db.sqlQuery(baseQuery + ' WHERE ip1 = $1 AND ip2 = $2', [ ipArr[0], ipArr[1] ])
  .map(calculateScoreDecay) // calculate decayed weight for each ip16 match
  .then(sumArr); // sum all decayed weights for ip16

  // Run queries for hostname, ip32, ip24, ip16
  return Promise.join(hostnameScore, ip32Score, ip24Score, ip16Score, function(hostnameSum, ip32Sum, ip24Sum, ip16Sum) {
    // Return final weight sums for each
    return { hostname: hostnameSum, ip32: ip32Sum, ip24: ip24Sum, ip16: ip16Sum };
  })
  // Malicious score calculated using: hostnameSum + ip32Sum + 0.04 * ip24Sum + 0.0016 * ip16Sum
  .then(function(sums) {
    maliciousScore = sums.hostname + sums.ip32 + 0.04 * sums.ip24 + 0.0016 * sums.ip16;
    return maliciousScore;
  })
  .then(function() {
    if (userId) {
      var q = 'UPDATE users SET malicious_score = $1 WHERE id = $2';
      return db.sqlQuery(q, [ maliciousScore, userId ])
      .then(function() { return maliciousScore; });
    }
    else { return maliciousScore; }
  });
};

bans.copyUserIps = function(opts) {
  var userId = helper.deslugify(opts.userId);
  var weight = opts.weight || 50;
  var decay = opts.decay === false ? false : true;
  var q = 'SELECT user_ip FROM users.ips WHERE user_id = $1';
  return db.sqlQuery(q, [ userId ])
  .map(function(info) { return { ip: info.user_ip, weight: weight, decay: decay }; })
  .then(function(addresses) { return bans.addAddresses(addresses); });
};

bans.addAddresses = function(addresses) {
  return using(db.createTransaction(), function(client) {
    return Promise.map(addresses, function(addrInfo) {
      var hostname = addrInfo.hostname;
      var ip = addrInfo.ip ? addrInfo.ip.split('.') : undefined;
      var weight = addrInfo.weight;
      var decay = addrInfo.decay || false;
      var q, params;
      if (hostname) {
        q = 'SELECT hostname, weight, decay, created_at, updates FROM banned_addresses WHERE hostname = $1';
        params = [ hostname ];
      }
      else {
        q = 'SELECT ip1, ip2, ip3, ip4, weight, decay, created_at, updates FROM banned_addresses WHERE ip1 = $1 AND ip2 = $2 AND ip3 = $3 AND ip4 = $4';
        params = [ ip[0], ip[1], ip[2], ip[3] ];
      }
      return client.queryAsync(q, params)
      .then(function(results) {
        var banData = results.rows.length ? results.rows[0] : undefined;
        // Existing Ban: Hostname
        if (banData && banData.hostname) {
          q = 'UPDATE banned_addresses SET weight = $1, decay = $2, updates = array_cat(updates, \'{now()}\') WHERE hostname = $3 RETURNING hostname, weight, decay, created_at, updates';
          params = [ weight, decay, hostname ];
        }
        // Existing Ban: IP address or Proxy IP
        else if (banData) {
          q = 'UPDATE banned_addresses SET weight = $1, decay = $2, updates = array_cat(updates, \'{now()}\') WHERE ip1 = $3 AND ip2 = $4 AND ip3 = $5 AND ip4 = $6 RETURNING ip1, ip2, ip3, ip4, weight, decay, created_at, updates';
          // If ip decays calculate new score
          if (banData.decay && decay) {
            // Get existing decayed weight since ip was last seen
            weight = calculateScoreDecay(banData);
            // Since this ip has been previously banned run through algorithm
            // min(2 * old_score, old_score + 1000) to get new weight where
            // old_score accounts for previous decay
            weight = Math.min(2 * weight, weight + 1000);
          }
          params = [ weight, decay, ip[0], ip[1], ip[2], ip[3] ];
        }
        else if (hostname) { // New Ban: Hostname
          q = 'INSERT INTO banned_addresses(hostname, weight, decay, created_at) VALUES($1, $2, $3, now()) RETURNING hostname, weight, decay, created_at, updates';
          params = [ hostname, weight, decay ];
        }
        else { // New Ban: IP Address or Proxy IP
          q = 'INSERT INTO banned_addresses(ip1, ip2, ip3, ip4, weight, decay, created_at) VALUES($1, $2, $3, $4, $5, $6, now()) RETURNING ip1, ip2, ip3, ip4, weight, decay, created_at, updates';
            params = [ ip[0], ip[1], ip[2], ip[3], weight, decay ];
        }
        return client.queryAsync(q, params)
        .then(function(results) { return results.rows; });
      });
    });
  });
};

// Sums an array of numbers
var sumArr = function(arr) { return arr.reduce(function(a, b) { return a + b; }, 0); };

// Calculates decay given MS and a weight
// Decay algorithm is 0.8897*curWeight^0.9644 run weekly
// This will calculate decay given the amount of time that has passed
// in ms since the weight was last updated
var decayForTime = function(time, weight) {
  var oneWeek = 1000 * 60 * 60 * 24 * 7;
  var weeks = time / oneWeek;
  var a = 0.8897;
  var r = 0.9644;
  return Math.pow(a, (Math.pow(r, weeks) - 1) / (r - 1)) * Math.pow(weight, Math.pow(r, weeks));
};

// Returns the decayed score given a row
var calculateScoreDecay = function(row) {
  // Score does decay
  if (row && row.decay) {
    // Current timestamp
    var currentDate = new Date();
    // Length of updates array
    var updatesLen = row.updates.length;
    // Date the record was last updated
    var lastUpdateDate = updatesLen ? row.updates[updatesLen - 1] : new Date(row.created_at);
    // Diff in ms between last update date and current date
    var diffMs = Math.abs(currentDate.getTime() - lastUpdateDate.getTime());
    // Return the decayed score
    return decayForTime(diffMs, row.weight);
  }
  // Score does not decay
  else if (row && !row.decay) { return Number(row.weight); }
  // No match found return 0
  else { return 0; }
};
