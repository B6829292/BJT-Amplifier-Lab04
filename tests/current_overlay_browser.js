async (page, {baseURL, artifactDir}) => {
  const checks = [];
  const errors = [];
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
    checks.push(label);
  };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({width:1085,height:613});
  await page.goto(`${baseURL}/simulation`);

  const circuit = page.locator('#circuit-svg');
  const modelStatus = page.locator('#device-model-status');
  const arrows = page.locator('.dc-current [data-current-arrow]');
  const currentLayer = page.locator('.dc-current');
  const pulses = page.locator('.dc-motion [data-current-step]');
  const benchmark = page.locator('[data-check="reference"]');
  const overlay = page.getByRole('switch', {name:'Show DC Bias Overlay'});
  const pause = page.getByRole('button', {name:'Pause overlay animation'});
  const resume = page.getByRole('button', {name:'Resume overlay animation'});
  const restart = page.getByRole('button', {name:'Restart overlay animation'});
  const sections = await page.locator('body').innerText();
  check(!/instructor/i.test(sections), 'No instructor workflow on the project page');
  check(await modelStatus.getAttribute('data-state') === 'configured', 'Model availability is shown before the first run');
  check(await page.locator('[data-check="input"]').getAttribute('data-state') === 'passed', 'Default inputs are checked automatically');
  await page.getByRole('button', {name:'Run Simulation',exact:true}).click();
  await page.waitForFunction(() => !document.querySelector('#spice-form').hasAttribute('aria-busy'));
  check(await modelStatus.textContent() === 'Loaded by ngspice', 'The panel confirms the model actually loaded');
  const saved = await page.evaluate(() => LabDashboard.snapshot());
  check(saved.modelInfo.status === 'loaded' && !!saved.modelInfo.fingerprint, 'Exports retain actual model provenance');
  const benchmarkText = await benchmark.textContent();
  check(benchmarkText === `Reference benchmark: ${saved.modelInfo.reference ? 'Passed' : 'Not applicable'}`, `The benchmark reports eligible results automatically (${benchmarkText}, ${Object.keys(saved.records).join(', ')})`);
  const lab04Arrows = await arrows.evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
  check(lab04Arrows.length === 4 && await currentLayer.isVisible(), 'Lab04 shows four visible current arrows');
  await page.locator('#spice-frequency').fill('1500');
  check(await circuit.getAttribute('data-dc-active') === 'true' && await circuit.getAttribute('data-ac-active') === 'false', 'Editing the source preserves DC flow and clears stale AC motion');
  await page.locator('#spice-frequency').fill('1000');

  await page.locator('.model-provenance summary').click();
  if (artifactDir) await page.locator('#run-validation').screenshot({path:`${artifactDir}/model-validation.png`});
  await page.setViewportSize({width:393,height:852});
  check(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), 'Open model details fit the mobile viewport');
  if (artifactDir) await page.locator('#run-validation').screenshot({path:`${artifactDir}/model-validation-mobile.png`});
  await page.setViewportSize({width:1085,height:613});

  for (const mode of ['fixed','emitter','divider']) {
    await page.goto(`${baseURL}/simulation`);
    await page.locator(`[data-bias-link="${mode}"]`).click();
    check(await circuit.getAttribute('data-dc-active') === 'false', `${mode}: opens with no calculated flow`);
    check(await page.locator('#overlay-ac,#run-ac,#run-tran').count() === 0, `${mode}: analytical-only controls`);
    await page.getByRole('button', {name:'Calculate DC Bias'}).click();
    await page.waitForLoadState('load');
    check(await circuit.getAttribute('data-dc-active') === 'true', `${mode}: live flow after calculation`);
    check(JSON.stringify(await arrows.evaluateAll(nodes => nodes.map(node => node.getAttribute('d')))) === JSON.stringify(lab04Arrows), `${mode}: same arrow geometry as Lab04`);
    check(await arrows.evaluateAll(nodes => nodes.every(node => node.getAttribute('marker-end') === 'url(#arrow-orange)')), `${mode}: forward conventional current`);
    const delays = await pulses.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).animationDelay));
    check(delays.length === 4 && new Set(delays).size === 4, `${mode}: four staggered current pulses (${delays.join(', ')})`);
    if (artifactDir) await circuit.screenshot({path:`${artifactDir}/dc-${mode}.png`});
    await pause.click();
    check(await pulses.evaluateAll(nodes => nodes.every(node => getComputedStyle(node).animationPlayState === 'paused')), `${mode}: Pause freezes all pulses`);
    await resume.click();
    await restart.click();
    check(await pulses.evaluateAll(nodes => nodes.every(node => node.getAnimations()[0].currentTime < 250)), `${mode}: Start over resets the current motion`);
    await overlay.uncheck();
    check(!await currentLayer.isVisible(), `${mode}: DC overlay can be hidden`);
    await overlay.check();
    await page.emulateMedia({reducedMotion:'reduce'});
    check(await currentLayer.isVisible() && await pulses.evaluateAll(nodes => nodes.every(node => node.getAnimations().length === 0)), `${mode}: reduced motion retains static arrows`);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('#rc').fill('2.4');
    check(await circuit.getAttribute('data-dc-active') === 'false' && !await currentLayer.isVisible(), `${mode}: editing hides stale currents`);
  }
  check(errors.length === 0, errors.join('\n'));
  return {checks,errors,model:saved.modelInfo.source};
}
