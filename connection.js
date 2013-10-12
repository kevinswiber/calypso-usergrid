var Usergrid = require('usergrid');
var Session = require('./session');

var UsergridConnection = module.exports = function(options) {
  this.client = new Usergrid.client(options);
};

UsergridConnection.prototype.open = function(cb) {
  var session = Session.create(this.client);
  cb(null, session);
};

UsergridConnection.create = function(options, cb) {
  var connection = new UsergridConnection(options);
  return connection;
};
