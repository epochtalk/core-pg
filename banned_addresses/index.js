var bannedAddresses = {};
module.exports = bannedAddresses;

var Promise = require('bluebird');
var path = require('path');
var reverse = Promise.promisify(require('dns').reverse);
var db = require(path.join(__dirname, '..', 'db'));
var using = Promise.using;

bannedAddresses.calculateMaliciousScore = function(ip) {
  // EG: 127.0.0.1
  var ipArr = ip.split('.');

  // Score Helpers
  var sumArr = function(arr) { return arr.reduce(function(a, b) { return a + b; }, 0); };
  var calculateScoreDecay = function(row) {
    // Score does decay
    if (row && row.decay) {
      // Recursively calculate decay
      var decay = function(val, itr) {
        if (itr === 0) { return val; }
        var decayedScore = 0.8897 * Math.pow(val, 0.9644);
        return decay(decayedScore, --itr);
      };

      // Calculate how many weeks since creation
      var curMs = new Date().getTime();
      var banMs = row.created_at.getTime();
      var oneWeek = 1000 * 60 * 60 * 24 * 7;
      var diffMs = Math.abs(curMs - banMs);
      var decayWeeks = Math.floor(diffMs / oneWeek);

      // Return the decayed score
      return decay(row.initial_weight, row.updates.length);
    }
    // Score does not decay
    else if (row && !row.decay) {
      return Number(row.initial_weight);
    }
    // No match found return 0
    else { return 0; }
  };

  var baseQuery = 'SELECT initial_weight, decay, created_at, updates FROM banned_addresses';

  // TODO: How to properly pattern match hostname
  // 1) Calculate sum for hostname matches
  var hostnameScore = reverse(ip)
  .map(function(hostname) { // Calculate hostname score
    return db.scalar(baseQuery + ' WHERE $1 LIKE hostname', [ hostname ])
    .then(calculateScoreDecay);
  }).then(sumArr);

  // 2) Get score for ip32 (There should only be 1 match since address is unique)
  var ip32Score = db.scalar(baseQuery + ' WHERE ip1 = $1 AND ip2 = $2 AND ip3 = $3 AND ip4 = $4', [ ipArr[0], ipArr[1], ipArr[2], ipArr[3] ]).then(calculateScoreDecay);

  // 3) Calculate sum for ip24 matches
  var ip24Score = db.sqlQuery(baseQuery + ' WHERE ip1 = $1 AND ip2 = $2 AND ip3 = $3', [ ipArr[0], ipArr[1], ipArr[2] ])
  .map(calculateScoreDecay).then(sumArr);

  // 4) calculate sum for ip16 matches
  var ip16Score = db.sqlQuery(baseQuery + ' WHERE ip1 = $1 AND ip2 = $2', [ ipArr[0], ipArr[1] ])
  .map(calculateScoreDecay).then(sumArr);

  Promise.join(hostnameScore, ip32Score, ip24Score, ip16Score, function(hostnameSum, ip32Sum, ip24Sum, ip16Sum) {
    return { hostname: hostnameSum, ip32: ip32Sum, ip24: ip24Sum, ip16: ip16Sum };
  })
  .then(function(sums) { return sums.hostname + sums.ip32 + 0.04 * sums.ip24 + 0.0016 * sums.ip16; })
  .then(console.log); // Remove
};

// bannedAddresses.calculateMaliciousScore('81.7.17.171');

bannedAddresses.add = function(opts) {
  opts = opts || {};
  var hostname = opts.hostname;
  var ip = opts.ip ? opts.ip.split('.') : undefined;
  var initialWeight = opts.initialWeight;
  var decay = opts.decay || false;

  var q, params;
  if (hostname) {
    q = 'SELECT hostname, initial_weight, decay, created_at, updates FROM banned_addresses WHERE hostname = $1';
    params = [ hostname ];
  }
  else {
    q = 'SELECT ip1, ip2, ip3, ip4, initial_weight, decay, created_at, updates FROM banned_addresses WHERE ip1 = $1 AND ip2 = $2 AND ip3 = $3 AND ip4 = $4';
    params = [ ip[0], ip[1], ip[2], ip[3] ];
  }

  return using(db.createTransaction(), function(client) {
    return client.queryAsync(q, params)
    .then(function(results) {
      var banData = results.rows.length ? results.rows[0] : undefined;
      // Existing Ban: Hostname
      if (banData && banData.hostname) {
        q = 'UPDATE banned_addresses SET initial_weight = $1, decay = $2, updates = array_cat(updates, \'{now()}\') WHERE hostname = $3 RETURNING hostname, initial_weight, decay, created_at, updates';
        params = [ initialWeight, decay, hostname ];
      }
      // Existing Ban: IP address or Proxy IP
      else if (banData) {
        q = 'UPDATE banned_addresses SET initial_weight = $1, decay = $2, updates = array_cat(updates, \'{now()}\') WHERE ip1 = $3 AND ip2 = $4 AND ip3 = $5 AND ip4 = $6 RETURNING ip1, ip2, ip3, ip4, initial_weight, decay, created_at, updates';
        params = [ initialWeight, decay, ip[0], ip[1], ip[2], ip[3] ];
      }
      else if (hostname) { // New Ban: Hostname
        q = 'INSERT INTO banned_addresses(hostname, initial_weight, decay, created_at) VALUES($1, $2, $3, now()) RETURNING hostname, initial_weight, decay, created_at, updates';
        params = [ hostname, initialWeight, decay ];
      }
      else { // New Ban: IP Address or Proxy IP
        q = 'INSERT INTO banned_addresses(ip1, ip2, ip3, ip4, initial_weight, decay, created_at) VALUES($1, $2, $3, $4, $5, $6, now()) RETURNING ip1, ip2, ip3, ip4, initial_weight, decay, created_at, updates';
          params = [ ip[0], ip[1], ip[2], ip[3], initialWeight, decay ];
      }
      return client.queryAsync(q, params)
      .then(function(results) { return results.rows; }).then(console.log); // remove
    });
  });
};
