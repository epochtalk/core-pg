module.exports = {
  intToUUID: function(id) {
    var hex = id.toString(16);
    var zeros = '00000000-0000-0000-0000-000000000000';
    var start = 36 - hex.length;
    return zeros.substring(0, start) + hex;
  }
};
