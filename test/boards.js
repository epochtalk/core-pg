var path = require('path');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;
var Promise = require('bluebird');
var core = require(path.join(__dirname, '..'))();
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
    return seed(fixture).then(function(results) {
      runtime = results;
      done();
    });
  });
  lab.test('should return all boards', function(done) {
    core.boards.all().then(function(boards) {
      expect(boards.length).to.equal(runtime.boards.length);
      done();
    });
  });
  lab.test('should find a board by id', function(done) {
    runtime.boards.forEach(function(seededBoard) {
      core.boards.find(seededBoard.id).then(function(board) {
        expectations(seededBoard, board);
      });
    });
    done();
  });
});
