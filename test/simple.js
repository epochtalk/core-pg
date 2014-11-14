var path = require('path');
var pg = require('pg');
var core = require(path.join('..'));
var config = require(path.join(__dirname, '..', 'config'));
var recreateSchema = require(path.join(__dirname, '..', 'schema', 'recreate'));

function createAndFind() {
  return c.users.create({
    email: 'asdf@asdf.com',
    username: 'asdf1234',
    password: 'asdf1234'
  })
  .then(function(user) {
    console.log(user.id);
    c.users.find(user.id).then(function(user) {
      console.log('found user');
      console.log(user);
    });
    return user;
  })
  .catch(function(err) {
    console.log('error');
    console.log(err);
  });
}

recreateSchema(function() {
  c = core();
  console.log('Configuration:');
  console.log(config);
  createAndFind().then(function(user) {
    pg.end();
  });
});
