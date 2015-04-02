var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))({host: 'localhost', database: 'epoch_test'});
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixture = require(path.join(__dirname, 'fixtures', 'categories'));

lab.experiment('Categories', function() {
  var runtime;
  var expectations = function(seededCategory, category) {
    expect(category).to.exist;
    expect(category.id).to.equal(seededCategory.id);
    expect(category.name).to.equal(seededCategory.name);
  };
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
  lab.test('should find a category by id', function(done) {
    runtime.categories.forEach(function(seededCategory) {
      core.categories.find(seededCategory.id).then(function(category) {
        expectations(seededCategory, category);
      });
    });
    done();
  });
});
