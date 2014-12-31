var path = require('path');
var recreate = require(path.join(__dirname, 'recreate'));
module.exports = {
  recreate: function(database) {
    recreate(database).then(console.log);
  }
};
