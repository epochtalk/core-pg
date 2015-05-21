var _ = require('lodash');
var slugid = require('slugid');
var slugKeywords = [
  'id',
  'board_id',
  'thread_id',
  'user_id',
  'parent_board_id',
  'category_id',
  'children_ids',
  'last_thread_id',
  'reporter_user_id',
  'reviewer_user_id',
  'offender_user_id',
  'offender_post_id',
  'offender_thread_id',
  'report_id',
  'status_id'
];

module.exports = {
  intToUUID: function(id) {
    var hex = id.toString(16);
    var zeros = '00000000-0000-0000-0000-000000000000';
    var start = 36 - hex.length;
    return zeros.substring(0, start) + hex;
  },
  slugify: function(input) {
    return slugTransform(input, slugid.encode);
  },
  deslugify: function(input) {
    return slugTransform(input, slugid.decode);
  }
};


function slugTransform(input, slugMethod) {
  // concat everything into an array
  var isArray = false;
  if (_.isString(input)) {
    input = { isString: true, id: input };
  }
  if (_.isArray(input)) { isArray = true; }
  var inputs = [].concat(input);

  // (de)slugify each item in the array
  inputs.map(function(input) {
    // iterate over each object key
    _.keys(input).map(function(key) {
      if (!input[key]) { return input[key]; }

      // check if key is candidate for (de)slugification
      if (_.contains(slugKeywords, key)) {
        // (de)slugify
        input[key] = slugMethod(input[key]);
      }
      else if (_.isPlainObject(input[key]) || _.isArray(input[key])) {
        input[key] = slugTransform(input[key], slugMethod);
      }
    });
  });

  // return single object/String or entire array
  if (isArray) { return inputs; }
  else if (inputs.length === 1 && inputs[0].isString) { return inputs[0].id; }
  else if (inputs.length === 1) { return inputs[0]; }
  else { return inputs; }
}
