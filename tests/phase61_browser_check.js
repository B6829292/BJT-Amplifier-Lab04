async (page) => {
  const checks = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const states = () => page.locator('.run-state').allTextContents();
  async function run(mode) {
    await page.locator('#analysis').selectOption(mode);
    await page.locator('#spice-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#spice-form button[type=submit]').disabled);
  }
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:900});
    await page.goto('http://127.0.0.1:5157/simulation');
    for (const mode of ['dc','ac','tran']) await run(mode);
    assert((await states()).every(s=>s.startsWith('Current')), 'Baseline retained runs not current');
    await page.locator('#spice-r1').fill('0x64');
    const hexadecimal = await states();
    assert(hexadecimal.every(s=>s.startsWith('Stale')), 'Invalid radix literal left current results');
    assert((await page.locator('#dc-annotation').innerText()).includes('available after'), 'Invalid input left live DC annotation');
    await run('dc');
    assert((await page.locator('#spice-status').innerText()).includes('R1: enter a finite positive number.'), 'Server did not reject radix input');
    assert(await page.locator('#run-dc table').count()===0 && await page.locator('#run-ac .plots svg').count()===1, 'Failure isolation broken');
    await page.locator('#spice-r1').fill('1_00');
    assert((await states())[1].startsWith('Current'), 'Server-accepted separators falsely stale AC');
    await run('dc');
    const separators = await states();
    assert(separators.every(s=>s.startsWith('Current')), 'Separators left false stale states');
    await page.locator('#spice-r1').fill('1e2');
    assert((await states()).every(s=>s.startsWith('Current')), 'Equivalent exponent notation marked stale');
    await page.locator('#analysis').selectOption('tran');
    await page.locator('#spice-frequency').fill('0x3e8');
    const source = await states();
    assert(source[0].startsWith('Current') && source[1].startsWith('Current') && source[2].startsWith('Stale'), 'Source freshness dependencies broken');
    checks.push({width,hexadecimal,separators,source,dc:await page.locator('#run-dc table').innerText()});
  }
  assert(errors.length===0, errors.join('\n'));
  return {checks,errors};
}
