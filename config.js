var config = {
  cstring: process.env.DATABASE_URL || 'postgres://localhost/epoch_dev'
};
config.update = function(opts) {
  for(var k in opts) config[k] = opts[k];
};
module.exports = config;
