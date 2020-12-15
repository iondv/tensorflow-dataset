module.exports = download;

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const imageImporter = require('./imageImporter');

const NODE_ENV = process.env.NODE_ENV || 'production';
const DEMO_DOWNLOAD_LIMIT = 10;

async function download(downloaderItem, dataRepo, workflows, user, deploy) {
  const tempFolder = path.join(__dirname, '..', '..', 'temp');
  if (!fs.existsSync(tempFolder))
    fs.mkdirSync(tempFolder);

  const queryPath = path.join(tempFolder, crypto.randomBytes(16).toString('hex'));
  fs.mkdirSync(queryPath);

  const imagesPath = path.join(queryPath, downloaderItem.base.query);
  fs.mkdirSync(imagesPath);

  let imagesQuantity = downloaderItem.base.quantity;
  if (NODE_ENV === 'demo') {
    if (imagesQuantity > DEMO_DOWNLOAD_LIMIT)
      imagesQuantity = DEMO_DOWNLOAD_LIMIT;
  } else {
    if (imagesQuantity > Number(deploy.imageDownloadLimit))
      imagesQuantity = Number(deploy.imageDownloadLimit);
  }

  await require('../puppeteer/puppeteer').puppeteerExec(
    {},
    'downloadImages',
    [downloaderItem.base.engine],
    imagesPath,
    downloaderItem.base.query.toLocaleLowerCase(),
    imagesQuantity
  );

  return await imageImporter.fromFolderStructure(
    queryPath,
    downloaderItem.classMeta.plain.namespace,
    {
      prefix: `${downloaderItem.base.engine} query`,
      cleanAfterImport: true,
      dataRepo,
      workflows,
      user
    }
  );
}
