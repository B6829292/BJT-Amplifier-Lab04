async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const base = 'http://127.0.0.1:5157';
  const results = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function run(mode) {
    await page.locator('#analysis').selectOption(mode);
    const response = page.waitForResponse(r => r.url() === base + '/simulation' && r.request().method() === 'POST');
    await page.locator('#spice-form button').click();
    const payload = await (await response).json();
    await page.waitForFunction(() => !document.querySelector('#spice-form button').disabled);
    return payload;
  }
  for (const width of [1280, 390]) {
    await page.setViewportSize({width, height: width === 390 ? 844 : 900});
    for (const mode of ['fixed', 'emitter', 'divider']) {
      await page.goto(base + '/?mode=' + mode);
      await page.locator('#bias-form button').click();
      assert(await page.locator('.results-card table').isVisible(), mode + ' results missing');
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Analytical overflow');
      results.push({width, mode, collectorCurrent:await page.locator('.results-card tr').nth(5).innerText()});
    }
    await page.screenshot({path:'.playwright-mcp/phase51-analytical-' + width + '.png', fullPage:true});
    await page.locator('#mode').selectOption('fixed');
    assert(await page.locator('.results-card table').isHidden(), 'Analytical stale results not hidden');
    assert(await page.locator('[data-input-row="re"]').isHidden(), 'Fixed mode still shows RE');
    await page.locator('#vcc').fill('0');
    await page.locator('#bias-form button').click();
    assert(await page.locator('#vcc').getAttribute('aria-invalid') === 'true', 'Analytical field error missing');
    await page.goto(base + '/simulation');
    const dc = await run('dc');
    const ac = await run('ac');
    const tran = await run('tran');
    assert(dc.result && ac.result && tran.result, 'Real engine run failed');
    assert(await page.locator('#run-dc td').first().innerText() === dc.result.vb.toFixed(4) + ' V', 'DC differs from solver');
    assert(await page.locator('.run-panel svg').count() === 2, 'Retained plots missing');
    assert((await page.locator('.run-state').allTextContents()).every(s => s.startsWith('Current')), 'Runs not simultaneously current');
    assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Simulation overflow');
    results.push({width, mode:'ngspice', dc:dc.result.vce, acPoints:ac.result.frequency_hz.length,
      gain1k:ac.result.gain_db[ac.result.frequency_hz.indexOf(1000)], transientPoints:tran.result.time_s.length});
    await page.screenshot({path:'.playwright-mcp/phase51-' + (width === 390 ? 'mobile' : 'desktop') + '.png',fullPage:true});
    await page.locator('#spice-frequency').fill('2000');
    const sourceStates = await page.locator('.run-state').allTextContents();
    assert(sourceStates[0].startsWith('Current') && sourceStates[2].startsWith('Stale'), 'Source staleness is wrong');
    await page.locator('#spice-re').fill('2');
    assert((await page.locator('.run-state').allTextContents()).every(s => s.startsWith('Stale')), 'Circuit staleness is wrong');
    await page.locator('#spice-re').fill('0');
    const failed = await run('tran');
    assert(failed.error && !failed.result, 'Invalid input succeeded');
    assert(await page.locator('#run-tran svg').count() === 0, 'Failed analysis kept graph');
    assert(await page.locator('#run-ac svg').count() === 1, 'Failure discarded other analysis');
    await page.locator('#spice-re').fill('1');
    await page.locator('#spice-amplitude').fill('20');
    const changed = await run('tran');
    assert(Math.max(...changed.result.vin_v) > Math.max(...tran.result.vin_v) * 1.9, 'Source amplitude did not change solver data');
    assert(changed.result.time_s.at(-1) < tran.result.time_s.at(-1), 'Source frequency did not change duration');
  }
  await page.goto(base + '/simulation');
  await run('dc');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/simulation', async route => { await gate; await route.continue(); });
  await page.locator('#spice-form button').click();
  await page.locator('#analysis').selectOption('ac');
  const pending = await page.locator('#run-dc .run-state').innerText();
  release();
  await page.waitForFunction(() => !document.querySelector('#spice-form button').disabled);
  await page.unroute('**/simulation');
  assert(pending.startsWith('Running'), 'Pending run falsely became current');
  await page.evaluate(() => {
    const form = document.querySelector('#spice-form');
    const option = document.createElement('option');
    option.value = 'invalid'; form.analysis.append(option); form.analysis.value = 'invalid'; form.submit();
  });
  await page.waitForLoadState('load');
  await page.locator('#analysis').selectOption('tran');
  assert(await page.locator('#source-fields').isVisible(), 'Invalid-mode recovery broke source controls');
  assert(errors.length === 0, errors.join('\n'));
  return {results, errors};
}
