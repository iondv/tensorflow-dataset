module.exports = {
  fromFolderStructure
};

const fs = require('fs');
const path = require('path');

const TYPE_ITEM_CLASS = "type";
const OBJECT_ITEM_CLASS = "object";
const ALLOWED_IMAGE_TYPES = [
  'jpg',
  'jpeg',
  'png',
  'bmp',
  'gif',
  'webp',
  'svg',
  'jfif'
];

async function fromFolderStructure(folder, namespace, options) {
  const labels = fs.readdirSync(folder);

  const labelImportPromises = [];

  for (const label of labels) {
    labelImportPromises.push(new Promise(async (resolve, reject) => {
      const possibleTypes = await options.dataRepo.getList(`${TYPE_ITEM_CLASS}@${namespace}`, {
        filter: {eq: ['$name', label]}
      });

      let typeItem;

      if ((!possibleTypes) || (possibleTypes.length === 0)) { // create new type item with name === search query
        let typeCode = label
          .split(' ')
          .map((part, i) =>
            i === 0 ?
              part
              : `${part.charAt(0).toLocaleUpperCase()}${part.slice(1)}`
          ).join('');
        // check if the generated type code is unused
        let codeCheck = await options.dataRepo.getList(`${TYPE_ITEM_CLASS}@${namespace}`, {
          filter: {eq: ['$code', typeCode]}
        });
        let codeSuffix = '';
        if (codeCheck && (codeCheck.length > 0)) { // try incrementing suffix
          codeSuffix = -1;
          do {
            codeSuffix += 1;
            codeCheck = await options.dataRepo.getList(`${TYPE_ITEM_CLASS}@${namespace}`, {
              filter: {eq: ['$code', `${typeCode}${codeSuffix}`]}
            });
          } while (codeCheck && (codeCheck.length > 0));
        }
        typeItem = await options.dataRepo.createItem(`${TYPE_ITEM_CLASS}@${namespace}`, {
          name: label,
          code: `${typeCode}${codeSuffix}`
        });
      } else
        typeItem = possibleTypes[0];

      const imagesPath = path.join(folder, label);

      const imageFiles = fs.readdirSync(imagesPath)
        .map(fileName => path.join(imagesPath, fileName))
        .filter(filePath => {
          const filePathParts = filePath.split('.');
          const fileType = filePathParts[filePathParts.length - 1];
          return ALLOWED_IMAGE_TYPES.includes(fileType)
        });

      const importPromises = [];

      let imagesImported = 0;
      for (const imageFile of imageFiles) {
        imagesImported += 1;
        const imageNum = imagesImported;
        importPromises.push(new Promise((resolve, reject) => {
          fs.readFile(imageFile, async (err, data) => {
            if (err)
              reject(err);
            const objectItem = await options.dataRepo.createItem(`${OBJECT_ITEM_CLASS}@${namespace}`, {
              name: options.prefix ? `${options.prefix} ${label} #${imageNum}` : `${label} #${imageNum}`,
              image: data,
              type: typeItem.base.code,
              state: 'learn',
              verified: false
            });
            try {
              await options.workflows.performTransition(
                objectItem,
                `${OBJECT_ITEM_CLASS}@${namespace}`,
                'verify',
                {user: options.user}
              );
              resolve(objectItem);
            } catch (err) {
              await options.dataRepo.fileStorage.remove(objectItem.files.image.id);
              await options.dataRepo.deleteItem(`${objectItem.base._class}@${objectItem.classMeta.plain.namespace}`, objectItem.id);
              resolve(null);
            }
          });
        }));
      }

      await Promise.all(importPromises)

      if (options.cleanAfterImport) {
        await Promise.all(fs.readdirSync(imagesPath).map(file => {
          return new Promise((resolve, reject) => {
            fs.unlink(path.join(imagesPath, file), resolve);
          });
        }));
        await fs.rmdirSync(imagesPath);
      }

      return resolve((await Promise.all(importPromises))
        .filter(objectItem => objectItem !== null));
    }));
  }

  await Promise.all(labelImportPromises)

  if (options.cleanAfterImport)
    fs.rmdirSync(folder);

  return [].concat(...(await Promise.all(labelImportPromises)));
}
