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

  function processObject(itemClass, itemId, dataRepo) {
    return new Promise((resolve, reject) => {
      getObjectItem(itemClass, itemId, dataRepo)
        .catch(err => reject(err))
        .then((objectItem) => {
          if (!objectItem.base.verified)
            reject('Object has to be verified first.');
          else {
            objectItem.files.normalizedImage.getContents()
              .catch(err => reject(err))
              .then((img) => {
                tensorflowLib.classify(img.stream.path, imageOptions)
                  .catch(err => reject(err))
                  .then(prediction => resolve(prediction));
              });
          }
      });
    });
  }

}
processWithTensorflow.prototype = new ActionHandler();

module.exports = processWithTensorflow;
