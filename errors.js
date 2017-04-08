var _ = require('lodash');
var Promise = require('bluebird');

var errorTemplate = function(name) {
  return function (message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = name;
    this.message = message;
    this.extra = extra;
  };
};

var errors = {
  CreationError: errorTemplate('CreationError'),
  DeletionError: errorTemplate('DeletionError'),
  NotFoundError: errorTemplate('NotFoundError'),
  ConflictError: errorTemplate('ConflictError'),
  handlePgError: handlePgError
};

// map handled Postgres errors to our own custom error types
function handlePgError(pgError) {
  // Postgres error codes that we expect to handle
  var pgErrorMap = {
    '23000': errorTemplate('IntegrityContraintViolationError'),
    '23001': errorTemplate('RestrictViolationError'),
    '23502': errorTemplate('NotNullViolationError'),
    '23503': errorTemplate('ForeignKeyViolationError'),
    '23505': errorTemplate('UniqueViolationError'),
    '23514': errorTemplate('CheckViolationError'),
    '23P01': errorTemplate('ExclusionViolationError')
  };

  // map to the correct custom error or return a generic PostgresError
  var errorType = _.get(pgErrorMap, pgError.code, errorTemplate('PostgresError'));
  // initialize the error with details and code
  var error = new errorType(pgError.detail, pgError.code);
  throw error;
}

module.exports = errors;
