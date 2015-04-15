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
  lab.before(function(done) {
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
  lab.test('should not find a thread by invalid id', function(done) {
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
    var parentBoards = [
      runtime.boards[0],
      runtime.boards[1],
      runtime.boards[2]
    ];
    Promise.map(parentBoards, function(parentBoard) {
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
    var parentBoards = [
      runtime.boards[3],
      runtime.boards[4]
    ];
    Promise.map(parentBoards, function(parentBoard) {
      return core.threads.byBoard(parentBoard.id)
      .then(function(threads) {
        expect(threads).to.not.exist;
      })
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      done();
    });
  });
  lab.test('should increment board\'s thread count', function(done) {
    var parentBoards = [
      runtime.boards[0],
      runtime.boards[1],
      runtime.boards[2]
    ];
    return Promise.map(parentBoards, function(seededBoard) {
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
  lab.test('should increment its view count', function(done) {
    var parentBoards = [
      runtime.boards[0],
      runtime.boards[1],
      runtime.boards[2]
    ];
    Promise.map(runtime.threads, function(seededThread) {
      return core.threads.incViewCount(seededThread.id)
      .catch(function(err) {
        throw err;
      });
    })
    .then(function() {
      return Promise.map(parentBoards, function(parentBoard) {
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
