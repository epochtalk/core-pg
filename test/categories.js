var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))();
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixture = require(path.join(__dirname, 'fixtures', 'categories'));

lab.experiment('Categories', function() {
  var runtime;
  lab.before(function(done) {
    return seed(fixture).then(function(results) {
      runtime = results;
      done();
    });
  });
  lab.test('should return all categories', function(done) {
    core.categories.all(function(categories) {
      expect(categories.length).to.equal(runtime.categories.length);
    });
    done();
  });
});
