var _ = require('lodash');

var errorTemplate = function(name) {
  return function (message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = name;
    this.message = message;
    this.extra = extra;
  };
};

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

// map handled Postgres errors to our own custom error types
function handlePgError(error) {
  // If code is not present, error is not a pg error
  if (!error.code) { throw error; }

  // map to the correct custom error or return a generic PostgresError
  var ErrorType = _.get(pgErrorMap, error.code, errorTemplate('PostgresError'));
  // initialize the error with details and code
  var pgError = new ErrorType(error.detail, error.code);
  throw pgError;
}

var errors = {
  CreationError: errorTemplate('CreationError'),
  DeletionError: errorTemplate('DeletionError'),
  NotFoundError: errorTemplate('NotFoundError'), // 404
  ConflictError: errorTemplate('ConflictError'),
  handlePgError: handlePgError
};

module.exports = errors;
