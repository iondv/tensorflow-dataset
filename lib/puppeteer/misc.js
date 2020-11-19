module.exports = {
  downloadFile
}

const https = require('https');
const fs = require('fs');

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const base64Data = /^data:\w+?\/(\w+?);(\w+?);\s*(?:charset=.+)*,(.+)/.exec(url);
    if (base64Data) {
      const [
        ,
        fileType,
        encoding,
        data
      ] = base64Data;
      const filePath = `${destination}.${fileType}`;
      return new Promise((resolve) => {
        fs.writeFile(filePath, Buffer.from(data, encoding), (err) => err? reject(err) : resolve(filePath));
      });
    } else {
      https.get(url, response => {
        const fileType = response.headers["content-type"].split('/')[1];
        const filePath = `${destination}.${fileType}`;
        const out = fs.createWriteStream(filePath);
        response.pipe(out);

        out.on('finish', () => {
          out.close();
          resolve(filePath);
        })
          .on('error', error => {
            fs.unlinkSync(filePath);
            reject(error);
          });
      });
    }
  });
}
