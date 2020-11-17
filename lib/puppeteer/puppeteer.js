module.exports = {
  puppeteerExec
};

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const opts = {
  headless: process.env.NODE_ENV !== 'development',
  //defaultViewport: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    args: ['--no-sandbox',
      '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu',
      '--ignore-certificate-errors'], //'--window-size=1920x1080'
    isMobile: false, hasTouch: false, timeout:0
  //}
};
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36 Edg/84.0.522.52';

const runners = {
  'downloadImages': {
    'google': './engines/google/google.js',
    'yandex': './engines/yandex/yandex.js'
  }
}

/**
 * Takes a screenshot and saves it to ion storage, returns the file ID
 */
async function saveScreenshot(options, page, name = 'screenshot.png') {
  const tmpPath = path.join(__dirname, `${Math.random().toString(36).substring(2)}.png`)
  await page.screenshot({path: tmpPath, fullPage: true});
  const buf =  fs.readFileSync(tmpPath);
  fs.unlinkSync(tmpPath);
  return await options.dataRepo.fileStorage.accept({
    name: name,
    buffer: buf
  })
}

/**
 * Takes a pdf and saves it to ion storage, returns the file ID
 */
async function savePdf(options, page, name = 'page.pdf') {
  const tmpPath = path.join(__dirname, `${Math.random().toString(36).substring(2)}.png`)
  await page.pdf({path: tmpPath, fullPage: true});
  const buf =  fs.readFileSync(tmpPath);
  fs.unlinkSync(tmpPath);
  return await options.dataRepo.fileStorage.accept({
    name: name,
    buffer: buf
  })
}

function puppeteerExec(options, type, runnerCodes, ...args) {
  return new Promise(async (resolve, reject) => {
    const pptModule = {
      logs: '',
      saveScreenshot: saveScreenshot,
      savePdf: savePdf
    }
    try {
      if(typeof type !== 'string' || !runners[type])
        reject(`There are no runners for type ${type}`)
      if(!Array.isArray(runnerCodes))
        reject(`runnerCodes has to be an array.`)

      pptModule.browser = await puppeteer.launch(opts);
      pptModule.page = await pptModule.browser.newPage();
      await pptModule.page.setUserAgent(userAgent);

      const runnerPromises = runnerCodes.map(code => {
        if (!runners[type][code]){
          pptModule.logs += `There are no runners of type ${type} for code ${code}\n`
          return null;
        }
        return require(runners[type][code])(options, pptModule, ...args);
      }).filter(item => Boolean(item))
      Promise.all(runnerPromises)
        .then(async res => {
          if (Array.isArray(res)) res.forEach(res => pptModule.logs += `${res}\n`)
          await pptModule.browser.close();
          return resolve(pptModule.logs)
        })
        .catch(async e => {
          console.error(e);
          pptModule.logs += `${e.code}: ${e.message}\n`
          await pptModule.browser.close();
          return reject(pptModule.logs);
        })
    } catch(e) {
      console.error(e);
      pptModule.logs += `${e.code}: ${e.message}\n`
      await pptModule.browser.close();
      return reject(pptModule.logs);
    }
  });
}
