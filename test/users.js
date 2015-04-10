var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))({host: 'localhost', database: 'epoch_test'});
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
    })
    .then(function() {
      done();
    });
  });
  lab.test('should not create a user with invalid parameters', function(done) {
    return core.users.create({})
    .then(function(user) {
      expect(user).to.not.exist();
      throw new Error('User creation should have failed');
    })
    .catch(function(err) {
      done();
    });
  });
  lab.test('should return all users', function(done) {
    core.users.all().then(function(users) {
      expect(users).to.be.an.array();
      expect(users).to.have.length(runtime.users.length);
    })
    .then(function() {
      done();
    });
  });
  lab.test('should return a user by username', function(done) {
    Promise.map(runtime.users, function(seededUser) {
      return core.users.userByUsername(seededUser.username).then(function(user) {
        expectations(seededUser, user);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should not return a user by invalid username', function(done) {
    return core.users.userByUsername().then(function(user) {
      expect(user).to.not.exist();
    })
    .then(function() {
      done();
    })
    .catch(function(err) {
      throw err;
    });
  });
  lab.test('should return a user by email', function(done) {
    Promise.map(runtime.users, function(seededUser) {
      return core.users.userByEmail(seededUser.email).then(function(user) {
        expectations(seededUser, user);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should not return a user by invalid email', function(done) {
    return core.users.userByEmail().then(function(user) {
      expect(user).to.be.undefined();
    })
    .then(function() {
      done();
    })
    .catch(function(err) {
      throw err;
    });
  });
  lab.test('should find a user by id', function(done) {
    Promise.map(runtime.users, function(seededUser) {
      return core.users.find(seededUser.id).then(function(user) {
        expectations(seededUser, user);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should not find a user by invalid id', function(done) {
    return core.users.find().then(function(user) {
      expect(user).to.not.exist();
    })
    .then(function() {
      done();
    })
    .catch(function(err) {
      throw err;
    });
  });
});
