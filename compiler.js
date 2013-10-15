var Parser = require('calypso').Parser;

var UsergridCompiler = module.exports = function(cache) {
  this.fields = [];
  this.sorts = '';
  this.filter = [];
  this.params = {};
  this.modelFieldMap = null;
  this.cache = cache || {};
};

UsergridCompiler.prototype.visit = function(node) {
  this['visit' + node.type](node);
};

UsergridCompiler.prototype.compile = function(options) {
  this.modelFieldMap = options.query.modelConfig.fieldMap;
  var query = options.query.build();
  
  if (query.type === 'ast') {
    query.value.accept(this);
  } else if (query.type === 'ql') {
    var ql = query.value.ql;

    var ast;
    if (this.cache.hasOwnProperty(ql)) {
      ast = this.cache[ql];
    } else {
      ast = Parser.parse(query.value.ql);
      this.cache[ql] = ast;
    }

    this.params = query.value.params;
    ast.accept(this);
  } else if (query.type === 'raw') {
    return query.value;
  }

  var fieldMap = {};
  var fields = [];
  var hasFields = false;
  var hasFieldMap = false;
  
  this.fields.forEach(function(field) {
    if (field.name) {
      fields.push(field.name);
      hasFields = true;
      if (field.alias) {
        fieldMap[field.name] = field.alias;
        hasFieldMap = true;
      }
    }
  });

  if (fields.length === 0) {
    fields.push('*');
  }

  var statement = 'select ' + fields.join(', ');

  if (this.filter.length) {
    statement += ' where ' + this.filter.join(' ');
  }

  if (this.sorts) {
    statement += ' order by ' + this.sorts;
  }

  return {
    ql: statement,
    fields: hasFields ? fields : null,
    fieldMap: hasFieldMap ? fieldMap : null
  };
};

UsergridCompiler.prototype.visitSelectStatement = function(statement) {
  if (!statement.fieldListNode.fields.length) {
    statement.fieldListNode.push('*');
  }

  statement.fieldListNode.accept(this);

  if (statement.filterNode) {
    statement.filterNode.accept(this);
  }
  if (statement.orderByNode) {
    statement.orderByNode.accept(this);
  }
};

UsergridCompiler.prototype.visitFieldList = function(fieldList) {
  this.fields = fieldList.fields;
};

UsergridCompiler.prototype.visitFilter = function(filterList) {
  filterList.expression.accept(this);
};

UsergridCompiler.prototype.visitOrderBy = function(orderBy) {
  this.sorts = orderBy.sortList.sorts.map(function(sort) {
    var str = sort.field;
    if (sort.direction) {
      str += ' ' + sort.direction;
    }

    return str;
  }).join(' ');
};

UsergridCompiler.prototype.visitLocationPredicate = function(location) {
  if (location.operator !== 'within') {
    return;
  }

  if (location.isNegated) {
    this.filter.push('not');
  }

  this.filter.push('location within');
  this.filter.push(location.value.distance);
  this.filter.push('of');
  this.filter.push(location.value.coordinates.lattitude + ',');
  this.filter.push(location.value.coordinates.longitude);
};

UsergridCompiler.prototype.visitConjunction = function(conjunction) {
  if (conjunction.isNegated) {
    this.filter.push('not');
  }
  this.filter.push('(');
  conjunction.left.accept(this);
  this.filter.push('and');
  conjunction.right.accept(this);
  this.filter.push(')');
};

UsergridCompiler.prototype.visitDisjunction = function(disjunction) {
  if (disjunction.isNegated) {
    this.filter.push('not');
  }
  this.filter.push('(');
  disjunction.left.accept(this);
  this.filter.push('or');
  disjunction.right.accept(this);
  this.filter.push(')');
};

UsergridCompiler.prototype.visitLikePredicate = function(like) {
  var isParam = false;

  if (this.modelFieldMap[like.field]) {
    like.field = this.modelFieldMap[like.field];
  }

  if (typeof like.value === 'string'
      && like.value[0] === '@' && this.params) {
    like.value = this.params[like.value.substring(1)];
    isParam = true;
  }

  if (typeof like.value === 'string') {
    like.value = normalizeString(like.value, isParam);
  }

  var expr = [like.field, 'contains', like.value];

  this.filter.push(expr.join(' '));
};

UsergridCompiler.prototype.visitContainsPredicate = function(contains) {
  var isParam = false;

  if (this.modelFieldMap[contains.field]) {
    contains.field = this.modelFieldMap[contains.field];
  }

  if (typeof contains.value === 'string'
      && contains.value[0] === '@' && this.params) {
    contains.value = this.params[contains.value.substring(1)];
    isParam = true;
  }

  if (typeof contains.value === 'string') {
    contains.value = normalizeString(contains.value, isParam);
  }

  var expr = [contains.field, 'contains', contains.value];

  this.filter.push(expr.join(' '));
};

UsergridCompiler.prototype.visitComparisonPredicate = function(comparison) {
  if (!comparison.array) comparison.array = [];

  if (this.modelFieldMap[comparison.field]) {
    comparison.field = this.modelFieldMap[comparison.field];
  }

  var isParam = false;
  if (typeof comparison.value === 'string'
      && comparison.value[0] === '@' && this.params) {
    comparison.value = this.params[comparison.value.substring(1)];
    isParam = true;
  }

  if (typeof comparison.value === 'string') {
    comparison.value = normalizeString(comparison.value, isParam);
  }

  var expr = [comparison.field, comparison.operator, comparison.value];
  if (comparison.isNegated) {
    expr.unshift('not');
  }
  comparison.array.push(expr.join(' '));
  this.filter.push(expr.join(' '));
};

var normalizeString = function(str, isParam) {
  if (str[0] === '\'' && str[str.length - 1] === '\'') {
    return str;
  }

  if (!isParam && str[0] === '"' && str[str.length - 1] === '"') {
    str = str.substring(1, str.length - 1);
  }

  str = JSON.stringify(str);

  str = str.substring(1, str.length - 1);
  str = str.replace("'", "\\'");
  str = str.replace('\\"', '"');

  str = "'" + str + "'";

  return str;
};
