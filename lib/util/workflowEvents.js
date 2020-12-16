const objectPreprocessor = require('./objectPreprocessor');
const imageImporter = require('./imageImporter');

const ION_NAMESPACE = 'tensorflow-dataset';
const ION_OBJECT_META_CLASS = 'object';

const ION_OBJECT_CLASS_NAME = `${ION_OBJECT_META_CLASS}@${ION_NAMESPACE}`;

function workflowEvents(options) {
  this.init = function (scope) {
    // object
    options.workflows.on(
      [`${ION_OBJECT_CLASS_NAME}.verified`],
      (ev) => {
        if (ev.transition === 'verify') {
          return new Promise((resolve, reject) => {
            options.dataRepo.getItem(ev.item, null, {})
              .catch(reject)
              .then((objectItem) => {
                objectPreprocessor(objectItem, options.dataRepo, scope.settings._get('aib.tensorflow'))
                  .catch(reject)
                  .then(() => resolve(true));
              });
          });
        } else {
          return Promise.resolve();
        }
      }
    );

    // imageDownloader
    options.workflows.on(
      [`imageDownloader@${ION_NAMESPACE}.started`],
      (ev) => {
        if (ev.transition === 'download') {
          return new Promise((resolve, reject) => {
            // options.dataRepo.getItem(ev.item, null, {})
            //   .catch(reject)
            //   .then((downloaderItem) => {
            //    require('./downloadImages')(downloaderItem, options.dataRepo, options.workflows, ev.user, scope.settings._get('aib.tensorflow'))
            require('./downloadImages')(ev.item, options.dataRepo, options.workflows, ev.user, scope.settings._get('aib.tensorflow'))
                  .then((itemList) => {
                    console.log('imported', itemList.length, 'new images');
                  });
                resolve(true);
            //   });
          });
        } else {
          return Promise.resolve();
        }
      }
    )

    // modelSnapshot
    options.workflows.on(
      [`modelSnapshot@${ION_NAMESPACE}.default`],
      (ev) => {
        if (ev.transition === 'makeDefault') {
          return new Promise((resolve, reject) => {
            options.dataRepo.getList(`modelSnapshot@${ION_NAMESPACE}`, {
              filter: {
                eq: ['$isDefault', true]
              }
            }).catch(err => reject(err))
              .then((defaultSnapshotsList) => {

                // make the default snapshot non-default
                const eventPromises = defaultSnapshotsList.map((snapshotItem) => {
                  return new Promise((resolve, reject) => {
                    options.dataRepo.editItem(snapshotItem.base._class, snapshotItem.id, {
                      isDefault: false
                    }).catch(err => reject(err))
                      .then(() => {
                        options.workflows.pushToState(snapshotItem, `modelSnapshot@${ION_NAMESPACE}`, 'notDefault')
                          .catch(err => reject(err))
                          .then(() => resolve(true));
                      })
                  });
                });

                // make the chosen snapshot default
                eventPromises.push(
                  options.dataRepo.editItem(ev.item.base._class, ev.item.id, {
                    isDefault: true
                  })
                )

                Promise.all(eventPromises)
                  .catch(err => reject(err))
                  .then(() => resolve(true));
              });
          });
        } else {
          return Promise.resolve();
        }
      }
    );

    // bulkImageDownload
    options.workflows.on(
      [`bulkImageUpload@${ION_NAMESPACE}.uploaded`],
      (ev) => {
        if (ev.transition === 'upload') {
          return new Promise((resolve, reject) => {
            const bulkUploadItem = ev.item;
            imageImporter.fromItemFiles(
              bulkUploadItem.files.images,
              bulkUploadItem.classMeta.plain.namespace,
              {
                prefix: `bulk upload ${bulkUploadItem.base.name}`,
                dataRepo: options.dataRepo,
                workflows: options.workflows,
                user: ev.user
              }
            ).catch(reject)
              .then((itemList) => {
                console.log(`imported ${itemList.length} new images`);
                resolve(true);
              });
          });
        } else {
          return Promise.resolve();
        }
      }
    );
  }
}

module.exports = workflowEvents;
