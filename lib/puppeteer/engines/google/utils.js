const {clearAndFill} = require('../../formTools');
const selectors = require('./selectors.json');

const packagingTypes = {
  "pallet48x40": "Pallet (48\"x40\")",
  "pallet48x48": "Pallet (48\"x48\")",
  "palletcustdim": "Pallet (Custom Dimensions)",
  "box": "Box",
  "crate": "Crate",
  "bundle": "Bundle",
  "drum": "Drum",
  "roll": "Roll",
  "bale": "Bale"
}

function packagingTypeVal(type) {
  return packagingTypes[type.toLowerCase()];
}

function postcodeToVal(postcode) {
  const [, state, code] = /(?:(\w+)\s+)?(\d+)/.exec(postcode);
  // return `${state} - ${code}`;
  return `${code}`;
}

// async function parseQuoteForm(page) {
//   const fields = {};
//   // const checkboxGroups = await page.$$(selectors.checkboxGroup);
//   // for (const group of checkboxGroups) {
//   //   const label = await group.$eval(selectors.checkboxLabel, el => el.innerText);
//   //   fields[label] = await group.$(selectors.checkboxInput);
//   // } ---DONE && CHECKED
//   console.log('stage 1');
//   const textGroups1 = await page.$$(selectors.formGroup1);
//   for (const textGroup of textGroups1) {
//     const level1Label = await textGroup.$(selectors.formGroupLabel1);
//     if (level1Label && !fields[level1Label]) {
//       const inputFields = await textGroup.$$(selectors.textInputField);
//       if (inputFields > 0) {
//         const label = await level1Label.evaluate(el => el.innerText);
//         if (inputFields.length > 1) fields[label] = inputFields;
//         else fields[label] = inputFields[0];
//       }
//     }
//   }
//   console.log(Object.keys(fields).length);
//   console.log('stage 2');
//   const textGroups2 = await page.$$(selectors.formGroup2);
//   for (const textGroup of textGroups2) {
//     const level2Label = await textGroup.$(selectors.formGroupLabel2);
//     if (level2Label && !fields[level2Label]) {
//       const inputFields = await textGroup.$$(selectors.textInputField);
//       if (inputFields.length > 0) {
//         const label = await level2Label.evaluate(el => el.innerText);
//         if (inputFields.length > 1) fields[label] = inputFields;
//         else fields[label] = inputFields[0];
//       }
//     }
//   }
//   console.log(Object.keys(fields).length);
//   console.log('stage 3');
//   const textGroups3 = await page.$$(selectors.formGroup3);
//   for (const textGroup of textGroups3) {
//     const level3Label = await textGroup.$(selectors.formGroupLabel3);
//     if (level3Label && !fields[level3Label]) {
//       const inputFields = await textGroup.$$(selectors.textInputField);
//       if (inputFields > 0) {
//         const label = await level3Label.evaluate(el => el.innerText);
//         if (inputFields.length > 1) fields[label] = inputFields;
//         else fields[label] = inputFields[0];
//       }
//     }
//   }
//   console.log(Object.keys(fields).length);
//   for (const key of Object.keys(fields)) {
//     if (Array.isArray(fields[key])) {
//       if (fields[key].length > 0) console.log(key + ': ' + fields[key].length)
//       else console.log(key + ': ERROR')
//     } else {
//       if (fields[key]) console.log(key + ': check')
//       else console.log(key + ': ERROR')
//     }
//   }
//   return true;
// }
// module.exports.parseQuoteForm = parseQuoteForm; TODO

