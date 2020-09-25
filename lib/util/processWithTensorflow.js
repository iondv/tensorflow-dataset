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
      options.data.getItem(itemClass, itemId)
        .then(item => {
          if (item.files && (item.files.image || item.files.normalizedImage)) {
            if (item.files.normalizedImage) {
              item.files.normalizedImage.getContents()
                .then(img => {
                tensorflowLib.classify(img.stream.path, imageOptions)
                  .then(({log, typeCode}) => {
                    options.data.editItem(itemClass, itemId, {
                      log: log,
                      type: `fashion-mnist${typeCode}`
                    })
                      .then(() => resolve(true));
                  });
              })
            } else {
              item.files.image.getContents()
                .then(img => {
                  imageConverter.normalizeImage(img.stream.path, imageOptions)
                    .then(normalizedImage => {
                      options.data.editItem(itemClass, itemId, {
                        normalizedImage
                      })
                        .then(() => {
                          this._exec(scope, req)
                            .then(() => resolve(true));
                        });
                    });
              })
            }
          } else
            reject("No image");
        });
    });
  }
}
processWithTensorflow.prototype = new ActionHandler();

module.exports = processWithTensorflow;
