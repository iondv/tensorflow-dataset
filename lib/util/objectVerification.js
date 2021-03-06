const crypto = require('crypto');

module.exports = verifyObject;

function verifyObject(objectItem, dataRepo) {
  const namespace = objectItem.classMeta.plain.namespace;
  const objectItemClass = `object@${namespace}`;
  const objectItemId = objectItem.id;
  if (objectItem.files && objectItem.files.image) {
    return new Promise(async (resolve, reject) => {
      const img = await objectItem.files.image.getContents();
      const partialBuffers = [];
      let imgBuffer;
      img.stream.on('data', function (buffer) {
        partialBuffers.push(buffer);
      });
      img.stream.on('end', async function () {
        imgBuffer = Buffer.concat(partialBuffers);
        const imageChecksum = crypto.createHash('md5').update(imgBuffer).digest();
        try {
          await dataRepo.editItem(objectItemClass, objectItemId, {
            imageChecksum,
            verified: true
          })
          return resolve(true);
        } catch (err) {
          const objectsWithSameImage = await dataRepo.getList(objectItemClass, {
            filter: {
              'eq': ['$imageChecksum', imageChecksum.toString('utf-8')]
            }
          });
          if (objectsWithSameImage.length > 0) {
            const alreadyInDatasetError = new Error(`Image is already part of the dataset under object with id ${objectsWithSameImage[0].id}.`);
            alreadyInDatasetError['item'] = objectsWithSameImage[0];
            return reject(alreadyInDatasetError);
          } else {
            return reject(err);
          }
        }
      });
      await img.stream.close();
    });
  } else
    throw new Error("No image");
}
