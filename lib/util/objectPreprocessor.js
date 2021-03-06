const imageConverter = require('./imageConverter');

module.exports = preprocessObject;

async function preprocessObject(objectItem, options) {
  if (objectItem.files && objectItem.files.image) {
    const img = await objectItem.files.image.getContents();
    const imgPath = img.stream.path;
    img.stream.close();

    let croppedImage = null;
    if (objectItem.base.cropData) {
      const cropData = JSON.parse(objectItem.base.cropData);
      const cropSettings = {
        bitmapRowNum: cropData.top,
        bitmapColumnNum: cropData.left,
        width: (cropData.right - cropData.left),
        height: (cropData.bottom - cropData.top)
      };
      croppedImage = await imageConverter.cropImage(imgPath, cropSettings.bitmapRowNum, cropSettings.bitmapColumnNum, cropSettings.width, cropSettings.height, imageOptions)
    }

    if (croppedImage)
      return await imageConverter.normalizeImage(croppedImage, options);
    else
      return await imageConverter.normalizeImage(imgPath, options);

  } else
    throw new Error("No image");
}
