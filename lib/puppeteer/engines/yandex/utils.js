module.exports = {
  makeSearch,
  retrieveImages
};

const selectors = require('./selectors.json');
const miscUtils = require('../../misc');
const path = require('path');

async function makeSearch(query, page) {
  await page.waitForSelector(selectors.queryInput, {visible: true});
  await page.type(selectors.queryInput, query);
  await Promise.all([
    page.waitForNavigation({waitUntil: 'domcontentloaded'}),
    page.click(selectors.searchButton)
  ]);
}

async function retrieveImages(count, destination, page) {
  await page.waitForSelector(selectors.resultsImage, {visible: true});
  const imageUrls = new Set();
  const images = [];
  let elementsToSkip = 0;
  let imageNum = -1;
  while (imageUrls.size < count) {
    const imageResultsElements = (await page.$$(selectors.resultsImage)).slice(elementsToSkip);
    elementsToSkip += imageResultsElements.length;
    for (const imageResultsElement of imageResultsElements) {
      await imageResultsElement.hover();
      const imageElementLink = await imageResultsElement.evaluate(imageResultsElement => imageResultsElement.href);
      const imageUrl = /.+?img_url=(.+?)(?:&.*$|$)/.exec(imageElementLink)[1]
        .replace(/%3A/g, ':')
        .replace(/%2F/g, '/');
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
