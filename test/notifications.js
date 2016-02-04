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
});
