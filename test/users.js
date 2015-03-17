var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))();
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixture = require(path.join(__dirname, 'fixtures', 'users'));

lab.experiment('Users', function() {
  var runtime;
  var expectations = function(seededUser, user) {
    expect(user).to.exist;
    expect(user.username).to.equal(seededUser.username);
    expect(user.email).to.equal(seededUser.email);
    expect(user.id).to.equal(seededUser.id);
  };
  lab.before(function(done) {
    return seed(fixture).then(function(results) {
      runtime = results;
      done();
    });
  });
  lab.test('should return all users', function(done) {
    core.users.all().then(function(users) {
      expect(users.length).to.equal(runtime.users.length);
      done();
    });
  });
  lab.test('should return a user by username', function(done) {
    runtime.users.forEach(function(seededUser) {
      core.users.userByUsername(seededUser.username).then(function(user) {
        expectations(seededUser, user);
      });
    });
    done();
  });
  lab.test('should return a user by email', function(done) {
    runtime.users.forEach(function(seededUser) {
      core.users.userByEmail(seededUser.email).then(function(user) {
        expectations(seededUser, user);
      });
    });
    done();
  });
});
