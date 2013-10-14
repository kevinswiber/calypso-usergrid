var Usergrid = require('usergrid');
var Session = require('./session');

var UsergridConnection = module.exports = function(options) {
  this.client = new Usergrid.client(options);
  this.cache = {};
};

UsergridConnection.prototype.createSession = function() {
  return Session.create(this.client, this.cache);
};

UsergridConnection.prototype.close = function(cb) {
  if (cb) {
    process.nextTick(function() {
      cb();
    });
  }
};

UsergridConnection.create = function(options, cb) {
  var connection = new UsergridConnection(options);
  return connection;
};
