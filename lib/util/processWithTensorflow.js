const ActionHandler = require('modules/registry/backend/ActionHandler');
const tensorflowLib = require('./tensorflowLib');

const imageOptions = {
  "labels": [
    "T-shirt/top",
    "Trouser",
    "Pullover",
    "Dress",
    "Coat",
    "Sandal",
    "Shirt",
    "Sneaker",
    "Bag",
    "Ankle boot"
  ],
  imageWidth: 28,
  imageHeight: 28,
  imageChannels: 1
}

function processWithTensorflow(options) {
  this.init = function() {
    return Promise.resolve();
  }
  this._exec = function(scope, req) {
    const itemClass = req.params.class;
    const itemId = req.params.id;
    return new Promise((resolve, reject) => {
      processObject(itemClass, itemId, options.dataRepo)
        .catch(err => reject(err))
        .then((prediction) => {
          options.dataRepo.editItem(itemClass, itemId, {
            prediction: prediction.predictionScore * 100,
            log: prediction.log,
            recognizedType: `fashion-mnist${prediction.typeCode}`
          })
            .catch(err => reject(err))
            .then(() => resolve(true));
        });
    });
  }

  function getObjectItem(predictionItemClass, predictionItemId, dataRepo) {
    return new Promise((resolve, reject) => {
      dataRepo.getItem(predictionItemClass, predictionItemId)
        .catch(err => reject(err))
        .then(item => {
          const namespace = item.classMeta.plain.namespace;
          const objectClass = `object@${namespace}`;
          const objectId = item.base.object;
          dataRepo.getItem(objectClass, objectId)
            .catch(err => reject(err))
            .then(objectItem => resolve(objectItem));
        });
    });
  }

  async function processObject(itemClass, itemId, dataRepo) {
    const objectItem = await getObjectItem(itemClass, itemId, dataRepo);
    if (!objectItem.base.verified)
      throw new Error('Object has to be verified first.');
    const img = await objectItem.files.normalizedImage.getContents();
    const predictionItem = await dataRepo.getItem(itemClass, itemId);
    if (!predictionItem.base.modelSnapshot)
      throw new Error('No model to process the pattern.');
    const modelSnapshotItem = await dataRepo.getItem(`${predictionItem.properties.modelSnapshot.meta.refClass}@${predictionItem.classMeta.plain.namespace}`, predictionItem.base.modelSnapshot)
    if (!modelSnapshotItem.files.modelFile)
      throw new Error('No model to process the pattern.');
    const model = await modelSnapshotItem.files.modelFile.getContents();
    return await tensorflowLib.classifyItem(img.stream.path, `file://${model.stream.path}`, imageOptions);
  }

}
processWithTensorflow.prototype = new ActionHandler();

module.exports = processWithTensorflow;
