const ActionHandler = require('modules/registry/backend/ActionHandler');

function recalculateProcessingModel() {
  // this.init = function() {
  //   console.log('test recalculation init');
  //   return new Promise(resolve => {
  //     console.log('test recalculation init promise');
  //     resolve(true);
  //   });
  // }
  this._exec = function(scope, req) {
    console.log('test recalculation action');
    return new Promise(resolve => {
      console.log('test recalculation action promise');
      resolve(true);
    });
  }
}
recalculateProcessingModel.prototype = new ActionHandler();

module.exports = recalculateProcessingModel;