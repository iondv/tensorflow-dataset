module.exports = {
  makeSearch,
  retrieveImages
};

const selectors = require('./selectors.json');

async function makeSearch(query, page) {
  await page.waitForSelector(selectors.queryInput, {visible: true});
  await page.type(selectors.queryInput, query);
  await page.keyboard.press('Enter');
}

async function retrieveImages(count, page) {
  await page.waitForSelector(selectors.resultsImage, {visible: true});
  const images = new Set();
  let elementsToSkip = 0;
  while (images.size < count) {
    const imageElements = (await page.$$(selectors.resultsImage)).slice(elementsToSkip);
    elementsToSkip += imageElements.length;
    for (const imageElement of imageElements) {
      await imageElement.hover();
      await page.waitForFunction(imageElement => imageElement.src.length > 0, {}, imageElement);
      if (images.size < count)
        images.add(await imageElement.evaluate(imageElement => imageElement.src));
    }
  }
  return Array.from(images);
}
