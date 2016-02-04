var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var db = require(path.join(__dirname, 'db'));
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixture = require(path.join(__dirname, 'fixtures', 'notifications'));
var NotFoundError = Promise.OperationalError;

lab.experiment('Notifications', function() {
  var runtime;
  // var expectations = function(seededThread, thread) {
  //   expect(thread).to.exist;
  //   expect(thread.board_id).to.equal(seededThread.board_id);
  // };
  lab.before({timeout: 5000}, function(done) {
    return seed(fixture)
    .then(function(results) {
      runtime = results;
    })
    .then(function() {
      done();
    });
  });
  lab.test('should return notifications for a user', function(done) {
    Promise.map(runtime.users, function(user) {
      return db.notifications.latest(user.id)
      .then(function(notifications) {
        expect(notifications).to.exist;
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should return default paged notifications for a user', function(done) {
    Promise.resolve(runtime.users[0]).then(function(user) {
      // this is the default paging limit
      return db.notifications.latest(user.id)
      .then(function(notifications) {
        expect(notifications).to.exist;
        expect(notifications).to.have.length(15);
      })
      .then(function() {
        // this is the first page of notifications
        return db.notifications.latest(user.id, { page: 1 });
      })
      .then(function(notifications) {
        expect(notifications).to.exist;
        expect(notifications).to.have.length(15);
      })
      .then(function() {
        // this is the second page of notifications
        return db.notifications.latest(user.id, { page: 2 });
      })
      .then(function(notifications) {
        expect(notifications).to.exist;
        expect(notifications).to.have.length(3);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should not return notifications for a user for empty page', function(done) {
    Promise.resolve(runtime.users[0]).then(function(user) {
      // this is the default paging limit
      return db.notifications.latest(user.id, { page: 3 })
      .then(function(notifications) {
        expect(notifications).to.not.exist;
        expect(notifications).to.have.length(0);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should return limited paged notifications for a user', function(done) {
    Promise.resolve(runtime.users[0]).then(function(user) {
      // this is the default paging limit
      return db.notifications.latest(user.id, { limit: 1 })
      .then(function(notifications) {
        expect(notifications).to.exist;
        expect(notifications).to.have.length(1);
      })
      .then(function() {
        return db.notifications.latest(user.id, { limit: 10, page: 2 });
      })
      .then(function(notifications) {
        expect(notifications).to.exist;
        expect(notifications).to.have.length(8);
      })
      .then(function() {
        return db.notifications.latest(user.id, { limit: 20 });
      })
      .then(function(notifications) {
        expect(notifications).to.exist;
        expect(notifications).to.have.length(18);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should not return notifications for empty limited page', function(done) {
    Promise.resolve(runtime.users[0]).then(function(user) {
      // this is the default paging limit
      return db.notifications.latest(user.id, { limit: 20, page: 2 })
      .then(function(notifications) {
        expect(notifications).to.not.exist;
        expect(notifications).to.have.length(0);
      })
      .then(function() {
        return db.notifications.latest(user.id, { limit: 1, page: 19 });
      })
      .then(function(notifications) {
        expect(notifications).to.not.exist;
        expect(notifications).to.have.length(0);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should return user notifications count', function(done) {
    Promise.resolve(runtime.users[0]).then(function(user) {
      return db.notifications.count(user.id)
      .then(function(count) {
        expect(count).to.exist;
        expect(count).to.equal(11);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      return runtime.users[1];
    })
    .then(function(user) {
      return db.notifications.count(user.id)
      .then(function(count) {
        expect(count).to.exist;
        expect(count).to.equal(11);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      return runtime.users[2];
    })
    .then(function(user) {
      return db.notifications.count(user.id)
      .then(function(count) {
        expect(count).to.exist;
        expect(count).to.equal(3);
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
