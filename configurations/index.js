var configurations = {};
module.exports = configurations;

var path = require('path');
var bcrypt = require('bcrypt');
var Promise = require('bluebird');
var db = require(path.normalize(__dirname + '/../db'));
var NotFoundError = Promise.OperationalError;
var CreationError = Promise.OperationalError;
var using = Promise.using;
var _ = require('lodash');
var flat = require('flat');
var changeCase = require('change-case');
var renameKeys = require('deep-rename-keys');

/* returns object of public configurations */
configurations.getPublic = function() {
  var q = 'SELECT "website.title", "website.description", "website.keywords", "website.logo", "website.favicon" FROM configurations';
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
  var q = 'SELECT * FROM configurations';
  return db.sqlQuery(q)
  .then(function(queryResults) {
    var privateConfigurations = flat.unflatten(queryResults[0]);

    if (_.isObject(privateConfigurations)) {
      privateConfigurations = renameKeys(privateConfigurations, function(key) {
        return changeCase.camel(key);
      });
    }
    return privateConfigurations;
  });
};

// updates configurations from an object
configurations.update = function(options) {
  var identifiers = [];
  var params = [];
  if (options.logEnabled != undefined) {
    identifiers.push('"log_enabled"');
    params.push(options.logEnabled);
  }
  if (options.privateKey != undefined) {
    identifiers.push('"private_key"');
    params.push(options.privateKey);
  }
  if (options.verifyRegistration != undefined) {
    identifiers.push('"verify_registration"');
    params.push(options.verifyRegistration);
  }
  if (options.loginRequired != undefined) {
    identifiers.push('"login_required"');
    params.push(options.loginRequired);
  }
  if (options.website != undefined) {
    var website = options.website;
    if (website.title != undefined) {
      identifiers.push('"website.title"');
      params.push(website.title);
    }
    if (website.description != undefined) {
      identifiers.push('"website.description"');
      params.push(website.description);
    }
    if (website.keywords != undefined) {
      identifiers.push('"website.keywords"');
      params.push(website.keywords);
    }
    if (website.logo != undefined) {
      identifiers.push('"website.logo"');
      params.push(website.logo);
    }
    if (website.favicon != undefined) {
      identifiers.push('"website.favicon"');
      params.push(website.favicon);
    }
  }
  if (options.emailer != undefined) {
    var emailer = options.emailer;
    if (emailer.sender != undefined) {
      identifiers.push('"emailer.sender"');
      params.push(emailer.sender);
    }
    if (emailer.host != undefined) {
      identifiers.push('"emailer.host"');
      params.push(emailer.host);
    }
    if (emailer.port != undefined) {
      identifiers.push('"emailer.port"');
      params.push(emailer.port);
    }
    if (emailer.user != undefined) {
      identifiers.push('"emailer.user"');
      params.push(emailer.user);
    }
    if (emailer.pass != undefined) {
      identifiers.push('"emailer.pass"');
      params.push(emailer.pass);
    }
    if (emailer.secure != undefined) {
      identifiers.push('"emailer.secure"');
      params.push(emailer.secure);
    }
  }
  if (options.images != undefined) {
    var images = options.images;
    if (images.storage != undefined) {
      identifiers.push('"images.storage"');
      params.push(images.storage);
    }
    if (images.maxSize != undefined) {
      identifiers.push('"images.max_size"');
      params.push(images.maxSize);
    }
    if (images.expiration != undefined) {
      identifiers.push('"images.expiration"');
      params.push(images.expiration);
    }
    if (images.interval != undefined) {
      identifiers.push('"images.interval"');
      params.push(images.interval);
    }
    if (images.local != undefined) {
      var local = images.local;
      if (local.dir != undefined) {
        identifiers.push('"images.local_dir"');
        params.push(local.dir);
      }
      if (local.path != undefined) {
        identifiers.push('"images.local_path"');
        params.push(local.path);
      }
    }
    if (images.s3 != undefined) {
      var s3 = images.s3;
      if (s3.root != undefined) {
        identifiers.push('"images.s3.root"');
        params.push(s3.root);
      }
      if (s3.dir != undefined) {
        identifiers.push('"images.s3.dir"');
        params.push(s3.dir);
      }
      if (s3.bucket != undefined) {
        identifiers.push('"images.s3.bucket"');
        params.push(s3.bucket);
      }
      if (s3.region != undefined) {
        identifiers.push('"images.s3.region"');
        params.push(s3.region);
      }
      if (s3.accessKey != undefined) {
        identifiers.push('"images.s3.access_key"');
        params.push(s3.accessKey);
      }
      if (s3.secretKey != undefined) {
        identifiers.push('"images.s3.secret_key"');
        params.push(s3.secretKey);
      }
    }
  }
  var dollars = [];
  for (var i = 1 ; i <= identifiers.length ; i++) {
    dollars.push('$' + i);
  }
  var identifiersString = '(' + identifiers.toString() + ')';
  var dollarsString = '(' + dollars.toString() + ')';
  var query = 'UPDATE configurations SET ' + identifiersString + ' = ' + dollarsString + ';';

  return db.sqlQuery(query, params);
};
