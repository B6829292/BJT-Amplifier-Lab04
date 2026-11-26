async (page, {baseURL, artifactDir}) => {
  const errors = [];
  const checks = [];
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
    checks.push(label);
  };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({width: 1085, height: 613});
  await page.goto(`${baseURL}/simulation`);

  const bypass = page.getByLabel('Emitter Bypass', {exact:true});
  const ce = page.locator('#spice-ce');
  const branch = page.locator('[data-emitter-bypass]');
  const marker = page.locator('#run-ac [data-plot-tooltip]');
  const benchmark = page.locator('[data-check="reference"]');
  const amplitude = page.locator('#spice-amplitude');
  const frequency = page.locator('#spice-frequency');
  const amplitudeUnit = page.getByLabel('Input amplitude unit');
  const frequencyUnit = page.getByLabel('Input frequency unit');
  const fit = page.getByRole('button', {name:'Fit circuit to screen'});
  const stage = page.locator('.schematic-stage');
  const snapshot = () => page.evaluate(() => LabDashboard.snapshot());
  async function run() {
    await page.getByRole('button', {name:'Run Simulation', exact:true}).click();
    await page.waitForFunction(() => !document.querySelector('#spice-form').hasAttribute('aria-busy'));
    return snapshot();
  }
  const validate = () => page.getByRole('button', {name:'Validate', exact:true}).click();

  check(await bypass.inputValue() === 'off' && await ce.isDisabled(), 'Bypass defaults Off with capacity disabled');
  check(await branch.getAttribute('visibility') === 'hidden', 'Bypass symbol is hidden when Off');
  check(await benchmark.innerText() === 'Reference benchmark: Not run', 'Reference check initially awaits solver results');
  const off = await run();
  check(Object.values(off.records).every(record => record.current && !record.result.netlist.includes('\nCE ')), 'Off uses the legacy topology in every analysis');
  await amplitudeUnit.selectOption('V');
  await frequencyUnit.selectOption('kHz');
  check(await amplitude.inputValue() === '0.01' && await frequency.inputValue() === '1', 'Changing units converts 10 mV and 1000 Hz without changing the signal');
  check((await snapshot()).records.tran.current, 'Equivalent generator units preserve transient freshness');
  check(await page.locator('[data-knob="amplitude"]').getAttribute('aria-valuetext') === '0.01 V peak', 'Rotary accessibility follows the selected amplitude unit');
  check(await page.locator('[data-source-amplitude-unit]').textContent() === 'V', 'The schematic shows the selected amplitude unit');
  await amplitudeUnit.selectOption('uV');
  await frequencyUnit.selectOption('MHz');
  check(await amplitude.inputValue() === '10000' && await frequency.inputValue() === '0.001', 'Microvolts and megahertz are available');
  const equivalent = await run();
  check(equivalent.records.tran.inputs.frequency_unit === 'MHz' && equivalent.records.tran.inputs.amplitude_unit === 'uV', 'Run provenance records the selected units');
  check(equivalent.records.tran.result.netlist === off.records.tran.result.netlist, 'Equivalent unit selections generate the same ngspice netlist');
  await amplitudeUnit.selectOption('mV');
  await frequencyUnit.selectOption('Hz');
  check(await amplitude.inputValue() === '10' && await frequency.inputValue() === '1000', 'Switching units back restores the original readouts');
  await validate();
  const hasReference = Object.values(off.records).every(record => record.result.reference_checks?.length);
  check(await benchmark.innerText() === `Reference benchmark: ${hasReference ? 'Passed' : 'Not applicable'}`, 'Reference check applies only to the documented baseline');
  if (hasReference) {
    await page.locator('.model-provenance summary').click();
    check(await page.locator('#benchmark-measurements li').count() === 4, 'Benchmark exposes four measured and expected values');
    await page.locator('.model-provenance summary').click();
  }
  check(await marker.getAttribute('data-plot-reference') === 'true' && /1\.00 kHz.*4\.89 dB/.test(await marker.getAttribute('aria-label')), 'Default Bode probe uses the 1 kHz solver result');
  await frequencyUnit.selectOption('kHz');
  await frequency.fill('1.5');
  const changedSource = await snapshot();
  check(changedSource.records.ac.current && !changedSource.records.tran.current, 'Changing source frequency only makes transient stale');
  check(/1\.50 kHz/.test(await marker.getAttribute('aria-label')), 'Bode marker follows the generator without rerunning the sweep');
  await frequency.fill('1');
  await frequencyUnit.selectOption('Hz');

  await bypass.selectOption('on');
  check(await branch.getAttribute('visibility') === 'visible' && await ce.isEnabled(), 'Bypass enables the value field and draws the connected capacitor');
  check(Object.values((await snapshot()).records).every(record => !record.current), 'Switching topology makes retained results stale');
  check(await marker.getAttribute('visibility') === 'hidden', 'Stale AC data clears the generator marker');
  await ce.fill('0');
  await validate();
  check(await ce.getAttribute('aria-invalid') === 'true' && /enter/.test(await page.locator('[data-check="input"]').innerText()), 'Invalid capacitance is flagged by Validate');
  const failed = await run();
  check(Object.values(failed.records).every(record => /CE:/.test(record.error)), 'The server rejects an invalid capacitor for every analysis');
  await ce.fill('100');
  const on = await run();
  check(Object.values(on.records).every(record => record.current && record.result.netlist.includes('\nCE e 0 0.0001\n')), 'Every analysis runs with CE in parallel with RE');
  check(Math.abs(on.records.dc.result.vce - off.records.dc.result.vce) < .00001, 'Bypass leaves the DC operating point unchanged');
  const sample = on.records.ac.result.frequency_hz.indexOf(1000);
  const gain = on.records.ac.result.gain_db[sample];
  check(gain - off.records.ac.result.gain_db[sample] > 10, 'Bypass significantly increases measured 1 kHz gain');
  check(Math.max(...on.records.tran.result.vout_v) > 3 * Math.max(...off.records.tran.result.vout_v), 'Transient output reflects the bypassed circuit');
  await validate();
  check(await benchmark.innerText() === 'Reference benchmark: Not applicable', 'Bypassed mode retains truthful benchmark provenance');
  check(await page.locator('#results').evaluate(element => element.getBoundingClientRect().bottom <= innerHeight), 'Solved dashboard fits the desktop reference viewport');
  if (artifactDir) await page.screenshot({path:`${artifactDir}/bypass-on-desktop.png`});

  await page.setViewportSize({width:393,height:852});
  const fitted = () => stage.evaluate(el => el.querySelector('svg').getBoundingClientRect().right <= el.getBoundingClientRect().right + 1);
  check(await fit.getAttribute('aria-pressed') === 'true' && await fitted(), 'Mobile defaults to the full circuit');
  check(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), 'Mobile layout has no page-level horizontal overflow');
  if (artifactDir) await page.locator('.schematic-panel').screenshot({path:`${artifactDir}/bypass-on-mobile.png`});
  await amplitudeUnit.selectOption('V');
  await frequencyUnit.selectOption('kHz');
  check((await snapshot()).records.tran.current, 'Unit conversion preserves fresh results at mobile width');
  if (artifactDir) await page.locator('.signal-section').screenshot({path:`${artifactDir}/generator-units-mobile.png`});
  await fit.click();
  check(await fit.getAttribute('aria-pressed') === 'false' && !(await fitted()), 'Fit can be toggled to full-size panning');
  check(await stage.evaluate(el => { el.scrollLeft = el.scrollWidth; return el.scrollLeft > 0; }), 'Full-size mode can pan over to the load');
  await fit.click();
  await page.getByRole('button', {name:'Expand circuit schematic'}).click();
  check(await page.getByRole('button', {name:'Collapse circuit schematic'}).getAttribute('aria-pressed') === 'true', 'Expand remains available in Fit mode');
  await page.getByRole('button', {name:'Collapse circuit schematic'}).click();
  check(await fitted(), 'Collapse restores the fitted circuit');
  await ce.fill('47');
  check(Object.values((await snapshot()).records).every(record => !record.current), 'Changing enabled capacitance marks results stale');
  await page.getByRole('button', {name:'Reset', exact:true}).click();
  check(await bypass.inputValue() === 'off' && await ce.inputValue() === '100' && await ce.isDisabled(), 'Reset restores the unbypassed 100 µF defaults');
  check(await amplitudeUnit.inputValue() === 'mV' && await frequencyUnit.inputValue() === 'Hz' && await amplitude.inputValue() === '10' && await frequency.inputValue() === '1000', 'Reset restores default generator units and readouts');
  check(await branch.getAttribute('visibility') === 'hidden' && (await snapshot()).inputs.emitter_bypass === 'off', 'Reset restores topology in the export snapshot');
  check(errors.length === 0, errors.join('\n'));
  return {checks, errors, gainDbAt1kHz:{off:off.records.ac.result.gain_db[sample], on:gain}};
}
