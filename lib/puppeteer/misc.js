module.exports = {
  downloadFile
}

const https = require('https');
const fs = require('fs');
const path = require('path');

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      const fileType = response.headers["content-type"].split('/')[1];
      const file = `${destination}.${fileType}`;
      console.log(file);
      const out = fs.createWriteStream(file);
      response.pipe(out);

      out.on('finish', () => {
        out.close();
        resolve(file);
      })
        .on('error', error => {
          fs.unlinkSync(file);
          reject(error);
        });
    });
  });
}
