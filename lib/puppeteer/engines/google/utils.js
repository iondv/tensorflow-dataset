module.exports = {
  makeSearch,
  retrieveImages
};

const selectors = require('./selectors.json');
const miscUtils = require('../../misc');
const path = require('path');

const IMAGE_LOADING_TIMEOUT = 120000;

async function makeSearch(query, page) {
  await page.waitForSelector(selectors.queryInput, {visible: true});
  await page.type(selectors.queryInput, query);
  await page.keyboard.press('Enter');
}

async function retrieveImages(count, destination, page) {
  await page.waitForSelector(selectors.resultsImage, {visible: true});
  const imageUrls = new Set();
  const images = [];
  let elementsToSkip = 0;
  let imageNum = -1;
  while (imageUrls.size < count) {
    const imagePreviewElements = (await page.$$(selectors.resultsImage)).slice(elementsToSkip);
    elementsToSkip += imagePreviewElements.length;
    for (const imagePreviewElement of imagePreviewElements) {
      await imagePreviewElement.hover();
      await imagePreviewElement.click();
      await page.waitForSelector(selectors.fullImage, {visible: true});
      const imageElement = await page.$(selectors.fullImage);
      await page.waitForFunction(imageElement => imageElement.src.length > 0, {}, imageElement);
      await page.waitForSelector(`${selectors.fullImageLoaderNotVisible1}, ${selectors.fullImageLoaderNotVisible2}`, {timeout: IMAGE_LOADING_TIMEOUT});
      const imageUrl = await imageElement.evaluate(imageElement => imageElement.src);
      if ((imageUrls.size < count) && (!imageUrls.has(imageUrl))) {
        imageUrls.add(imageUrl);
        imageNum += 1;
        images.push(miscUtils.downloadFile(imageUrl, path.join(destination, imageNum.toString())));
      } else
        break;
    }
  }
  return await Promise.all(images);
}
