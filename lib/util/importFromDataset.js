const ActionHandler = require('modules/registry/backend/ActionHandler');

const path = require('path');
const csvparser = require('./csvparser');
const canvasLib = require('canvas');

const IMPORTING_BATCH = 300;

const IMAGE_WIDTH = 28;
const IMAGE_HEIGHT = 28;

const ION_NAMESPACE = 'tensorflow-dataset';
const ION_OBJECT_META_CLASS = 'object';
const ION_LABEL_ATTRIBUTE = 'type';
const ION_NORMALIZED_IMAGE_ATTRIBUTE = 'normalizedImage';
const MODEL_ID_PREFIX = `fashion-mnist`;

const ION_LABEL_META_CLASS = 'typeLabel';

const ION_OBJECT_CLASS_NAME = `${ION_OBJECT_META_CLASS}@${ION_NAMESPACE}`;
const ION_LABEL_CLASS_NAME = `${ION_LABEL_META_CLASS}@${ION_NAMESPACE}`;

function importFromDataset(options) {

  this.init = function() {
    return Promise.resolve();
  }

  this._exec = function(scope, req) {

    const itemId = req.params.id;
    const itemClass = req.params.class;

    return new Promise((resolve, reject) => {
      options.data.getItem(itemClass, itemId)
        .catch(err => reject(err))
        .then(item => {

          const datasetId = item.id;

          const import_p = [];

          // get type labels
          const labels_p = new Promise((resolve, reject) => {
            const labels = {};
            const fetch_p = [];
            for (const labelId of item.base.typeLabels) {
              fetch_p.push(
                new Promise((resolve, reject) => {
                  options.data.getItem(ION_LABEL_CLASS_NAME, labelId)
                    .catch(err => reject(err))
                    .then(labelItem => {
                      const label = labelItem.base.label;
                      const type = labelItem.base.type;
                      labels[label] = type;
                      resolve();
                    });
                })
              );
            }
            Promise.all(fetch_p)
              .catch(err => reject(err))
              .then(() => resolve(labels));
          });

          labels_p
            .catch(err => reject(err))
            .then((labels) => {

              // import training data
              if (item.files.trainingSource) {
                import_p.push(new Promise((resolve, reject) => {
                  item.files.trainingSource.getContents()
                    .catch(err => reject(err))
                    .then(trainingSource => {
                      importData(trainingSource.stream.path, labels, {
                        state: 'learn',
                        dataset: datasetId
                      })
                        .catch(err => reject(err))
                        .then(() => resolve(true));
                    });
                }));
              }

              // import testing data
              if (item.files.testingSource) {
                import_p.push(new Promise((resolve, reject) => {
                  item.files.testingSource.getContents()
                    .catch(err => reject(err))
                    .then(trainingSource => {
                      importData(trainingSource.stream.path, labels, {
                        state: 'check',
                        dataset: datasetId
                      })
                        .catch(err => reject(err))
                        .then(() => resolve(true));
                    });
                }));
              }
            });

          Promise.all(import_p)
            .catch(err => reject(err))
            .then(() => resolve(true));
        });
    });

  }

  async function importData(dataSource, labels, objectTemplate = {}) {
      const data = csvparser.parseCsv(dataSource);
      const dataHeaders = data.headers;

      dataHeaders.shift();

      let pos = 0;
      while (pos < data.records.length - 1) {
        let imageNum = 0;
        const recordsSlice = data.records.slice(pos, pos + IMPORTING_BATCH);
        for (const csvImg of recordsSlice) {
          const canvas = canvasLib.createCanvas(IMAGE_WIDTH, IMAGE_HEIGHT);
          const context = canvas.getContext("2d");
          const imageData = context.getImageData(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
          const data = imageData.data;

          const image = Object.assign({}, objectTemplate);

          if (csvImg.label >= Object.keys(labels).length)
            throw new Error("Provided fewer labels than there are in the dataset");

          image[ION_LABEL_ATTRIBUTE] = labels[csvImg.label];
          image['name'] = `${MODEL_ID_PREFIX} ${image.state + 'ing' || ''} ${imageNum}`;

          let i = 0;
          for (const header of dataHeaders) {
            data[i] = csvImg[header];
            data[i + 1] = data[i];
            data[i + 2] = data[i];
            data[i + 3] = 255;
            i += 4;
          }
          context.putImageData(imageData, 0, 0);
          image[ION_NORMALIZED_IMAGE_ATTRIBUTE] = canvas.toBuffer();

          await options.data.createItem(ION_OBJECT_CLASS_NAME, image);
          imageNum += 1;
        }
        pos += IMPORTING_BATCH;
      }
      return true;
  }
}

importFromDataset.prototype = new ActionHandler();

module.exports = importFromDataset;