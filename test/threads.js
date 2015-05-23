var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))({host: 'localhost', database: 'epoch_test'});
var core = require(path.join(__dirname, '..'))();
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixture = require(path.join(__dirname, 'fixtures', 'threads'));
var NotFoundError = Promise.OperationalError;

lab.experiment('Threads', function() {
  var runtime;
  var expectations = function(seededThread, thread) {
    expect(thread).to.exist;
    expect(thread.board_id).to.equal(seededThread.board_id);
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
  lab.test('should find a thread by id', function(done) {
    Promise.map(runtime.threads, function(seededThread) {
      return core.threads.find(seededThread.id)
      .then(function(thread) {
        expectations(seededThread, thread);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should fail to find a thread by invalid id', function(done) {
    return core.threads.find()
    .then(function(thread) {
      throw new Error('Should not have found a thread');
    })
    .catch(function(err) {
      expect(err).to.be.an.instanceof(NotFoundError);
      expect(err.cause).to.be.a.string().and.to.equal('Thread not found');
      done();
    });
  });
  lab.test('should return threads for a board', function(done) {
    Promise.map(runtime.boards.slice(0, 3), function(parentBoard) {
      return core.threads.byBoard(parentBoard.id)
      .then(function(threads) {
        expect(threads).to.exist;
        expect(threads.length).to.equal(3);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should not return threads for a board', function(done) {
    Promise.map(runtime.boards.slice(3, 5), function(parentBoard) {
      return core.threads.byBoard(parentBoard.id)
      .then(function(threads) {
        expect(threads).to.be.an.array;
        expect(threads).to.have.length(0);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should return no threads for an invalid board', function(done) {
    return core.threads.byBoard()
    .then(function(threads) {
      expect(threads).to.be.an.array();
      expect(threads).to.have.length(0);
    })
    .catch(function(err) {
      throw err;
    })
    .then(function() {
      done();
    });
  });
  lab.test('should increment board\'s thread count', function(done) {
    return Promise.map(runtime.boards.slice(0, 3), function(seededBoard) {
      return core.boards.find(seededBoard.id)
      .then(function(board) {
        expect(board.thread_count).to.equal(3);
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should increment board\'s total thread count', function(done) {
    return core.boards.allCategories()
    .then(function(categories) {
      expect(categories).to.be.an.array();
      expect(categories[0].boards).to.have.length(3);
      return categories[0].boards;
    })
    .map(function(board) {
      expect(board.total_thread_count).to.be.a.number();
      if (board.id === runtime.boards[0].id) {
        expect(board.total_thread_count).to.equal(9);
      }
      else if (board.id === runtime.boards[1].id) {
        expect(board.total_thread_count).to.equal(6);
      }
      else {
        expect(board.total_thread_count).to.equal(3);
      }
    })
    .then(function() {
      done();
    })
    .catch(function(err) {
      throw err;
    });
  });
  lab.test('should increment its view count', function(done) {
    Promise.map(runtime.threads, function(seededThread) {
      return core.threads.incViewCount(seededThread.id)
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      return Promise.map(runtime.boards.slice(0, 3), function(parentBoard) {
        return core.threads.byBoard(parentBoard.id)
        .map(function(thread) {
          expect(thread.view_count).to.equal(1);
        })
        .catch(function(err) {
          throw err;
        });
      });
    })
    .then(function() {
      done();
    });
  });
});
