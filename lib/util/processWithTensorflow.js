const ActionHandler = require('modules/registry/backend/ActionHandler');

function processWithTensorflow(options) {
  this.init = function() {
  }
  this._exec = function() {
    console.log('test action');
    return Promise.resolve();
  }
}
processWithTensorflow.prototype = new ActionHandler();

module.exports = processWithTensorflow;