var config = require('./config');

module.exports = function(opts) {
  if (opts.conString) {
    config.conString = opts.conString;
  }
  else {
    throw new Error('No database connection string!');
  }
};
