var SessionConfig = require('calypso').SessionConfig;
var Usergrid = require('usergrid');
var UsergridCompiler = require('./compiler');

var UsergridSession = module.exports = function(client) {
  this.client = client; 
};

function convertToModel(config, entity, isBare) {
  if (isBare) {
    obj = entity;
  } else {
    obj = Object.create(config.constructor.prototype);
    var keys = Object.keys(config.fieldMap);
    keys.forEach(function(key) {
      var prop = config.fieldMap[key] || key;
      obj[key] = entity[prop];
    });
  }

  return obj;
}

UsergridSession.prototype.find = function(query, cb) {
  var config = query.modelConfig;

  var ql;
  var fields;
  var fieldMap;
  if (query) {
    var compiler = new UsergridCompiler();
    var compiled = compiler.compile({ query: query });

    ql = compiled.ql;
    fields = compiled.fields;
    fieldMap = compiled.fieldMap;
  }

  var options = {
    method: 'GET',
    endpoint: config.collection,
    qs: { ql: ql }
  };

  this.client.request(options, function(err, response) {
    var entities = [];

    if (response.list) {
      var obj = {};
      response.list.forEach(function(values) {
        if (fields) {
          fields.forEach(function(field, i) {
            var f = fieldMap[field] || field;
            obj[f] = values[i];
          });
        } else {
          obj = values;
        }

        entities.push(convertToModel(config, obj, config.isBare));
      });
    } else if(response.entities) {
      response.entities.forEach(function(entity) {
        var obj = convertToModel(config, entity, config.isBare);
        
        entities.push(obj);
      });
    }

    cb(err, entities);
  });
};

UsergridSession.prototype.get = function(query, id, cb) {
  var config = query.modelConfig;

  var options = {
    method: 'GET',
    endpoint: config.collection + '/' + id
  };

  this.client.request(options, function(err, result) {
    var obj;

    if (!err && result.entities && result.entities.length) {
      obj = convertToModel(config, result.entities[0]);
    }

    cb(err, obj);
  });
};

UsergridSession.create = function(options) {
  var session = new UsergridSession(options);

  return session;
};
