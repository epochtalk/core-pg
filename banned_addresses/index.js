var bannedAddresses = {};
module.exports = bannedAddresses;

var Promise = require('bluebird');
var path = require('path');
var reverse = Promise.promisify(require('dns').reverse);
var db = require(path.join(__dirname, '..', 'db'));
var using = Promise.using;

bannedAddresses.calculateMaliciousScore = function(ip) {
  // EG: 127.0.0.1
  var ip32 = ip;

  // EG: 127.0.0.%
  var ip24 = ip.split('.');
  ip24.length = 3;
  ip24.push('%');
  ip24 = ip24.join('.');

  // EG: 127.0.%.%
  var ip16 = ip.split('.');
  ip16.length = 2;
  ip16.push('%', '%');
  ip16 = ip16.join('.');

  console.log(ip32, ip24, ip16); // REMOVE

  // Score Helpers
  var sumArr = function(arr) { return arr.reduce(function(a, b) { return a + b; }, 0); };
  var calculateScoreDecay = function(row) {
    // Score does decay
    if (row && row.decay_multiplier && row.decay_exponent) {
      // Recursively calculate decay
      var decay = function(val, itr) {
        if (itr === 0) { return val; }
        var decayedScore = row.decay_multiplier * Math.pow(val, row.decay_exponent);
        return decay(decayedScore, --itr);
      };

      // Calculate how many weeks since creation
      var curMs = new Date().getTime();
      var banMs = row.created_at.getTime();
      var oneWeek = 1000 * 60 * 60 * 24 * 7;
      var diffMs = Math.abs(curMs - banMs);
      var decayWeeks = Math.floor(diffMs / oneWeek);

      // Return the decayed score
      return decay(row.undecayed_score, decayWeeks);
    }
    // Score does not decay
    else if (row && (!row.decay_multiplier || !row.decay_exponent)) {
      return Number(row.undecayed_score);
    }
    // No match found return 0
    else { return 0; }
  };

  var baseQuery = 'SELECT undecayed_score, decay_multiplier, decay_exponent, created_at FROM banned_addresses';

  // TODO: How to properly pattern match hostname
  // 1) Calculate sum for hostname matches
  var hostnameScore = reverse(ip)
  .map(function(hostname) { // Calculate hostname score
    return db.scalar(baseQuery + ' WHERE address LIKE $1', [ hostname ])
    .then(calculateScoreDecay);
  }).then(sumArr);

  // 2) Get score for ip32 (There should only be 1 match since address is unique)
  var ip32Score = db.scalar(baseQuery + ' WHERE address = $1', [ ip32 ]).then(calculateScoreDecay);

  // 3) Calculate sum for ip24 matches
  var ip24Score = db.sqlQuery(baseQuery + ' WHERE address LIKE $1', [ ip24 ])
  .map(calculateScoreDecay).then(sumArr);

  // 4) calculate sum for ip16 matches
  var ip16Score = db.sqlQuery(baseQuery + ' WHERE address LIKE $1', [ ip16 ])
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
  var address = opts.address;
  var undecayedScore = opts.undecayedScore;
  var decayMultiplier = opts.decayMultiplier;
  var decayExponent = opts.decayExponent;
  var q = 'SELECT address, undecayed_score, decay_multiplier, decay_exponent, created_at, updated_at FROM banned_addresses WHERE address = $1';

  return using(db.createTransaction(), function(client) {
    return client.queryAsync(q, [ address ])
    .then(function(results) {
      var params;
      if (results.rows.length > 0) {  // Existing banned address
        var banData = results.rows[0];
        q = 'UPDATE banned_addresses SET undecayed_score = $2, updated_at = now() WHERE address = $1 RETURNING address, undecayed_score, decay_multiplier, decay_exponent, created_at, updated_at';
        // Calculate new malicious score: min(oldScore * 2, oldScore + 1000)
        undecayedScore = Math.min(Number(banData.undecayed_score) * 2, Number(banData.undecayed_score) + 1000);
        params = [address, undecayedScore];
      }
      else { // Newly banned address
        q = 'INSERT INTO banned_addresses(address, undecayed_score, decay_multiplier, decay_exponent, created_at, updated_at) VALUES($1, $2, $3, $4, now(), now()) RETURNING address, undecayed_score, decay_multiplier, decay_exponent, created_at, updated_at';
          params = [address, undecayedScore, decayMultiplier, decayExponent];
      }
      return client.queryAsync(q, params)
      .then(function(results) { return results.rows; }).then(console.log); // remove
    });
  });
};

bannedAddresses.add({
  address: '81.7.17.171',
  undecayedScore: 50,
  decayMultiplier: 0.8897,
  decayExponent: 0.9644
});

