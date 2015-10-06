var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))({host: 'localhost', database: 'epoch_test'});
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixture = require(path.join(__dirname, 'fixtures', 'posts'));
var NotFoundError = Promise.OperationalError;

lab.experiment('Posts', function() {
  var runtime;
  var expectations = function(seededPost, post) {
    expect(post).to.exist;
    expect(post.thread_id).to.equal(seededPost.thread_id);
    expect(post.id).to.equal(seededPost.id);
  };
  lab.before({timeout: 5000}, function(done) {
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
  lab.test('should fail to find a post by invalid id', function(done) {
    return core.posts.find()
    .then(function(post) {
      throw new Error('Should not have found a post');
    })
    .catch(function(err) {
      expect(err).to.be.an.instanceof(NotFoundError);
      expect(err.cause).to.be.a.string().and.to.equal('Post Not Found');
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
  lab.test('should not find posts by thread', function(done) {
    return core.posts.byThread(runtime.threads[10].id)
    .then(function(posts) {
      expect(posts).to.be.an.array();
      expect(posts).to.have.length(0);
    })
    .catch(function() {
      throw err;
    })
    .then(function() {
      done();
    });
  });
  lab.test('should return no posts for an invalid thread', function(done) {
    return core.posts.byThread()
    .then(function(posts) {
      expect(posts).to.be.an.array();
      expect(posts).to.have.length(0);
    })
    .catch(function(err) {
      throw err;
    })
    .then(function() {
      done();
    });
  });
  lab.test('should increment thread\'s post count', function(done) {
    return Promise.map(runtime.threads.slice(0, 9), function(seededThread) {
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
  lab.test('should update boards\' posts counts', function(done) {
    Promise.map(runtime.posts, function(seededPost) {
      return core.posts.find(seededPost.id)
      .then(function(post) {
        return core.threads.find(post.thread_id);
      })
      .then(function(thread) {
        return core.boards.find(thread.board_id);
      })
      .then(function(board) {
        expect(board.post_count).to.equal(3);
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
