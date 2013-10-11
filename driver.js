var Session = require('./session');

var UsergridDriver = module.exports = function(options) {
  this.options = options;
};

UsergridDriver.prototype.createSession = function(config) {
  return Session.create(this.options, config);
};

UsergridDriver.create = function(options) {
  return new UsergridDriver(options);
};
