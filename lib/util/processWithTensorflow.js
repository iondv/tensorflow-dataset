const ActionHandler = require('modules/registry/backend/ActionHandler');
const tensorflowLib = require('./tensorflowLib');
const imageConverter = require('./imageConverter');

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
        const namespace = objectItem.classMeta.plain.namespace;
        const objectItemClass = `object@${namespace}`;
        const objectItemId = objectItem.id;
        if (objectItem.files && (objectItem.files.image || objectItem.files.normalizedImage)) {
          if (objectItem.files.normalizedImage) {
            objectItem.files.normalizedImage.getContents()
              .catch(err => reject(err))
              .then(img => {
                tensorflowLib.classify(img.stream.path, imageOptions)
                  .catch(err => reject(err))
                  .then(prediction => resolve(prediction));
              });
          } else {
            objectItem.files.image.getContents()
              .catch(err => reject(err))
              .then(img => {
                const preEditPromise = new Promise((resolve, reject) => {
                  if (objectItem.base.cropSettings) {
                    getCropSettings(objectItem, dataRepo)
                      .catch(err => reject(err))
                      .then((cropSettings) => {
                        imageConverter.cropImage(img.stream.path, cropSettings.bitmapRowNum, cropSettings.bitmapColumnNum, cropSettings.width, cropSettings.height, imageOptions)
                          .catch(err => reject(err))
                          .then(croppedImg => resolve(croppedImg));
                      });
                  } else {
                    resolve(img.stream.path);
                  }
                });

                preEditPromise
                  .catch(err => reject(err))
                  .then((preEditImg) => {
                    imageConverter.normalizeImage(preEditImg, imageOptions)
                      .catch(err => reject(err))
                      .then(normalizedImage => {
                        options.dataRepo.editItem(objectItemClass, objectItemId, {
                          normalizedImage
                        })
                          .catch(err => reject(err))
                          .then(() => {
                            processObject(itemClass, itemId, dataRepo)
                              .catch(err => reject(err))
                              .then((prediction) => resolve(prediction));
                          });
                      });
                  });
              })
          }
        } else
          reject("No image");
      });
    });
  }

  function getCropSettings(objectItem, dataRepo) {
    return new Promise((resolve, reject) => {
      const namespace = objectItem.classMeta.plain.namespace;
      const cropSettingsClass = `cropSettings@${namespace}`;
      const cropSettingsId = objectItem.base.cropSettings;
      dataRepo.getItem(cropSettingsClass, cropSettingsId)
        .catch(err => reject(err))
        .then(cropSettings => resolve({
          bitmapRowNum: cropSettings.base.bitmapRowNum,
          bitmapColumnNum: cropSettings.base.bitmapColumnNum,
          width: cropSettings.base.width,
          height: cropSettings.base.height
        }));
    });
  }

}
processWithTensorflow.prototype = new ActionHandler();

module.exports = processWithTensorflow;
