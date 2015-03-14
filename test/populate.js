var Promise = require('bluebird');
var Bro = require('brototype').bro;

module.exports = function(configuration) {
  var runtime = {};
  // initialize runtime
  Object.keys(configuration.data).forEach(function(dataType) {
    runtime[dataType] = [];
  });
  return Promise.each(configuration.run, function(dataType) {
    return Promise.each(configuration.data[dataType], function(thing) {
      Object.keys(thing).forEach(function(option) {
        thing[option] = Bro(runtime).iCanHaz(thing[option]);
      });
      return configuration.methods[dataType](thing).then(function(result) {
        runtime[dataType].push(result);
      });
    });
  })
  .then(function(results) {
    return runtime;
  });
};
