const ActionHandler = require('@iondv/registry/backend/ActionHandler');
const tensorflowLib = require('./tensorflowLib');

function processWithTensorflow(options) {
  this.init = function() {
    return Promise.resolve();
  }
  this._exec = function(scope, req) {
    const itemClass = req.params.class;
    const itemId = req.params.id;

    const labelsPromise = new Promise((resolve, reject) => {
      options.dataRepo.getItem(itemClass, itemId)
        .catch(err => reject(err))
        .then((predictionItem) => {
          if (predictionItem.base.modelSnapshot) {
            const snapshotId = predictionItem.base.modelSnapshot;
            const snapshotClass = `${predictionItem.properties.modelSnapshot.meta.refClass}@${predictionItem.classMeta.plain.namespace}`;
            options.dataRepo.getItem(snapshotClass, snapshotId)
              .catch(err => reject(err))
              .then((snapshotItem) => {
                if (snapshotItem.base.typeLabels && (snapshotItem.base.typeLabels.length > 0)) {
                  const labelClass = `${snapshotItem.properties.typeLabels.meta.itemsClass}@${snapshotItem.classMeta.plain.namespace}`;
                  const typeLabels = [];
                  for (const labelId of snapshotItem.base.typeLabels) {
                    typeLabels.push(options.dataRepo.getItem(labelClass, labelId)
                      .catch(err => reject(err))
                      .then((labelItem) => {
                        return {
                          code: labelItem.base.type,
                          label: labelItem.base.label
                        }
                      })
                    );
                  }
                  Promise.all(typeLabels)
                    .catch(reject)
                    .then((typeLabels) => {
                      const labels = [];
                      for (const typeLabel of typeLabels) {
                        labels[typeLabel.label] = typeLabel.code;
                      }
                      resolve(labels);
                    });
                }
              });
          }
        });
    });

    return new Promise((resolve, reject) => {
      labelsPromise
        .catch(reject)
        .then(labels => {
          processObject(itemClass, itemId, labels, options.dataRepo)
            .catch(err => reject(err))
            .then((prediction) => {
              options.dataRepo.editItem(itemClass, itemId, {
                prediction: prediction.predictionScore * 100,
                log: prediction.log,
                recognizedType: labels[prediction.typeCode]
              })
                .catch(err => reject(err))
                .then(() => resolve(prediction.log));
            });
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

  async function processObject(itemClass, itemId, labeledTypes, dataRepo) {
    const objectItem = await getObjectItem(itemClass, itemId, dataRepo);
    if (!objectItem.base.verified)
      throw new Error('Object has to be verified first.');
    const imgStream = (await objectItem.files.normalizedImage.getContents()).stream;
    const img = imgStream.path;
    imgStream.close();
    const predictionItem = await dataRepo.getItem(itemClass, itemId);
    if (!predictionItem.base.modelSnapshot)
      throw new Error('No model to process the pattern.');
    const modelSnapshotItem = await dataRepo.getItem(`${predictionItem.properties.modelSnapshot.meta.refClass}@${predictionItem.classMeta.plain.namespace}`, predictionItem.base.modelSnapshot)
    if (!modelSnapshotItem.files.modelFile)
      throw new Error('No model to process the pattern.');
    if (!modelSnapshotItem.files.modelFile)
      throw new Error('No model to process the pattern.');
    const modelStream = (await modelSnapshotItem.files.modelFile.getContents()).stream;
    const modelPath = modelStream.path;
    modelStream.close();

    const [
      ,
      imageWidth,
      imageHeight,
      imageChannels
    ] = await tensorflowLib.getModelInputShape(modelSnapshotItem);

    return await tensorflowLib.classifyItem(img, `file://${modelPath}`, {
      labels: labeledTypes,
      imageWidth,
      imageHeight,
      imageChannels
    });
  }

}
processWithTensorflow.prototype = new ActionHandler();

module.exports = processWithTensorflow;
