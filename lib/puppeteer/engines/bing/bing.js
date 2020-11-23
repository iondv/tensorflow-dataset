const utils = require('./utils.js');

const url = 'https://www.bing.com/?scope=images&nr=1&FORM=NOFORM';

module.exports = async function (options, ppt, destination, query, quantity) {
  await ppt.page.goto(url);
  await utils.makeSearch(query, ppt.page);
  return await utils.retrieveImages(quantity, 0, destination, ppt.page);
}
