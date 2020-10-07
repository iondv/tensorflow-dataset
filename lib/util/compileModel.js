const ActionHandler = require('modules/registry/backend/ActionHandler');
const tensorflowLib = require('./tensorflowLib');
const importer = require('./modelImporter');

function compileModel(options) {
  this.init = function() {
    return Promise.resolve();
  }
  this._exec = async function(scope, req) {
    const itemId = req.params.id;
    const itemClass = req.params.class;

    const modelSnapshotItem = await options.dataRepo.getItem(itemClass, itemId);
    const namespace = modelSnapshotItem.classMeta.plain.namespace;
    const modelId = modelSnapshotItem.base.model;
    const modelClass = `${modelSnapshotItem.properties.model.meta.refClass}@${namespace}`;

    const modelItem = await options.dataRepo.getItem(modelClass, modelId);

    const model = {};
    model['type'] = modelItem.base.type;
    model['layers'] = await importer.getLayerConfiguration(modelItem, options.dataRepo);
    model['options'] = await importer.getCompilationOptions(modelItem, options.dataRepo);

    const compiledModel = await tensorflowLib.compileModel(model);
    compiledModel.summary();
    await tensorflowLib.saveModel(compiledModel, modelSnapshotItem, options.dataRepo);

    return true;
  }

}
compileModel.prototype = new ActionHandler();

module.exports = compileModel;
