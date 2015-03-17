var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))();
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixture = require(path.join(__dirname, 'fixtures', 'boards'));

lab.experiment('Boards', function() {
  var runtime;
  lab.before(function(done) {
    return seed(fixture).then(function(results) {
      runtime = results;
      done();
    });
  });
});
