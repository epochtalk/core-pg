var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))({host: 'localhost', database: 'epoch_test'});
var core = require(path.join(__dirname, '..'))();
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixture = require(path.join(__dirname, 'fixtures', 'posts'));

lab.experiment('Posts', function() {
  var runtime;
  var expectations = function(seededPost, post) {
    expect(post).to.exist;
    expect(post.thread_id).to.equal(seededPost.thread_id);
    expect(post.id).to.equal(seededPost.id);
  };
  lab.before(function(done) {
    return seed(fixture)
    .then(function(results) {
      runtime = results;
    })
    .then(function() {
      done();
    });
  });
  lab.test('should find a post by id', function(done) {
    Promise.map(runtime.posts, function(seededPost) {
      return core.posts.find(seededPost.id)
      .then(function(post) {
        expectations(seededPost, post);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should find posts by thread', function(done) {
    return Promise.map(runtime.posts, function(seededPost) {
      return core.posts.byThread(seededPost.thread_id)
      .then(function(posts) {
        expect(posts.length).to.equal(1);
        expectations(seededPost, posts[0]);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should increment thread\'s post count', function(done) {
    return Promise.map(runtime.threads, function(seededThread) {
      return core.threads.find(seededThread.id)
      .then(function(thread) {
        expect(thread.post_count).to.equal(1);
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
