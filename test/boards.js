var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))({host: 'localhost', database: 'epoch_test'});
var seed = require(path.join(__dirname, 'seed', 'populate'));
var fixture = require(path.join(__dirname, 'fixtures', 'boards'));

lab.experiment('Boards', function() {
  var runtime;
  var expectations = function(seededBoard, board) {
    expect(board).to.exist;
    expect(board.name).to.equal(seededBoard.name);
    expect(board.description).to.equal(seededBoard.description);
    expect(board.id).to.equal(seededBoard.id);
  };
  lab.before(function(done) {
    return seed(fixture)
    .then(function(results) {
      runtime = results;
      done();
    });
  });
  lab.test('should return all boards', function(done) {
    core.boards.all()
    .then(function(boards) {
      expect(boards).to.exist;
      expect(boards.length).to.equal(runtime.boards.length);
      done();
    });
  });
  lab.test('should find a board by id', function(done) {
    runtime.boards.forEach(function(seededBoard) {
      core.boards.find(seededBoard.id)
      .then(function(board) {
        expectations(seededBoard, board);
      });
    });
    done();
  });
  lab.test('should have children', function(done) {
    var seededBoard = runtime.boards[0];
    core.boards.find(seededBoard.id)
    .then(function(board) {
      expect(board.children_ids.length).to.equal(3);
    });
    done();
  });
  lab.test('should not have children', function(done) {
    var seededBoards = [
      runtime.boards[1],
      runtime.boards[2],
      runtime.boards[3],
      runtime.boards[4]
    ];
    seededBoards.forEach(function(seededBoard) {
      core.boards.find(seededBoard.id)
      .then(function(board) {
        expect(board.children_ids).to.not.exist;
      });
    });
    done();
  });
  lab.test('should have a parent', function(done) {
    var seededParentBoard = runtime.boards[0];
    var seededChildBoards = [
      runtime.boards[1],
      runtime.boards[2],
      runtime.boards[3]
    ];
    seededChildBoards.forEach(function(seededChildBoard) {
      core.boards.find(seededChildBoard.id)
      .then(function(board) {
        expect(board.parent_board_id).to.equal(seededParentBoard.id);
      });
    });
    done();
  });
  lab.test('should not have a parent', function(done) {
    var seededNonChildBoards = [
      runtime.boards[0],
      runtime.boards[4]
    ];
    seededNonChildBoards.forEach(function(seededNonChildBoard) {
      core.boards.find(seededNonChildBoard.id)
      .then(function(board) {
        expect(board.parent_board_id).to.not.exist;
      });
    });
    done();
  });
  lab.test('should belong to a category', function(done) {
    var seededBoards = [
      runtime.boards[0],
      runtime.boards[1],
      runtime.boards[2]
    ];
    seededBoards.forEach(function(seededBoard) {
      core.boards.find(seededBoard.id)
      .then(function(board) {
        expect(board.category_id).to.exist;
        expect(board.category_id).to.equal(seededBoard.category_id);
      });
    });
    done();
  });
  lab.test('should not belong to a category', function(done) {
    var seededBoards = [
      runtime.boards[3],
      runtime.boards[4]
    ];
    seededBoards.forEach(function(seededBoard) {
      core.boards.find(seededBoard.id)
      .then(function(board) {
        expect(board.category_id).to.not.exist;
      });
    });
    done();
  });
});
