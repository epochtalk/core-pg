var configurations = {};
module.exports = configurations;

var _ = require('lodash');
var path = require('path');
var changeCase = require('change-case');
var renameKeys = require('deep-rename-keys');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));
var errors = require(path.normalize(__dirname + '/../errors'));
var NotFoundError = errors.NotFoundError;

configurations.create = function(config) {
  if (config.portal && config.portal.board_id) {
    config.portal.board_id = db.deslugify(config.portal.board_id);
  }
  // For now we are hardcoding 'default' as the main config
  // In the future we can support swappable configs
  var q = 'INSERT INTO configurations (name, config) VALUES (\'default\', $1)';
  return db.sqlQuery(q, [config]);
};

/* returns object of public configurations */
configurations.getPublic = function() {
  var q = 'SELECT config->>\'website\' as website FROM configurations WHERE name = \'default\'';
  return db.scalar(q)
  .then(function(queryResults) {
    return queryResults.website;
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
  var query = 'UPDATE configurations SET config = $1 WHERE name = \'default\'';
  return db.sqlQuery(query, [config]);
};
