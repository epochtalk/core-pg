var configurations = {};
module.exports = configurations;

var _ = require('lodash');
var flat = require('flat');
var path = require('path');
var changeCase = require('change-case');
var renameKeys = require('deep-rename-keys');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));
var errors = require(path.normalize(__dirname + '/../errors'));
var NotFoundError = errors.NotFoundError;

configurations.create = function(options) {
  if (options.portal && options.portal.board_id) {
    options.portal.board_id = db.deslugify(options.portal.board_id);
  }

  var q = 'INSERT INTO configurations (name, config) VALUES (\'default\', $1)';
  return db.sqlQuery(q, [options]);
};

/* returns object of public configurations */
configurations.getPublic = function() {
  var q = 'SELECT configs ->> "website.title", configs ->> "website.description", configs ->> "website.keywords", configs ->> "website.logo", configs ->> "website.favicon" FROM configurations';
  return db.sqlQuery(q)
  .then(function(queryResults) {
    var publicConfigurations = flat.unflatten(queryResults[0]);

    if (_.isObject(publicConfigurations)) {
      publicConfigurations = renameKeys(publicConfigurations, function(key) {
        return changeCase.camel(key);
      });
    }
    return publicConfigurations.website;
  });
};

// returns object of private configurations
configurations.get = function() {
  var q = 'SELECT config FROM configurations WHERE name = \'default\'';
  return db.sqlQuery(q)
  .then(function(queryResults) {
    if (queryResults.length > 0) {
      var privateConfigurations = queryResults[0].config;

      if (_.isObject(privateConfigurations)) {
        privateConfigurations = renameKeys(privateConfigurations, function(key) {
          return changeCase.camel(key);
        });
      }

      // slugify
      privateConfigurations.portal.boardId = helper.slugify(privateConfigurations.portal.boardId);

      return privateConfigurations;
    }
    else { throw new NotFoundError('Configurations Not Found'); }
  });
};

// updates configurations from an object
configurations.update = function(config) {
  var query = 'UPDATE configurations SET config = $1';
  return db.sqlQuery(query, [config]);
};
