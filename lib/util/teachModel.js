const ActionHandler = require('modules/registry/backend/ActionHandler');
const tensorflowLib = require('./tensorflowLib');
const patternImporter = require('./patternImporter');

const ION_OBJECT_CLASS_NAME = 'object';
const IMPORT_BATCH_SIZE = 500;
const TRAINING_BATCH_SIZE = 100;
const EPOCHS = 10;

function teachModel(options) {
  this.init = function() {
    return Promise.resolve();
  }
  this._exec = async function(scope, req) {
    const itemId = req.params.id;
    const itemClass = req.params.class;
    let modelSnapshotItem = await options.dataRepo.getItem(itemClass, itemId);

    const objectClass = `${ION_OBJECT_CLASS_NAME}@${modelSnapshotItem.classMeta.plain.namespace}`;

    let importOffset = 0;

    let log = '';

    let trainingData = await patternImporter.gatherDataset(modelSnapshotItem, IMPORT_BATCH_SIZE, importOffset, objectClass, true, 100, options.dataRepo);
    if (trainingData.size === 0)
      throw new Error('There are no training patterns available for the chosen data types.')
    let importBatchNum = 1;
    new Promise(async (resolve) => {
      while (trainingData.size > 0) {
        log += `Importing data chunk number ${importBatchNum}...\n`;
        console.log(`Importing data chunk number ${importBatchNum}...`);
        const trainingResults = await tensorflowLib.teachModel(modelSnapshotItem, trainingData, EPOCHS);
        const trainedModel = trainingResults.model;
        const logs = trainingResults.log;
        log += logs;
        importBatchNum += 1;
        modelSnapshotItem = await tensorflowLib.saveModel(trainedModel, modelSnapshotItem, options.dataRepo);
        importOffset += trainingData.size*TRAINING_BATCH_SIZE;
        trainingData = await patternImporter.gatherDataset(modelSnapshotItem, IMPORT_BATCH_SIZE, importOffset, objectClass, true, TRAINING_BATCH_SIZE, options.dataRepo);
      }

      importOffset = 0;
      importBatchNum = 1;
      let testingData = await patternImporter.gatherDataset(modelSnapshotItem, IMPORT_BATCH_SIZE, importOffset, objectClass, false, TRAINING_BATCH_SIZE, options.dataRepo);
      while (testingData.size > 0) {
        log += `Importing data chunk number ${importBatchNum}...\n`;
        console.log(`Importing data chunk number ${importBatchNum}...`);
        const testResults = await tensorflowLib.testModel(modelSnapshotItem, testingData);
        importBatchNum += 1;
        log += testResults.log;
        log += `test accuracy: ${testResults.accuracy}\n`;
        log += `test loss: ${testResults.loss}\n`;
        console.log(testResults);
        importOffset += testingData.size*TRAINING_BATCH_SIZE;
        testingData = await patternImporter.gatherDataset(modelSnapshotItem, IMPORT_BATCH_SIZE, importOffset, objectClass, false, TRAINING_BATCH_SIZE, options.dataRepo);
      }

      await options.dataRepo.editItem(req.params.class, req.params.id, {
        logs: log
      });
      return true;
    });
    return true;
  }

}
teachModel.prototype = new ActionHandler();

module.exports = teachModel;
