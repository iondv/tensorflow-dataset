const imageConverter = require('./imageConverter');
const crypto = require('crypto');

module.exports = preprocessObject;

function preprocessObject(objectItem, dataRepo, imageOptions) {
  return new Promise((resolve, reject) => {
    const namespace = objectItem.classMeta.plain.namespace;
    const objectItemClass = `object@${namespace}`;
    const objectItemId = objectItem.id;
    if (objectItem.files && (objectItem.files.image || objectItem.files.normalizedImage)) {
      if (objectItem.files.normalizedImage) {
        objectItem.files.normalizedImage.getContents()
          .catch(err => reject(err))
          .then(img => {
            const partialBuffers = [];
            let imgBuffer;
            img.stream.on('data', function(buffer) {
              partialBuffers.push(buffer);
            });
            img.stream.on('end', function() {
              imgBuffer = Buffer.concat(partialBuffers);
              dataRepo.editItem(objectItemClass, objectItemId, {
                normalizedImageChecksum: crypto.createHash('md5').update(imgBuffer).digest(),
                verified: true
              })
                .catch(err => reject(err))
                .then(() => {
                  resolve(true);
                });
            });
          });
      } else {
        objectItem.files.image.getContents()
          .catch(err => reject(err))
          .then(img => {
            const preEditPromise = new Promise((resolve, reject) => {
              if (objectItem.base.cropSettings) {
                getCropSettings(objectItem, dataRepo)
                  .catch(err => reject(err))
                  .then((cropSettings) => {
                    imageConverter.cropImage(img.stream.path, cropSettings.bitmapRowNum, cropSettings.bitmapColumnNum, cropSettings.width, cropSettings.height, imageOptions)
                      .catch(err => reject(err))
                      .then(croppedImg => resolve(croppedImg));
                  });
              } else {
                resolve(img.stream.path);
              }
            });

            preEditPromise
              .catch(err => reject(err))
              .then((preEditImg) => {
                imageConverter.normalizeImage(preEditImg, imageOptions)
                  .catch(err => reject(err))
                  .then(normalizedImage => {
                    dataRepo.editItem(objectItemClass, objectItemId, {
                      normalizedImage,
                      normalizedImageChecksum: crypto.createHash('md5').update(normalizedImage).digest(),
                      verified: true
                    })
                      .catch(err => reject(err))
                      .then(() => {
                        resolve(true);
                      });
                  });
              });
          })
      }
    } else
      reject("No image");
  });
}

function getCropSettings(objectItem, dataRepo) {
  return new Promise((resolve, reject) => {
    const namespace = objectItem.classMeta.plain.namespace;
    const cropSettingsClass = `cropSettings@${namespace}`;
    const cropSettingsId = objectItem.base.cropSettings;
    dataRepo.getItem(cropSettingsClass, cropSettingsId)
      .catch(err => reject(err))
      .then(cropSettings => resolve({
        bitmapRowNum: cropSettings.base.bitmapRowNum,
        bitmapColumnNum: cropSettings.base.bitmapColumnNum,
        width: cropSettings.base.width,
        height: cropSettings.base.height
      }));
  });
}