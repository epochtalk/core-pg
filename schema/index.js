var path = require('path');
var recreate = require(path.join(__dirname, 'recreate'));
module.exports = {
  recreate: function() {
    recreate().then(console.log);
  }
};
