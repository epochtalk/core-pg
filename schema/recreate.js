module.exports = recreate;
var exec = require('child_process').exec;
var path = require('path');
var Promise = require('bluebird');

function recreate(database) {
  return new Promise(function(fulfill, reject) {
    if (database) {
      database = ' ' + database;
    }
    else {
      database = '';
    }
    exec(path.join(__dirname, '..', 'recreate_db.sh') + database,
    function (error, stdout, stderr) {
      if (error !== null) reject(error);
      else if (stderr) reject(stderr);
      else if (stdout) fulfill(stdout);
      else reject(new Error('Unable to recreate database'));
    });
  });
}
