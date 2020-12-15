const ActionHandler = require('modules/registry/backend/ActionHandler');

const NODE_ENV = process.env.NODE_ENV || 'production';

function importFromDataset(options) {

  this.init = function () {
    return Promise.resolve();
  }

  this._exec = function (scope, req) {

    const tensorflowOptions = scope.settings._get('aib.tensorflow');

    const itemId = req.params.id;
    const itemClass = req.params.class;

    return new Promise((resolve, reject) => {
      options.dataRepo.getItem(itemClass, itemId)
        .catch(err => reject(err))
        .then(datasetItem => {

          const importOptions = {
            importLimit: NODE_ENV === 'demo' ? 50 : null,
            randomize: NODE_ENV === 'demo',
            readingBatch: 2000,
            importingBatch: 300,
            prefix: datasetItem.base.name,
            dataRepo: options.dataRepo,
            workflows: options.workflows,
            user: req.user,
            cleanAfterImport: true,
            ...tensorflowOptions
          };
          const namespace = datasetItem.classMeta.plain.namespace;

          const datasetId = datasetItem.id;

          const import_p = [];

          // get type labels
          const labels_p = new Promise((resolve, reject) => {
            const labels = {};
            const fetch_p = [];
            for (const labelId of datasetItem.base.typeLabels) {
              fetch_p.push(
                new Promise((resolve, reject) => {
                  options.dataRepo.getItem(`typeLabel@${namespace}`, labelId)
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
              if (datasetItem.files.trainingSource) {
                import_p.push(new Promise((resolve, reject) => {
                  datasetItem.files.trainingSource.getContents()
                    .catch(err => reject(err))
                    .then(trainingSource => {
                      importData(trainingSource.stream.path, datasetItem.base.sourceType, labels,
                        {
                          state: 'learn',
                          dataset: datasetId
                        },
                        namespace,
                        importOptions
                      )
                        .catch(err => reject(err))
                        .then(() => resolve(true))
                        .finally(() => trainingSource.stream.close());
                    });
                }));
              }

              // import testing data
              if (datasetItem.files.testingSource) {
                import_p.push(new Promise((resolve, reject) => {
                  datasetItem.files.testingSource.getContents()
                    .catch(err => reject(err))
                    .then(testingSource => {
                      importData(testingSource.stream.path, datasetItem.base.sourceType, labels,
                        {
                          state: 'check',
                          dataset: datasetId
                        },
                        namespace,
                        importOptions
                      )
                        .catch(err => reject(err))
                        .then(() => resolve(true))
                        .finally(() => testingSource.stream.close());
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
}

async function importData(dataSource, sourceType, labels, objectTemplate = {}, namespace, importOptions) {
  const importer = require(`./datasetTypes/${sourceType}`);
  return await importer.read(dataSource, labels, objectTemplate, namespace, importOptions)
}

importFromDataset.prototype = new ActionHandler();

module.exports = importFromDataset;
