module.exports = {
  read
};

const csvparser = require('../csvparser');
const canvasLib = require('canvas');
const crypto = require('crypto');

async function read(dataSource, labels, objectTemplate = {}, namespace, options = {}) {
  let data;
  let csvLength;
  if (options.importLimit) {
    data = csvparser.parseCsvPartial(dataSource, options.importLimit, 0, {random: true});
    csvLength = options.importLimit;
  } else
    csvLength = csvparser.readLength(dataSource);
  let globalPos = 0;
  let imageNum = 0;

  while (globalPos < csvLength) {
    if (options.randomize)
      data = csvparser.parseCsvPartial(dataSource, options.importLimit, globalPos, {random: true});
    else
      data = csvparser.parseCsvPartial(dataSource, options.readingBatch, globalPos);
    const dataHeaders = data.headers;

    dataHeaders.shift();

    let pos = 0;
    while (pos < data.records.length) {
      const recordsSlice = data.records.slice(pos, pos + options.importingBatch);
      for (const csvImg of recordsSlice) {
        const canvas = canvasLib.createCanvas(options.imageWidth, options.imageHeight);
        const context = canvas.getContext("2d");
        const imageData = context.getImageData(0, 0, options.imageWidth, options.imageHeight);
        const data = imageData.data;

        const image = Object.assign({}, objectTemplate);

        if (!labels[csvImg.label])
          throw new Error("Provided fewer labels than there are in the dataset.");

        image['type'] = labels[csvImg.label];
        image['name'] = `${options.prefix} ${image.state + 'ing' || ''} ${imageNum}`;

        let i = 0;
        for (const header of dataHeaders) {
          data[i] = csvImg[header];
          data[i + 1] = data[i];
          data[i + 2] = data[i];
          data[i + 3] = 255;
          i += 4;
        }
        context.putImageData(imageData, 0, 0);
        image['normalizedImage'] = canvas.toBuffer();

        image['normalizedImageChecksum'] = crypto.createHash('md5').update(image['normalizedImage']).digest();
        image['verified'] = 'true';

        try {
          await options.dataRepo.createItem(`object@${namespace}`, image);
          imageNum += 1;
        } catch (err) {console.error(err);}
      }
      pos += options.importingBatch;
    }
    globalPos += options.readingBatch;
  }
  return true;
}
