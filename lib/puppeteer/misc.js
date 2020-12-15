module.exports = {
  downloadFile
}

const https = require('https');
const fs = require('fs');

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const base64Data = /^data:\w+?\/(\w+?);(\w+?);\s*(?:charset=.+)?,(.+)/.exec(url);
    if (base64Data) {
      const [
        ,
        fileType,
        encoding,
        data
      ] = base64Data;
      const filePath = `${destination}.${fileType}`;
      fs.writeFile(filePath, Buffer.from(data, encoding), (err) => err? reject(err) : resolve(filePath));
    } else {
      const httpsUrl = /^http:/.exec(url) ? `https${url.slice(4)}` : url;

      const request = https.get(httpsUrl, {timeout: 10000}, (response) => {
        response.on('error', (err) => {
          request.destroy();
          reject(err);
        });

        if (response.statusCode !== 200) {
          request.destroy();
          reject(new Error('The request did not succeed'));
        } else {
          if (!response.headers['content-type']) {
            request.destroy();
            reject(new Error('Unknown content type'));
          }
          const fileType = response.headers["content-type"].split('/')[1].split('+')[0].split(';')[0];
          const filePath = `${destination}.${fileType}`;
          const out = fs.createWriteStream(filePath);
          response.pipe(out);

          out.on('finish', () => {
            out.close();
            resolve(filePath);
          }).on('error', error => {
              fs.unlinkSync(filePath);
              reject(error);
            });
        }
      });

      request.on('error', (err) => {
        request.destroy();
        reject(err)
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('The connection has timed out'));
      })
    }
  });
}
