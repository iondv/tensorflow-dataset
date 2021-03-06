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

async function retrieveImages(count, offset, destination, page) {
  await page.waitForSelector(selectors.resultsImage, {visible: true});
  const imageUrls = new Set();
  let images = [];
  let elementsToSkip = 0;
  let imageNum = -1;
  let failedPromises = 0;
  let skipped = 0;
  while (imageUrls.size < count) {
    const imageResultsElements = (await page.$$(selectors.resultsImage)).slice(elementsToSkip);
    elementsToSkip += imageResultsElements.length;
    for (const imageResultsElement of imageResultsElements) {
      await imageResultsElement.hover();
      if (offset > skipped) {
        skipped += 1;
        imageNum += 1;
        continue;
      }
      const imageElementLink = await imageResultsElement.evaluate(imageResultsElement => imageResultsElement.href);
      const imageUrl = /.+?img_url=(.+?)(?:&.*$|$)/.exec(imageElementLink)[1]
        .replace(/%3A/g, ':')
        .replace(/%2F/g, '/');
      if ((imageUrls.size < count) && (!imageUrls.has(imageUrl))) {
        imageUrls.add(imageUrl);
        imageNum += 1;
        const testNum = imageNum;
        images.push(
          new Promise((resolve, reject) => {
            miscUtils.downloadFile(imageUrl, path.join(destination, imageNum.toString()))
              .then(file => {
                resolve(file)
              })
              .catch(err => {
                failedPromises += 1;
                resolve(null);
              })
          })
        );
      } else
        break;
    }
  }

  await Promise.all(images);

  if (failedPromises > 0) {
    images = images.concat(await retrieveImages(failedPromises, offset + count, destination, page));
  }

  return (await Promise.all(images))
    .filter(file => file !== null);
}
