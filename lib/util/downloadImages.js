module.exports = download;

async function download(downloaderItem) {
  console.log(downloaderItem);
  await require('../puppeteer/puppeteer').puppeteerExec({}, 'downloadImages', ['google']);
}
