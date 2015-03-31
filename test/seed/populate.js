var Promise = require('bluebird');
var Bro = require('brototype').Bro;

module.exports = function(fixture) {
  var runtime = {};
  Object.keys(fixture.data).forEach(function(dataType) {
    runtime[dataType] = [];
  });
  return Promise.each(fixture.run, function(dataType) {
    return Promise.each(fixture.data[dataType], function(options) {
      Object.keys(options).forEach(function(field) {
        options[field] = Bro(runtime).iCanHaz(options[field]);
      });
      return fixture.methods[dataType](options).then(function(result) {
        runtime[dataType].push(result);
      });
    });
  })
  .then(function(results) {
    return runtime;
  });
};
