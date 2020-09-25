const ActionHandler = require('modules/registry/backend/ActionHandler');

function reclassifyItem(options) {
  this.init = function() {
    console.log('test reclassification init');
    return Promise.resolve();
  }
  this._exec = function(scope, req) {
    console.log('test reclassification action');
    return Promise.resolve();
  }
}
reclassifyItem.prototype = new ActionHandler();

module.exports = reclassifyItem;