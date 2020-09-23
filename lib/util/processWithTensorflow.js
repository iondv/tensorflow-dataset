const ActionHandler = require('modules/registry/backend/ActionHandler');
const tensorflowLib = require('./tensorflowLib');

function processWithTensorflow(options) {
  this.init = function() {
    console.log('test tensorflow init');
    return Promise.resolve();
  }
  this._exec = function(scope, req) {
    console.log('test tensorflow action');
    const itemClass = req.params.class;
    const itemId = req.params.id;
    return new Promise(resolve => {
      options.data.getItem(itemClass, itemId)
        .then(item => {
          item.files.image.getContents().then(img => {
            console.log(img.stream.path);
            tensorflowLib.classify(img.stream.path).then(() => resolve(true));
          })
        });
    });
    // params.class
    // params.id
  }
}
processWithTensorflow.prototype = new ActionHandler();

module.exports = processWithTensorflow;
