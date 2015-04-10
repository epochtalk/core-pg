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
    })
    .then(function() {
      done();
    });
  });
  lab.test('should return all categories', function(done) {
    core.categories.all(function(categories) {
      expect(categories).to.be.an.array();
      expect(categories).to.have.length(runtime.categories.length);
    })
    .then(function() {
      done();
    });
  });
  lab.test('should find a category by id', function(done) {
    Promise.map(runtime.categories, function(seededCategory) {
      return core.categories.find(seededCategory.id).then(function(category) {
        expectations(seededCategory, category);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should not find a category by invalid id', function(done) {
    Promise.map(runtime.categories, function(seededCategory) {
      return core.categories.find().then(function(category) {
        expect(category).to.not.exist();
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
});
