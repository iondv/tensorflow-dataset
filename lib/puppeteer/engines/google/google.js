const selectors = require('./selectors.json');
const utils = require('./utils.js');
const miscUtils = require('../../misc');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const url = 'https://www.google.com/imghp';

module.exports = async function (options, ppt, args) { //checkQuote
  await ppt.page.goto(url);
  await utils.makeSearch('test', ppt.page);
  const imageUrls = await utils.retrieveImages(200, ppt.page);

  const tempFolder = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempFolder))
    fs.mkdirSync(tempFolder);

  const imagesPath = path.join(tempFolder, crypto.randomBytes(16).toString('hex'));
  fs.mkdirSync(imagesPath);

  let imageNum = -1;
  await Promise.all(
    imageUrls.map((imageUrl) => {
      imageNum += 1;
      const base64Data = /^data:image\/(\w+?);\w+?,(.+)/.exec(imageUrl);
      if (base64Data) {
        const [
          ,
          fileType,
          data
        ] = base64Data;
        const filePath = `${path.join(imagesPath, imageNum.toString())}.${fileType}`;
        return new Promise((resolve) => {
          fs.writeFile(filePath, Buffer.from(data, 'base64'), resolve);
        });
      } else
        return miscUtils.downloadFile(imageUrl, path.join(imagesPath, imageNum.toString()));
    })
  );

  return true;
}
