var bannedAddresses = {};
module.exports = bannedAddresses;

var Promise = require('bluebird');
var path = require('path');
var reverse = Promise.promisify(require('dns').reverse);
var db = require(path.join(__dirname, '..', 'db'));
var using = Promise.using;

// Sums an array of numbers
var sumArr = function(arr) { return arr.reduce(function(a, b) { return a + b; }, 0); };

// Calculates decay given MS and a weight
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

bannedAddresses.calculateMaliciousScore = function(ip) {
  // EG: 127.0.0.1
  var ipArr = ip.split('.');

  var baseQuery = 'SELECT weight, decay, created_at, updates FROM banned_addresses';

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
  Promise.join(hostnameScore, ip32Score, ip24Score, ip16Score, function(hostnameSum, ip32Sum, ip24Sum, ip16Sum) {
    // Return final weight sums for each
    return { hostname: hostnameSum, ip32: ip32Sum, ip24: ip24Sum, ip16: ip16Sum };
  })
  // Malicious score calculated using: hostnameSum + ip32Sum + 0.04 * ip24Sum + 0.0016 * ip16Sum
  .then(function(sums) { return sums.hostname + sums.ip32 + 0.04 * sums.ip24 + 0.0016 * sums.ip16; });
};

bannedAddresses.add = function(opts) {
  opts = opts || {};
  var hostname = opts.hostname;
  var ip = opts.ip ? opts.ip.split('.') : undefined;
  var weight = opts.weight;
  var decay = opts.decay || false;

  var q, params;
  if (hostname) {
    q = 'SELECT hostname, weight, decay, created_at, updates FROM banned_addresses WHERE hostname = $1';
    params = [ hostname ];
  }
  else {
    q = 'SELECT ip1, ip2, ip3, ip4, weight, decay, created_at, updates FROM banned_addresses WHERE ip1 = $1 AND ip2 = $2 AND ip3 = $3 AND ip4 = $4';
    params = [ ip[0], ip[1], ip[2], ip[3] ];
  }

  return using(db.createTransaction(), function(client) {
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
        // Get existing decayed weight since ip was last seen
        weight = calculateScoreDecay(banData);
        // Since this ip has been previously banned run through algorithm
        // min(2 * old_score, old_score + 1000) to get new weight where
        // old_score accounts for previous decay
        weight = Math.min(2 * weight, weight + 1000);
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
};

