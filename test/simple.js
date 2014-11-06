var path = require('path');
var pg = require('pg');
var core = require(path.join('..'));
var config = require(path.join(__dirname, '..', 'config'));
c = core();
console.log(config);
c.users.all().then(function(results) {
  console.log(results);
  pg.end();
});
