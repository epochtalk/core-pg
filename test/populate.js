var Promise = require('bluebird');
var Bro = require('brototype').Bro;

module.exports = function(configuration) {
  var runtime = {};
  Object.keys(configuration.data).forEach(function(dataType) {
    runtime[dataType] = [];
  });
  return Promise.each(configuration.run, function(dataType) {
    return Promise.each(configuration.data[dataType], function(options) {
      Object.keys(options).forEach(function(field) {
        options[field] = Bro(runtime).iCanHaz(options[field]);
      });
      return configuration.methods[dataType](options).then(function(result) {
        runtime[dataType].push(result);
      });
    });
  })
  .then(function(results) {
    return runtime;
  });
};
