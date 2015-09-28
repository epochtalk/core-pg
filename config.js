var config = {};

config.update = function(opts) {
  if (opts.conString) {
    config.conString = opts.conString;
  }
};

module.exports = config;
