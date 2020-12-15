module.exports = {
  read
};

const unzip = require('unzipper');
const fs = require('fs');
const path = require('path');
const imageImporter = require('../imageImporter');
const crypto = require('crypto');

const tempFolder = path.join(__dirname, '..', '..', '..', 'temp');

async function read(dataSource, labels, objectTemplate = {}, namespace, options = {}) {
  if (!fs.existsSync(tempFolder))
    fs.mkdirSync(tempFolder);

  let unzipPath = path.join(tempFolder, crypto.randomBytes(16).toString('hex'));

  while(fs.existsSync(unzipPath))
    unzipPath = path.join(tempFolder, crypto.randomBytes(16).toString('hex'));

  await new Promise((resolve, reject) => {
    const extractStream = unzip.Extract({path: unzipPath});
    extractStream.on('close', resolve);
    extractStream.on('error', reject);

    fs.createReadStream(dataSource).pipe(extractStream);
  });

  await imageImporter.fromFolderStructure(
    unzipPath,
    namespace,
    options
  );

  return true;
}
