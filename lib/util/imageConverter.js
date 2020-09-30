const canvas = require('canvas');
const fs = require('fs');

// Convert image to array of normalized pixel values
const toPixelData = async function (img, options) {
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

const normalizeImage = async function (img, options) {
  console.log(img);
  const image = await canvas.loadImage(img);
  const imageCanvas = canvas.createCanvas(options.imageWidth, options.imageHeight);
  const imageContext = imageCanvas.getContext('2d');
  imageContext.drawImage(image, 0, 0, options.imageWidth, options.imageHeight);
  const imageData = imageContext.getImageData(0, 0, options.imageWidth, options.imageHeight);

  const data = imageData.data;
  console.log(data);

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

const cropImage = async function (img, startRow, startColumn, width, height, options) {
  const image = await canvas.loadImage(img);
  const imageCanvas = canvas.createCanvas(options.imageWidth, options.imageHeight);
  const imageContext = imageCanvas.getContext('2d');
  imageContext.drawImage(image, 0, 0, options.imageWidth, options.imageHeight);
  const imageData = imageContext.getImageData(0, 0, options.imageWidth, options.imageHeight);

  const newCanvas = canvas.createCanvas(width, height);
  const newCanvasContext = newCanvas.getContext('2d');
  const newCanvasData = newCanvasContext.createImageData(width, height); //newCanvasContext.getImageData(0, 0, width, height);

  // go to the starting position
  let position = (startRow + 1) * startColumn * 4;

  // find out how many bytes to copy
  const totalCount = width*height*4;

  // copy everything from start to start + count
  for (let copyCount = 0; copyCount < totalCount; copyCount += 4) {
    newCanvasData.data[copyCount] = imageData.data[position];
    newCanvasData.data[copyCount + 1] = imageData.data[position + 1];
    newCanvasData.data[copyCount + 2] = imageData.data[position + 2];
    newCanvasData.data[copyCount + 3] = imageData.data[position + 3];
    position += 4;
  }

  newCanvasContext.putImageData(newCanvasData, 0, 0);

  console.log(newCanvas.toBuffer());
  fs.writeFileSync('./test.png', newCanvas.createPNGStream());
  return newCanvas.toBuffer();
};

module.exports = {
  toPixelData,
  normalizeImage,
  cropImage
}
