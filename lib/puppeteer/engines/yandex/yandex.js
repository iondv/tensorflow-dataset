const utils = require('./utils.js');

const url = 'https://yandex.ru/images/';

module.exports = async function (options, ppt, destination, query, quantity) {
  await ppt.page.goto(url);
  await utils.makeSearch(query, ppt.page);
  return await utils.retrieveImages(quantity, destination, ppt.page);
}
