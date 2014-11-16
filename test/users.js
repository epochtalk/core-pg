var test = require('tape');
var path = require('path');
var pg = require('pg');
var core = require(path.join('..'));
var config = require(path.join(__dirname, '..', 'config'));
var recreateSchema = require(path.join(__dirname, '..', 'schema', 'recreate'));
c = core();

recreateSchema()
.then(function(stdout) {
  test('create and find', function(t) {
    c.users.create({
      email: 'asdf@asdf.com',
      username: 'asdf1234',
      password: 'asdf1234'
    })
    .then(function(user) {
      c.users.find(user.id).then(function(foundUser) {
        t.equals(user.id, foundUser.id, 'created/find id match');
        pg.end();
        t.end();
      });
      return user;
    })
    .catch(function(err) {
      t.fail.bind(t);
    });
  });
});
