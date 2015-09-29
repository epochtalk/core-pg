var configurations = {};
module.exports = configurations;

var path = require('path');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var db = require(path.normalize(__dirname + '/../db'));
var NotFoundError = Promise.OperationalError;
var CreationError = Promise.OperationalError;
var using = Promise.using;

/* returns object of public configurations */
configurations.getPublic = function() {
  var q = 'SELECT website_title, website_description, website_keywords, website_logo, website_favicon FROM configurations';
  return db.sqlQuery(q)
  .then(function(publicConfigurations) {
    var row = publicConfigurations[0];
    return {
      title: row.website_title,
      description: row.website_description,
      keywords: row.website_keywords,
      logo: row.website_logo,
      favicon: row.website_favicon
    };
  });
};
