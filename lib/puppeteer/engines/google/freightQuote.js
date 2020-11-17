const selectors = require('./selectors.json');
const utils = require('./utils.js');
const url = 'https://www.google.com/imghp';

module.exports = function (options, ppt, args) { //checkQuote
  return new Promise(async (resolve, reject) => {
    await ppt.page.goto(url);
    await ppt.page.waitFor(50000);
    resolve();
  })
}
