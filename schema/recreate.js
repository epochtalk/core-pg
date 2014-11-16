module.exports = recreate;
var exec = require('child_process').exec;
var path = require('path');
var Promise = require('bluebird');

function recreate(cb) {
  return new Promise(function(fulfill, reject) {
    exec(path.join(__dirname, '..', 'recreate_db.sh'),
    function (error, stdout, stderr) {
      if (error !== null) reject(error);
      else if (stderr) reject(stderr);
      else if (stdout) fulfill(stdout);
      else reject(new Error('Unable to recreate database'));
    });
  });
}
