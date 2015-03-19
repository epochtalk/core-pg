var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))();
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixture = require(path.join(__dirname, 'fixtures', 'threads'));

lab.experiment('Threads', function() {
  var runtime;
  var expectations = function(seededThread, thread) {
    expect(thread).to.exist;
    expect(thread.board_id).to.equal(seededThread.board_id);
  };
  lab.before(function(done) {
    return seed(fixture).then(function(results) {
      runtime = results;
      done();
    });
  });
  lab.test('should find a thread by id', function(done) {
    runtime.threads.forEach(function(seededThread) {
      core.threads.find(seededThread.id).then(function(thread) {
        expectations(seededThread, thread);
      });
    });
    done();
  });
});