async function fillQuoteForm(quote, page) {

  // CHOOSING DATE

  const temp = quote.loadingDate.toISOString().substring(0,10).split("-");
  const reqDate = `${temp[1]}/${temp[2]}/${temp[0]}`;
  await page.$eval(selectors.requestLoadingDate, (el, loadDate) => el.value = loadDate ? loadDate : el.value, reqDate);

  /*await page.click(selectors.requestLoadingDate); // TODO НЕ РАБОТАЕТ когда английский? да и можно без датапикера Error: date is not present in the date picker: 2020-08-12T00:00:00.000Z
  await page.waitForSelector(selectors.reactDatepickerContainer, {visible: true});
  const [match, month, year] = /(\w+)\s+(\d+)/.exec(await page.$eval(selectors.reactDatepickerMonthAndYear, el => el.innerText));
  const monthISO = ((month) => {
    switch (month) {
      case 'January':
        return '01';
      case 'February':
        return '02';
      case 'March':
        return '03';
      case 'April':
        return '04';
      case 'May':
        return '05';
      case 'June':
        return '06';
      case 'July':
        return '07';
      case 'August':
        return '08';
      case 'September':
        return '09';
      case 'October':
        return '10';
      case 'November':
        return '11';
      case 'December':
        return '12';
    }
  })(month);
  const days = await page.$$(selectors.reactDatepickerDays);
  const dayLinks = {};
  let monthOffset = 0;
  if (parseInt(await days[0].evaluate(el => el.innerText)) > 1)
    monthOffset = -1;
  let lastDayNum = 0;
  for (const dayEl of days) {
    let day = await dayEl.evaluate(el => el.innerText);
    let tempMonth = monthISO;
    let tempYear = year;
    const dayNum = parseInt(day);
    if (dayNum < lastDayNum) {
      monthOffset += 1;
    }
    if (monthOffset !== 0) {
      if (monthISO[0] === '0') tempMonth = parseInt(monthISO[1]) + monthOffset;
      else tempMonth = parseInt(monthISO) + monthOffset;
      if (tempMonth === 0) {
        tempMonth = 12;
        tempYear = parseInt(year) - 1;
      } else if (tempMonth === 13) {
        tempMonth = 1;
        tempYear = parseInt(year) + 1;
      }
      tempYear = tempYear.toString();
      tempMonth = tempMonth.toString();
    }
    if (tempMonth.length < 2) tempMonth = '0' + tempMonth;
    if (day.length < 2) day = '0' + day;
    const dateISO = (new Date((new Date(`${tempYear}-${tempMonth}-${day}T14:00:00.000Z`)).getTime() - 1000 * 60 * 60 * 24)).toISOString(); // TODO часовой пояс сервера может быть другой.
    dayLinks[dateISO] = dayEl;
    lastDayNum = dayNum;
  }
  if (dayLinks[quote.loadingDate.toISOString()]) { // TODO Не учитывает отображение дат на английскую раскладку языка. Первое число месяц, а не дата.
    const chosenDateEl = dayLinks[quote.loadingDate.toISOString()];
    const status = await chosenDateEl.evaluate(el => el.getAttribute('aria-disabled'))
    if (status === 'true')
      throw new Error('date can not be chosen from the date picker: ' + quote.loadingDate.toISOString());
    else await chosenDateEl.click();
  } else {
    throw new Error('date is not present in the date picker: ' + quote.loadingDate.toISOString());
  }*/
  // DATE CHOSEN

  const freightClassVal = quote.freightClass || "We\'ll calculate for you";
  await page.select(selectors.freightClass, freightClassVal);
  await page.waitForSelector(selectors.pickupCityOrPostalCode, {visible: true});
  await page.type(selectors.pickupCityOrPostalCode, postcodeToVal(quote.pickup));
  try {
    await page.waitForSelector(selectors.formatProposal, {visible: true});
    await page.click(selectors.formatProposal);
  } catch (e) {
    throw new Error('Departure location is not found.');
  }
  await page.waitForSelector(selectors.deliveryCityOrPostalCode, {visible: true});
  await page.type(selectors.deliveryCityOrPostalCode, postcodeToVal(quote.delivery));
  try {
    await page.waitForSelector(selectors.formatProposal, {visible: true});
    await page.click(selectors.formatProposal);
  } catch (e) {
    throw new Error('Arrival location is not found.');
  }
  await clearAndFill(page, selectors.itemDescription, quote.description);
  await page.select(selectors.packaging, packagingTypeVal(quote.packageType));
  let length, width;
  if (quote.length && quote.width) {
    length = quote.length;
    width = quote.width;
  } else {
    const dimensions = /[A-Za-z]+([0-9]+)x([0-9]+)/.exec(quote.packageType);
    if (!dimensions) throw new Error(`dimensions can not be deduced from packageType: ${quote.packageType}`);
    [, length, width] = dimensions;
  }
  await clearAndFill(page, selectors.palletLength, length);
  await clearAndFill(page, selectors.palletWidth, width);
  await clearAndFill(page, selectors.palletHeight, quote.height);
  await clearAndFill(page, selectors.weight, quote.weight);
  await clearAndFill(page, selectors.quantity, quote.quantity);
}
module.exports.fillQuoteForm = fillQuoteForm;
