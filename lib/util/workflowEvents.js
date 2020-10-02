const objectPreprocessor = require('./objectPreprocessor');

const ION_NAMESPACE = 'tensorflow-dataset';
const ION_OBJECT_META_CLASS = 'object';

const ION_OBJECT_CLASS_NAME = `${ION_OBJECT_META_CLASS}@${ION_NAMESPACE}`;

const imageOptions = {
  imageWidth: 28,
  imageHeight: 28,
  imageChannels: 1
}

function workflowEvents(options) {
  this.init = function () {
    options.workflows.on(
      [`${ION_OBJECT_CLASS_NAME}.verified`],
      (ev) => {
        if (ev.transition === 'verify') {
          return new Promise((resolve, reject) => {
            options.dataRepo.getItem(ev.item, null, {})
              .catch(reject)
              .then((objectItem) => {
                objectPreprocessor(objectItem, options.dataRepo, imageOptions)
                  .catch((err) => {
                    reject('This image is already a part of the dataset.');
                  })
                  .then(() => resolve(true));
              });
          });
        } else {
          return Promise.resolve();
        }
      }
    )
  }
}

module.exports = workflowEvents;
