const Service = require('modules/rest/lib/interfaces/Service');
const crypto = require('crypto');

const processWithTensorflow = require('../lib/util/processWithTensorflow');

const ION_NAMESPACE = 'tensorflow-dataset';
const DEFAULT_USER = {
  id: () => 'default',
  properties: () => {}
}

function recognize(options) {
  this._route = function(router) {
    /**
     * @param {Request} req
     * @returns {Promise}
     * @private
     */
    this.addHandler(router, '/', 'PUT', (req) => {
      const chunks = [];
      return new Promise((resolve) => {
        req.on('data', (chunk) => {
          chunks.push(chunk);
        });
        req.on('end', async () => {
          const source = Buffer.concat(chunks);
          const newObjectItem = await options.dataRepo.createItem(`object@${ION_NAMESPACE}`, {
            name: crypto.randomBytes(8).toString('hex'),
            image: source,
            verified: false
          });

          let objectId = newObjectItem.id;
          try {
            await options.workflows.performTransition(
              newObjectItem,
              `object@${ION_NAMESPACE}`,
              'verify',
              {user: DEFAULT_USER}
            );
          } catch (err) {
            if (err.item) {
              await options.dataRepo.deleteItem(`object@${ION_NAMESPACE}`, objectId);
              objectId = err.item.id;
            } else {
              throw err;
            }
          }
          const defaultSnapshotList = await options.dataRepo.getList(`modelSnapshot@${ION_NAMESPACE}`, {
            filter: {
              'eq': ['$isDefault', true]
            }
          });
          if (defaultSnapshotList.length < 1) {
            resolve('default snapshot not set.');
          } else {
            const defaultSnapshot = defaultSnapshotList[0];
            const newPredictionItem = await options.dataRepo.createItem(`objectClassification@${ION_NAMESPACE}`, {
              object: objectId,
              modelSnapshot: defaultSnapshot.id
            });
            const prediction = await (new processWithTensorflow(options)).exec({}, {
              params: {
                class: newPredictionItem.base._class,
                id: newPredictionItem.id
              }
            });
            resolve(prediction);
          }
        });
      });
    });
  };
}

recognize.prototype = new Service();

module.exports = recognize;