module.exports = loadSchema;
var exec = require('child_process').exec;
var path = require('path');
function loadSchema(cb) {
  exec(path.join(__dirname, 'recreate_db.sh'),
  function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
      process.exit(1);
    }
    if (stderr) {
      console.log('stderr: ' + stderr);
      process.exit(1);
    }

    if (stdout) {
      console.log(stdout);
      return cb();
    }
    else {
      process.exit(1);
    }
  });
}
