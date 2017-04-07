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
  IntegrityContraintViolationError: errorTemplate('IntegrityContraintViolationError'),
  RestrictViolationError: errorTemplate('RestrictViolationError'),
  NotNullViolationError: errorTemplate('NotNullViolationError'),
  ForeignKeyViolationError: errorTemplate('ForeignKeyViolationError'),
  UniqueViolationError: errorTemplate('UniqueViolationError'),
  CheckViolationError: errorTemplate('CheckViolationError'),
  ExclusionViolationError: errorTemplate('ExclusionViolationError'),
  handlePgError: handlePgError
};

function handlePgError(e) {
  var error;
  switch (e.code.toString()) {
    case '23000':
      error = new errors.IntegrityContraintViolationError(e.detail);
      break;
    case '23001':
      error = new errors.RestrictViolationError(e.detail);
      break;
    case '23502':
      error = new errors.NotNullViolationError(e.detail);
      break;
    case '23503':
      error = new errors.ForeignKeyViolationError(e.detail);
      break;
    case '23505':
      error = new errors.UniqueViolationError(e.detail);
      break;
    case '23514':
      error = new errors.CheckViolationError(e.detail);
      break;
    case '23P01':
      error = new errors.ExclusionViolationError(e.detail);
      break;
    default:
      error = e;
  }

  throw error;
}

module.exports = errors;
