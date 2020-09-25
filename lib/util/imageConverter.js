const canvas = require('canvas-prebuilt');

// Convert image to array of normalized pixel values
toPixelData = async function (img, options) {
  const pixeldata = [];
  const image = await canvas.loadImage(img);
  const imageCanvas = canvas.createCanvas(options.imageWidth, options.imageHeight);
  const imageContext = imageCanvas.getContext('2d');
  imageContext.drawImage(image, 0, 0, options.imageWidth, options.imageHeight);
  const imageData = imageContext.getImageData(0, 0, options.imageWidth, options.imageHeight);

  const data = imageData.data;

  function fillPixelData() {
    for (let i = 0; i < data.length; i += 4)
      pixeldata.push(data[i]);
  }
  fillPixelData();

  return pixeldata;
};

normalizeImage = async function (img, options) {
  const image = await canvas.loadImage(img);
  const imageCanvas = canvas.createCanvas(options.imageWidth, options.imageHeight);
  const imageContext = imageCanvas.getContext('2d');
  imageContext.drawImage(image, 0, 0, options.imageWidth, options.imageHeight);
  const imageData = imageContext.getImageData(0, 0, options.imageWidth, options.imageHeight);

  const data = imageData.data;

  function invert() {
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = 255 - data[i];     // red
      data[i + 1] = 255 - data[i + 1]; // green
      data[i + 2] = 255 - data[i + 2]; // blue
    }
    imageContext.putImageData(imageData, 0, 0);
  }
  invert();

  function grayscale() {
    for (let i = 0; i < data.length; i += 4) {
      let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i]     = avg; // red
      data[i + 1] = avg; // green
      data[i + 2] = avg; // blue
    }
    imageContext.putImageData(imageData, 0, 0);
  }
  grayscale();

  return imageCanvas.toBuffer();
};

module.exports = {
  toPixelData,
  normalizeImage
}
