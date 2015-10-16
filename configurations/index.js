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

// returns object of private configurations
configurations.get = function() {
  var q = 'SELECT * FROM configurations';
  return db.sqlQuery(q)
  .then(function(publicConfigurations) {
    var row = publicConfigurations[0];
    return {
      logEnabled: row.log_enabled,
      privateKey: row.private_key,
      verifyRegistration: row.verify_registration,
      loginRequired: row.login_required,
      website: {
        title: row.website_title,
        description: row.website_description,
        keywords: row.website_keywords,
        logo: row.website_logo,
        favicon: row.website_favicon
      },
      emailer: {
        sender: row.emailer_sender,
        host: row.emailer_host,
        port: row.emailer_port,
        user: row.emailer_user,
        pass: row.emailer_pass,
        secure: row.emailer_secure
      },
      images: {
        storage: row.images_storage,
        maxSize: row.images_max_size,
        expiration: row.images_expiration,
        interval: row.images_interval,
        local: {
          dir: row.images_local_dir,
          path: row.images_local_path
        },
        s3: {
          root: row.images_s3_root,
          dir: row.images_s3_dir,
          bucket: row.images_s3_bucket,
          region: row.images_s3_region,
          accessKey: row.images_s3_access_key,
          secretKey: row.images_s3_secret_key
        }
      }
    };
  });
};
