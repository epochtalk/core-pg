var path = require('path');
var pg = require('pg');
var core = require(path.join('..'));
var config = require(path.join(__dirname, '..', 'config'));
var recreateSchema = require(path.join(__dirname, '..', 'schema', 'recreate'));

recreateSchema(function() {
  c = core();
  console.log('Configuration:');
  console.log(config);
  c.users.create({
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
    // c.users.all().then(function(results) {
    //   console.log(results);
    //   pg.end();
    // });
    pg.end();
  })
  .catch(function(err) {
    console.log('error');
    console.log(err);
  });

  c.users.create({
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
    // c.users.all().then(function(results) {
    //   console.log(results);
    //   pg.end();
    // });
    pg.end();
  })
  .catch(function(err) {
    console.log('error');
    console.log(err);
  });

});
