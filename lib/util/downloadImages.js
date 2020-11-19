module.exports = download;

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const TYPE_ITEM_CLASS = "type";
const OBJECT_ITEM_CLASS = "object";
const ALLOWED_IMAGE_TYPES = [
  'jpg',
  'jpeg',
  'png',
  'bmp',
  'gif',
  'webp'
];

async function download(downloaderItem, dataRepo, workflows, user) {
  const tempFolder = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempFolder))
    fs.mkdirSync(tempFolder);

  const imagesPath = path.join(tempFolder, crypto.randomBytes(16).toString('hex'));
  fs.mkdirSync(imagesPath);
  await require('../puppeteer/puppeteer').puppeteerExec(
    {},
    'downloadImages',
    [downloaderItem.base.engine],
    imagesPath,
    downloaderItem.base.query.toLocaleLowerCase(),
    downloaderItem.base.quantity
  );

  const possibleTypes = await dataRepo.getList(`${TYPE_ITEM_CLASS}@${downloaderItem.classMeta.plain.namespace}`, {
    filter: {eq: ['$name', downloaderItem.base.query.toLocaleLowerCase()]}
  });

  let typeItem;

  if ((!possibleTypes) || (possibleTypes.length === 0)) { // create new type item with name === search query
    let typeCode = downloaderItem.base.query
      .split(' ')
      .map((part, i) =>
        i === 0?
          part
        : `${part.charAt(0).toLocaleUpperCase()}${part.slice(1)}`
      ).join('');
    // check if the generated type code is unused
    let codeCheck = await dataRepo.getList(`${TYPE_ITEM_CLASS}@${downloaderItem.classMeta.plain.namespace}`, {
      filter: {eq: ['$code', typeCode]}
    });
    let codeSuffix = '';
    if (codeCheck && (codeCheck.length > 0)) { // try incrementing suffix
      codeSuffix = -1;
      do {
        codeSuffix += 1;
        codeCheck = await dataRepo.getList(`${TYPE_ITEM_CLASS}@${downloaderItem.classMeta.plain.namespace}`, {
          filter: {eq: ['$code', `${typeCode}${codeSuffix}`]}
        });
      } while (codeCheck && (codeCheck.length > 0));
    }
    typeItem = await dataRepo.createItem(`${TYPE_ITEM_CLASS}@${downloaderItem.classMeta.plain.namespace}`, {
      name: downloaderItem.base.query,
      code: `${typeCode}${codeSuffix}`
    });
  } else
    typeItem = possibleTypes[0];

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
        const objectItem = await dataRepo.createItem(`${OBJECT_ITEM_CLASS}@${downloaderItem.classMeta.plain.namespace}`, {
          name: `${downloaderItem.base.engine} query ${downloaderItem.base.query} #${imageNum}`,
          image: data,
          type: typeItem.base.code,
          state: 'learn',
          verified: false
        });
        try {
          await workflows.performTransition(
            objectItem,
            `${OBJECT_ITEM_CLASS}@${downloaderItem.classMeta.plain.namespace}`,
            'verify',
            {user}
            );
          resolve(objectItem);
        } catch (err) {
          console.log(err);
          await dataRepo.fileStorage.remove(objectItem.files.image.id);
          await dataRepo.deleteItem(`${objectItem.base._class}@${objectItem.classMeta.plain.namespace}`, objectItem.id);
          resolve(null);
        }
      });
    }));
  }

  return (await Promise.all(importPromises))
    .filter(objectItem => objectItem !== null);
}
