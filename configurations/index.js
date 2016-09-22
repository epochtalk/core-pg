var configurations = {};
module.exports = configurations;

var _ = require('lodash');
var flat = require('flat');
var path = require('path');
var Promise = require('bluebird');
var changeCase = require('change-case');
var renameKeys = require('deep-rename-keys');
var db = require(path.normalize(__dirname + '/../db'));
var helper = require(path.normalize(__dirname + '/../helper'));
var NotFoundError = Promise.OperationalError;

configurations.create = function(options) {
  if (options.portal && options.portal.board_id) {
    options.portal.board_id = db.deslugify(options.portal.board_id);
  }

  var q = 'INSERT INTO configurations ("log_enabled", "verify_registration", "login_required", "ga_key", "website.title", "website.description", "website.keywords", "website.logo", "website.favicon", "emailer.sender", "emailer.host", "emailer.port", "emailer.secure", "images.storage", "images.max_size", "images.expiration", "images.interval", "images.local.dir", "images.local.path", "images.s_3.root", "images.s_3.dir", "images.s_3.bucket", "images.s_3.region", "rate_limiting.namespace", "rate_limiting.get.interval", "rate_limiting.get.max_in_interval", "rate_limiting.get.min_difference", "rate_limiting.post.interval", "rate_limiting.post.max_in_interval", "rate_limiting.post.min_difference", "rate_limiting.put.interval", "rate_limiting.put.max_in_interval", "rate_limiting.put.min_difference", "rate_limiting.delete.interval", "rate_limiting.delete.max_in_interval", "rate_limiting.delete.min_difference", "portal.enabled", "portal.board_id", "invite_only") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39)';
  var params = [
    options.logEnabled,
    options.verifyRegistration,
    options.loginRequired,
    options.gaKey,
    options.website.title,
    options.website.description,
    options.website.keywords,
    options.website.logo,
    options.website.favicon,
    options.emailer.sender,
    options.emailer.host,
    options.emailer.port,
    options.emailer.secure,
    options.images.storage,
    options.images.maxSize,
    options.images.expiration,
    options.images.interval,
    options.images.local.dir,
    options.images.local.path,
    options.images.s3.root,
    options.images.s3.dir,
    options.images.s3.bucket,
    options.images.s3.region,
    options.rateLimiting.namespace,
    options.rateLimiting.get.interval,
    options.rateLimiting.get.maxInInterval,
    options.rateLimiting.get.minDifference,
    options.rateLimiting.post.interval,
    options.rateLimiting.post.maxInInterval,
    options.rateLimiting.post.minDifference,
    options.rateLimiting.put.interval,
    options.rateLimiting.put.maxInInterval,
    options.rateLimiting.put.minDifference,
    options.rateLimiting.delete.interval,
    options.rateLimiting.delete.maxInInterval,
    options.rateLimiting.delete.minDifference,
    options.portal.enabled,
    options.portal.board_id,
    options.inviteOnly
  ];
  return db.sqlQuery(q, params);
};

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
    if (queryResults.length > 0) {
      var privateConfigurations = flat.unflatten(queryResults[0]);

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
configurations.update = function(options) {
  var identifiers = [];
  var params = [];
  if (options.logEnabled !== undefined) {
    identifiers.push('"log_enabled"');
    params.push(options.logEnabled);
  }
  if (options.verifyRegistration !== undefined) {
    identifiers.push('"verify_registration"');
    params.push(options.verifyRegistration);
  }
  if (options.loginRequired !== undefined) {
    identifiers.push('"login_required"');
    params.push(options.loginRequired);
  }
  if (options.gaKey !== undefined) {
    identifiers.push('"ga_key"');
    params.push(options.gaKey);
  }
  if (options.website !== undefined) {
    var website = options.website;
    if (website.title !== undefined) {
      identifiers.push('"website.title"');
      params.push(website.title);
    }
    if (website.description !== undefined) {
      identifiers.push('"website.description"');
      params.push(website.description);
    }
    if (website.keywords !== undefined) {
      identifiers.push('"website.keywords"');
      params.push(website.keywords);
    }
    if (website.logo !== undefined) {
      identifiers.push('"website.logo"');
      params.push(website.logo);
    }
    if (website.favicon !== undefined) {
      identifiers.push('"website.favicon"');
      params.push(website.favicon);
    }
  }
  if (options.emailer !== undefined) {
    var emailer = options.emailer;
    if (emailer.sender !== undefined) {
      identifiers.push('"emailer.sender"');
      params.push(emailer.sender);
    }
    if (emailer.host !== undefined) {
      identifiers.push('"emailer.host"');
      params.push(emailer.host);
    }
    if (emailer.port !== undefined) {
      identifiers.push('"emailer.port"');
      params.push(emailer.port);
    }
    if (emailer.secure !== undefined) {
      identifiers.push('"emailer.secure"');
      params.push(emailer.secure);
    }
  }
  if (options.images !== undefined) {
    var images = options.images;
    if (images.storage !== undefined) {
      identifiers.push('"images.storage"');
      params.push(images.storage);
    }
    if (images.maxSize !== undefined) {
      identifiers.push('"images.max_size"');
      params.push(images.maxSize);
    }
    if (images.expiration !== undefined) {
      identifiers.push('"images.expiration"');
      params.push(images.expiration);
    }
    if (images.interval !== undefined) {
      identifiers.push('"images.interval"');
      params.push(images.interval);
    }
    if (images.local !== undefined) {
      var local = images.local;
      if (local.dir !== undefined) {
        identifiers.push('"images.local.dir"');
        params.push(local.dir);
      }
      if (local.path !== undefined) {
        identifiers.push('"images.local.path"');
        params.push(local.path);
      }
    }
    if (images.s3 !== undefined) {
      var s3 = images.s3;
      if (s3.root !== undefined) {
        identifiers.push('"images.s_3.root"');
        params.push(s3.root);
      }
      if (s3.dir !== undefined) {
        identifiers.push('"images.s_3.dir"');
        params.push(s3.dir);
      }
      if (s3.bucket !== undefined) {
        identifiers.push('"images.s_3.bucket"');
        params.push(s3.bucket);
      }
      if (s3.region !== undefined) {
        identifiers.push('"images.s_3.region"');
        params.push(s3.region);
      }
    }
  }
  if (options.rateLimiting !== undefined) {
    var rateLimiting = options.rateLimiting;
    if (rateLimiting.namespace !== undefined) {
      identifiers.push('"rate_limiting.namespace"');
      params.push(rateLimiting.namespace);
    }
    if (rateLimiting.get !== undefined) {
      var get = rateLimiting.get;
      if (get.interval !== undefined) {
        identifiers.push('"rate_limiting.get.interval"');
        params.push(get.interval);
      }
      if (get.maxInInterval !== undefined) {
        identifiers.push('"rate_limiting.get.max_in_interval"');
        params.push(get.maxInInterval);
      }
      if (get.minDifference !== undefined) {
        identifiers.push('"rate_limiting.get.min_difference"');
        params.push(get.minDifference);
      }
    }
    if (rateLimiting.post !== undefined) {
      var post = rateLimiting.post;
      if (post.interval !== undefined) {
        identifiers.push('"rate_limiting.post.interval"');
        params.push(post.interval);
      }
      if (post.maxInInterval !== undefined) {
        identifiers.push('"rate_limiting.post.max_in_interval"');
        params.push(post.maxInInterval);
      }
      if (post.minDifference !== undefined) {
        identifiers.push('"rate_limiting.post.min_difference"');
        params.push(post.minDifference);
      }
    }
    if (rateLimiting.put !== undefined) {
      var put = rateLimiting.put;
      if (put.interval !== undefined) {
        identifiers.push('"rate_limiting.put.interval"');
        params.push(put.interval);
      }
      if (put.maxInInterval !== undefined) {
        identifiers.push('"rate_limiting.put.max_in_interval"');
        params.push(put.maxInInterval);
      }
      if (put.minDifference !== undefined) {
        identifiers.push('"rate_limiting.put.min_difference"');
        params.push(put.minDifference);
      }
    }
    if (rateLimiting.delete !== undefined) {
      var deleted = rateLimiting.delete;
      if (deleted.interval !== undefined) {
        identifiers.push('"rate_limiting.delete.interval"');
        params.push(deleted.interval);
      }
      if (deleted.maxInInterval !== undefined) {
        identifiers.push('"rate_limiting.delete.max_in_interval"');
        params.push(deleted.maxInInterval);
      }
      if (deleted.minDifference !== undefined) {
        identifiers.push('"rate_limiting.delete.min_difference"');
        params.push(deleted.minDifference);
      }
    }
  }
  if (options.portal !== undefined) {
    var portal = options.portal;
    if (portal.enabled) {
      identifiers.push('"portal.enabled"');
      params.push(portal.enabled);
    }
    else {
      identifiers.push('"portal.enabled"');
      params.push(false);
    }
    if (portal.boardId) {
      identifiers.push('"portal.board_id"');
      var board_id = helper.deslugify(portal.boardId);
      params.push(board_id);
    }
  }
  if (options.inviteOnly) {
    identifiers.push('invite_only');
    params.push(options.inviteOnly);
  }
  var dollars = [];
  for (var i = 1 ; i <= identifiers.length ; i++) { dollars.push('$' + i); }
  var identifiersString = '(' + identifiers.toString() + ')';
  var dollarsString = '(' + dollars.toString() + ')';
  var query = 'UPDATE configurations SET ' + identifiersString + ' = ' + dollarsString + ';';

  return db.sqlQuery(query, params);
};
