var Connection = require('./connection');

var UsergridDriver = module.exports = function(options) {
  this.options = options;
};

UsergridDriver.prototype.init = function(cb) {
  var connection = Connection.create(this.options);
  
  cb(null, connection);
};

UsergridDriver.create = function(options) {
  return new UsergridDriver(options);
};
