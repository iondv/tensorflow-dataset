const ActionHandler = require('modules/registry/backend/ActionHandler');
const tensorflowLib = require('./tensorflowLib');
const importer = require('./patternImporter');

const ION_OBJECT_CLASS_NAME = 'object';

function teachModel(options) {
  this.init = function() {
    return Promise.resolve();
  }
  this._exec = async function(scope, req) {
    const itemId = req.params.id;
    const itemClass = req.params.class;

    const modelSnapshotItem = await options.dataRepo.getItem(itemClass, itemId);

    // await tensorflowLib.teachModel(modelFileUrl, [], 5, options.dataRepo);
    const objectClass = `${ION_OBJECT_CLASS_NAME}@${modelSnapshotItem.classMeta.plain.namespace}`;
    await importer.gatherDataset(modelSnapshotItem,100, 0, objectClass, false, options.dataRepo);

    return true;
  }

}
teachModel.prototype = new ActionHandler();

module.exports = teachModel;
