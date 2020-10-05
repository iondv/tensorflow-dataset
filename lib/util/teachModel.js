const ActionHandler = require('modules/registry/backend/ActionHandler');
const tensorflowLib = require('./tensorflowLib');

function teachModel(options) {
  this.init = function() {
    return Promise.resolve();
  }
  this._exec = async function(scope, req) {
    const itemId = req.params.id;
    const itemClass = req.params.class;

    const modelSnapshotItem = await options.dataRepo.getItem(itemClass, itemId);
    const namespace = modelSnapshotItem.classMeta.plain.namespace;
    const modelFile = modelSnapshotItem.files.modelFile;
    const modelFilePath = (await modelFile.getContents()).stream.path;
    const modelFileUrl = `file://${modelFilePath}`;

    // await tensorflowLib.teachModel(modelFileUrl, trainingData, 5);

    return true;
  }

}
teachModel.prototype = new ActionHandler();

module.exports = teachModel;
