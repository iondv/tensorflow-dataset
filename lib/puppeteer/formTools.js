const OPT_ELEM_WAIT_TIME = 30 * 1000;

async function clickDelayed(page, sel, times= 1, timeout=OPT_ELEM_WAIT_TIME) {
  await page.waitForSelector(sel,{visible:true,timeout:timeout});
  await page.focus(sel);
  if (times === 1)
    await page.$eval(sel, elem => elem.click());
  else
    await page.click(sel, {clickCount: times});

  return 0;
}

async function clearAndFill(page,sel,text) {
  await page.waitForSelector(sel, {visible: true});
  await clickDelayed(page,sel,3);
  await page.keyboard.press('Backspace');
  await page.type(sel,text.toString());
}

module.exports = {
  clickDelayed,
  clearAndFill
}
