const Jimp = require('jimp');

// Convert image to array of normalized pixel values
toPixelData = async function (img, options) {
  const pixeldata = [];
  const image = await Jimp.read(img);
  await image
    .resize(options.imageWidth, options.imageHeight)
    .greyscale()
    .invert()
    .scan(0, 0, options.imageWidth, options.imageHeight, (x, y, idx) => {
      let v = image.bitmap.data[idx + 0];
      pixeldata.push(v / 255);
    });

  return pixeldata;
};

module.exports = {
  toPixelData
}