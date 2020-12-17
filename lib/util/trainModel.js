const ActionHandler = require('modules/registry/backend/ActionHandler');
const tensorflowLib = require('./tensorflowLib');
const patternImporter = require('./patternImporter');

const NODE_ENV = process.env.NODE_ENV || 'production';

const ION_OBJECT_CLASS_NAME = 'object';
const IMPORT_BATCH_SIZE = 500;
const DEMO_IMPORT_BATCH_SIZE = 10;
const DEMO_TRAINING_LIMIT = 30;

function trainModel(options, wfCallback = Promise.resolve) {
  this.init = function() {
    return Promise.resolve();
  }
  this._exec = async function(scope, req) {
    const itemId = req.params.id;
    const itemClass = req.params.class;
    let modelSnapshotItem = await options.dataRepo.getItem(itemClass, itemId);

    const objectClass = `${ION_OBJECT_CLASS_NAME}@${modelSnapshotItem.classMeta.plain.namespace}`;
    const trainingOptionsItem = await options.dataRepo.getItem(
      `trainingOptions@${modelSnapshotItem.classMeta.plain.namespace}`,
      modelSnapshotItem.base.trainingOptions
    );
    const trainingBatchSize = trainingOptionsItem.base.batchSize;
    const epochs = trainingOptionsItem.base.epochs;

    let importOffset = 0;

    let log = '';
    let stopping = false;

    let partialImportOffsets = {};
    let trainingData
    if (NODE_ENV === 'demo')
      trainingData = await patternImporter.gatherConsistentDataset(modelSnapshotItem, DEMO_IMPORT_BATCH_SIZE, partialImportOffsets, objectClass, true, trainingBatchSize, options.dataRepo);
    else
      trainingData = await patternImporter.gatherDataset(modelSnapshotItem, IMPORT_BATCH_SIZE, importOffset, objectClass, true, trainingBatchSize, options.dataRepo);

    let importedTotal = 0;

    if (trainingData.size === 0)
      throw new Error('There are no training patterns available for the chosen data types.');
    let importBatchNum = 1;
    new Promise(async (resolve) => {
      while ((!stopping) && (trainingData.size > 0)) {
        (await trainingData.toArray()).forEach(tensor => {
          importedTotal += (tensor.ys.size/modelSnapshotItem.base.typeLabels.length);
        });
        if ((NODE_ENV === 'demo') && (importedTotal > DEMO_TRAINING_LIMIT))
          break;
        log += `Fitting data chunk number ${importBatchNum}...\n`;
        console.log(`Fitting data chunk number ${importBatchNum}...`);
        const trainingResults = await tensorflowLib.trainModel(modelSnapshotItem, trainingData, epochs);
        const trainedModel = trainingResults.model;
        const logs = trainingResults.log;
        log += logs;
        importBatchNum += 1;
        modelSnapshotItem = await tensorflowLib.saveModel(trainedModel, modelSnapshotItem, options.dataRepo);
        importOffset += trainingData.size*trainingBatchSize;
        if (!stopping) {
          if (NODE_ENV === 'demo')
            trainingData = await patternImporter.gatherConsistentDataset(modelSnapshotItem, DEMO_IMPORT_BATCH_SIZE, partialImportOffsets, objectClass, true, trainingBatchSize, options.dataRepo);
          else
            trainingData = await patternImporter.gatherDataset(modelSnapshotItem, IMPORT_BATCH_SIZE, importOffset, objectClass, true, trainingBatchSize, options.dataRepo);
        }

        if (options.workflows) {
          const workflowStages = (await options.workflows.getStatus(modelSnapshotItem)).stages;
          const trainingWorkflow = workflowStages[`modelTraining@${modelSnapshotItem.classMeta.plain.namespace}`];
          if (trainingWorkflow && (trainingWorkflow.stage === 'stopping')) {
            stopping = true;
            log += 'stopping...';
            console.log('stopping...');
            break;
          }
        }
      }

      importOffset = 0;
      partialImportOffsets = {};
      importBatchNum = 1;
      let testingData;
      if (!stopping) {
        if (NODE_ENV === 'demo')
          testingData = await patternImporter.gatherConsistentDataset(modelSnapshotItem, DEMO_IMPORT_BATCH_SIZE, partialImportOffsets, objectClass, false, trainingBatchSize, options.dataRepo);
        else
          testingData = await patternImporter.gatherDataset(modelSnapshotItem, IMPORT_BATCH_SIZE, importOffset, objectClass, false, trainingBatchSize, options.dataRepo);
      }

      importedTotal = 0;

      while ((!stopping) && (testingData.size > 0)) {
        (await testingData.toArray()).forEach(tensor => {
          importedTotal += (tensor.ys.size/modelSnapshotItem.base.typeLabels.length);
        });
        if ((NODE_ENV === 'demo') && (importedTotal > DEMO_TRAINING_LIMIT))
          break;
        log += `Fitting data chunk number ${importBatchNum}...\n`;
        console.log(`Fitting data chunk number ${importBatchNum}...`);
        const testResults = await tensorflowLib.testModel(modelSnapshotItem, testingData);
        importBatchNum += 1;
        log += testResults.log;
        log += `test accuracy: ${testResults.accuracy}\n`;
        log += `test loss: ${testResults.loss}\n`;
        console.log(testResults);
        importOffset += testingData.size*trainingBatchSize;

        if (!stopping) {
          if (NODE_ENV === 'demo')
            testingData = await patternImporter.gatherConsistentDataset(modelSnapshotItem, DEMO_IMPORT_BATCH_SIZE, partialImportOffsets, objectClass, false, trainingBatchSize, options.dataRepo);
          else
            testingData = await patternImporter.gatherDataset(modelSnapshotItem, IMPORT_BATCH_SIZE, importOffset, objectClass, false, trainingBatchSize, options.dataRepo);
        }

        if (options.workflows) {
          const workflowStages = (await options.workflows.getStatus(modelSnapshotItem)).stages;
          const trainingWorkflow = workflowStages[`modelTraining@${modelSnapshotItem.classMeta.plain.namespace}`];
          if (trainingWorkflow && (trainingWorkflow.stage === 'stopping')) {
            stopping = true;
            log += 'stopping...';
            console.log('stopping...');
            break;
          }
        }
      }

      await options.dataRepo.editItem(req.params.class, req.params.id, {
        teachDate: new Date(),
        logs: log
      });
      wfCallback(modelSnapshotItem)
        .then(() => resolve(true));
    });
    return true;
  }

}
trainModel.prototype = new ActionHandler();

module.exports = trainModel;
