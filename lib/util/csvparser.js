const fs = require('fs');

module.exports = {
  parseCsv,
  parseCsvPartial,
  readLength
}

const LOADING_BATCH = 1000;

function readLength(csvPath) {
  const csv = loadCsv(csvPath);
  return csv.length - 2;
}

function parseCsv(csvPath, options = {}) {
  const csv = loadCsv(csvPath);
  let headers = null;
  let records = [];
  let pos = 0;
  while (pos < csv.length - 1) {
    const partial = parseCsvPartial(csvPath, LOADING_BATCH, pos);
    if (!headers)
      headers = partial.headers;
    records = records.concat(partial.records);
    pos += partial.records.length;
    if (partial.records.length === 0)
      pos += 1;
  }
  return {
    headers,
    records
  };
}

function parseCsvPartial(csvPath, count, offset = 0, options = {}) {
  const csv = loadCsv(csvPath);
  const headers = getHeaders(csv.slice(0, 1));
  let records;
  let position = offset;
  if (options.random) {
    const randomOffset = (csv.length - count) >= 0?
      Math.floor(Math.random() * (csv.length - 1 - count))
      : 0;
    position = randomOffset;
    records = getRecords(csv.slice(randomOffset + 1, randomOffset + 1 + count), headers);
  } else
    records = getRecords(csv.slice(offset + 1 , offset + 1 + count), headers);
  return {
    headers,
    records,
    position
  };
}

function loadCsv(path) {
  return fs.readFileSync(path).toString().split("\n");
}

function getHeaders(csv) {
  let headers = [];
  let i = 0;
  let part;
  for (const header of csv[0].split('\"')) {
    i += 1;
    if (i % 2 === 0) headers.push(part + header);
    part = header;
  }
  if (headers.length === 0)
    headers = csv[0].split(',');
  return headers.map(header => {
    if (header[0] === ',') return header.substr(1);
    else return header;
  });
}

function getRecords(csv, headers) {
  const csvTemp = Object.values(Object.assign({}, csv));
  const records = [];
  for (const row of csvTemp) {
    const cols = row.split(',');
    const record = {};
    let headerOffset = 0
    for (let i = 0; i < cols.length; i += 1) {
      if ((cols[i] !== undefined) && (cols[i].length > 0)) {
        if ((typeof cols[i] === 'string') && (cols[i][0] === '\"')) {
          // merge accidentally split columns
          let consolidated = cols[i];
          for (let j = i + 1; j < cols.length; j += 1) {
            consolidated += `, ${cols[j]}`;
            if(cols[j][cols[j].length - 1] === '\"') {
              cols[i] = consolidated.substring(1, consolidated.length - 1);
              record[translateHeader(headers[i - headerOffset])] = cols[i].trim();
              headerOffset += j - i;
              i = j;
              break;
            }
          }
        } else
          record[translateHeader(headers[i - headerOffset])] = cols[i].trim();
      } else
        record[translateHeader(headers[i - headerOffset])] = null
    }
    let validRecord = false;
    for (const key of Object.keys(record)) {
      if (record[key]) {
        validRecord = true;
        break;
      }
    }
    if (validRecord)
      records.push(record);
  }
  return records;
}

function translateHeader(header) {
  const translation = {
  }

  if (translation[header])
    return translation[header];
  else
    return header;
}
