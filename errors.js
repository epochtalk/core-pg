var errorTemplate = function(name) {
  return function (message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = name;
    this.message = message;
    this.extra = extra;
  };
};

var errors = {
  NotFoundError: errorTemplate('NotFoundError'),
  CreationError: errorTemplate('CreationError')
};

module.exports = errors;
