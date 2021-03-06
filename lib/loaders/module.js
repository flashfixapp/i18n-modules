const { validate } = require('schema-utils');
const merge = require('lodash/merge');
const pick = require('lodash/pick');
const without = require('lodash/without');

const {
  debug,

  rebase,
  getOptions: getPluginOptions,

  getModuleId,
  createModule,
} = require('../utils');

const properties = pick(require('../schema').properties, 'keysRoot', 'moduleEnding', 'getId');

const schema = {
  properties,
  type: 'object',
  required: without(Object.keys(properties), 'getId'),
  additionalProperties: false,
};

const updateTree = (node, prefix) => (
  Object.keys(node).reduce((acc, key) => {
    const value = node[key];
    const keyPath = `${prefix}.${key}`;

    acc[key] = typeof value === 'string' ? keyPath : updateTree(value, keyPath);
    return acc;
  }, {})
);

const loader = function(source) {
  const options = pick(getPluginOptions(this.getOptions()), ...Object.keys(schema.properties));
  validate(schema, options, { name: 'I18nModules module loader' });

  const { moduleEnding } = options;
  const keysRoot = rebase(this._compiler.context, options.keysRoot);
  const getId = options.getId || getModuleId;

  const id = getId(keysRoot, moduleEnding, this.resourcePath);
  const data = createModule(source);
  const tree = merge({}, ...Object.keys(data).map((language) => data[language]));
  const result = updateTree(tree, id);

  debug('remapped keys for module %s', this.resourcePath);
  return JSON.stringify(result);
};

module.exports = loader;
