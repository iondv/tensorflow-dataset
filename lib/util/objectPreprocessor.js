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
            img.stream.close();
          });
      } else {
        objectItem.files.image.getContents()
          .catch(err => reject(err))
          .then(img => {
            const imgPath = img.stream.path;
            img.stream.close();
            const preEditPromise = new Promise((resolve, reject) => {
              if (objectItem.base.cropData) {
                const cropData = JSON.parse(objectItem.base.cropData);
                const cropSettings = {
                  bitmapRowNum: cropData.top,
                  bitmapColumnNum: cropData.left,
                  width: (cropData.right - cropData.left),
                  height: (cropData.bottom - cropData.top)
                };
                imageConverter.cropImage(imgPath, cropSettings.bitmapRowNum, cropSettings.bitmapColumnNum, cropSettings.width, cropSettings.height, imageOptions)
                  .catch(err => reject(err))
                  .then(croppedImg => resolve(croppedImg));
              } else {
                resolve(imgPath);
              }
            });

            preEditPromise
              .catch(err => reject(err))
              .then((preEditImg) => {
                imageConverter.normalizeImage(preEditImg, imageOptions)
                  .catch(err => reject(err))
                  .then(normalizedImage => {
                    const normalizedImageChecksum = crypto.createHash('md5').update(normalizedImage).digest();
                    dataRepo.editItem(objectItemClass, objectItemId, {
                      normalizedImage,
                      normalizedImageChecksum: normalizedImageChecksum,
                      verified: true
                    })
                      .then(() => {
                        resolve(true);
                      })
                      .catch((err) => {
                        dataRepo.getList(objectItemClass, {
                          filter: {
                            'eq': ['$normalizedImageChecksum', normalizedImageChecksum.toString('utf-8')]
                          }
                        }).catch(() => reject(err))
                          .then((objectsWithSameImage) => {
                            if (objectsWithSameImage.length > 0) {
                              const alreadyInDatasetError = new Error(`Image is already part of the dataset under object with id ${objectsWithSameImage[0].id}.`);
                              alreadyInDatasetError['item'] = objectsWithSameImage[0];
                              reject(alreadyInDatasetError);
                            } else {
                              reject(err);
                            }
                          })
                      })
                  });
              });
          });
      }
    } else
      reject("No image");
  });
}
