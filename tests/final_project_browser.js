async (page, {baseURL = 'http://127.0.0.1:5088', artifactDir, rawMotionDir} = {}) => {
  const checks = [];
  const errors = [];
  const layouts = [];
  const frames = [];
  function check(condition, description) {
    if (!condition) throw new Error(description);
    checks.push(description);
  }
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.setViewportSize({width: 1085, height: 613});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto(`${baseURL}/simulation`);
  await page.evaluate(() => document.fonts.ready);
  const run = async () => {
    await page.getByRole('button', {name: 'Run Simulation', exact: true}).click();
    await page.waitForFunction(() => !document.querySelector('#spice-form').hasAttribute('aria-busy'));
    check((await page.locator('.run-state').allTextContents()).every(text => text.startsWith('Current')), 'ngspice completed DC, AC, and transient');
  };
  await run();
  await page.getByRole('button', {name: 'Validate', exact: true}).click();
  const solver = await page.evaluate(() => {
    const {dc, ac, tran} = LabDashboard.snapshot().records;
    return {vb: dc.result.vb, vce: dc.result.vce, ic: dc.result.ic,
      frequencies: ac.result.frequency_hz.length, transientSamples: tran.result.time_s.length};
  });
  check(solver.vce > 0 && solver.ic > 0 && solver.frequencies > 300 && solver.transientSamples > 100, 'Current solver data reached the UI');
  check(await page.locator('.solver-checks [data-check="input"]').getAttribute('data-state') === 'passed', 'Input validation runs on the current values');
  const expectedBenchmark = await page.evaluate(() => {
    const checks = Object.values(LabDashboard.snapshot().records).map(record => record.result.reference_checks);
    return checks.every(report => report?.length) ? 'Passed' : 'Not applicable';
  });
  check(await page.getByText(`Reference benchmark: ${expectedBenchmark}`, {exact: true}).count() === 1, 'Benchmark requires the documented reference fixture');
  check(await page.locator('.dc-current path').evaluateAll(paths => paths.length === 4 && paths.every(path => getComputedStyle(path).strokeDasharray === 'none' && path.getAttribute('marker-end') === 'url(#arrow-orange)' && path.getTotalLength() <= 24)), 'Both current branches use short continuous orange arrows');
  check(await page.locator('.current-glow').evaluate(node => getComputedStyle(node).filter.includes('current-glow')), 'Current glow uses the SVG filter');
  check(await page.locator('#circuit-svg .q-point').evaluate(group => {
    const {x, y, width, height} = group.querySelector('rect').getBBox();
    return x === 390 && y === 132 && width === 60 && height === 39 && [...group.querySelectorAll('text')].every(label => {
      const box = label.getBBox();
      return box.x >= x && box.y >= y && box.x + box.width <= x + width && box.y + box.height <= y + height;
    });
  }), 'Q-Point matches the reference bounds and contains its solver readouts');
  const topology = await page.locator('#circuit-svg').evaluate(svg => {
    const element = id => svg.querySelector(id);
    const end = (id, start = false) => {
      const path = element(id);
      return path.getPointAtLength(start ? 0 : path.getTotalLength());
    };
    const coordinates = node => [node.cx.baseVal.value, node.cy.baseVal.value];
    const connected = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < .01;
    const collectorNode = coordinates(element('[data-node="collector"]'));
    const emitterNode = coordinates(element('[data-node="emitter"]'));
    const hasPlate = (id, x, y) => {
      const box = element(id).getBBox();
      return box.x === x && box.y + box.height / 2 === y && box.width === 7;
    };
    return {
      collector: connected(end('#npn-collector'), {x: collectorNode[0], y: collectorNode[1]}),
      emitter: connected(end('#npn-emitter'), {x: emitterNode[0], y: emitterNode[1]}),
      ground: connected(end('#emitter-resistor'), end('#emitter-ground-lead', true)),
      input: hasPlate('#input-capacitor', 168, 124),
      output: hasPlate('#output-capacitor', 402, 104),
    };
  });
  check(Object.values(topology).every(Boolean), 'Rebuilt transistor leads, resistor, and capacitor plates align with the electrical routes');
  check(await page.locator('#circuit-svg .node-badge .schematic-subscript').count() === 3, 'Node voltages use mathematical subscripts');
  check(await page.locator('[data-icon="bias-divider"]').count() === 2, 'Both voltage dividers use the engineering icon');
  check(await page.locator('#run-tran [data-series="Vout"]').getAttribute('stroke-dasharray') === 'none', 'Transient output is green and solid');
  check(await page.locator('#run-ac [data-series="Phase"]').evaluateAll(paths => paths.length > 0 && paths.every(path => path.getAttribute('stroke-dasharray') !== 'none')), 'Bode phase stays dashed');

  const capture = async (name, options = {}) => {
    if (artifactDir) await page.screenshot({path: `${artifactDir}/${name}.png`, ...options});
  };
  for (const [width, height] of [[1085, 613], [1920, 1080], [1440, 900], [1366, 768], [820, 900], [390, 844]]) {
    await page.setViewportSize({width, height});
    await page.evaluate(() => {document.activeElement.blur(); window.scrollTo(0, 0);});
    const layout = await page.evaluate(() => {
      const box = selector => {
        const {x, y, width, height} = document.querySelector(selector).getBoundingClientRect();
        return [x, y, width, height].map(value => Math.round(value));
      };
      return {width: innerWidth, height: innerHeight, pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight,
        header: box('.lab-header'), sidebar: box('.lab-sidebar'), circuit: box('.schematic-stage'), config: box('.config-panel'), results: box('#results')};
    });
    check(layout.pageWidth <= width, `${width}px Lab04 has no page overflow`);
    if (width === 1085) {
      check(layout.results[1] + layout.results[3] <= height, 'Solved results and validation fit the reference viewport');
      check(layout.pageHeight <= height, 'The full Lab04 shell fits the reference viewport');
    }
    layouts.push(layout);
    await capture(`lab04-${width}`, {fullPage: width !== 1085});
  }
  await page.setViewportSize({width: 1085, height: 613});
  await page.evaluate(() => window.scrollTo(0, 0));
  if (artifactDir) {
    const components = {
      header: '.lab-header', 'sidebar-icons': '.lab-sidebar nav', 'bias-icons': '.bias-section', generator: '.signal-section',
      schematic: '#circuit-svg', configuration: '.config-panel', 'dc-results': '#run-dc', bode: '#run-ac',
      transient: '#run-tran', validation: '#run-validation',
    };
    for (const [name, selector] of Object.entries(components)) {
      await page.locator(selector).screenshot({path: `${artifactDir}/components/${name}.png`});
    }
  }

  await page.getByRole('link', {name: 'Validation', exact: true}).click();
  check(await page.locator('.nav-link[aria-current="location"]').innerText() === 'Validation', 'Lab04 Validation navigation targets solver checks');
  await capture('validation-lab04');
  await page.getByRole('link', {name: 'Reports', exact: true}).click();
  check(await page.locator('.nav-link[aria-current="location"]').innerText() === 'Reports', 'Lab04 Reports navigation targets current results');
  await capture('reports-lab04');
  await page.locator('.result-nav a[href="#run-ac"]').click();
  check(await page.locator('.result-nav .selected').innerText() === 'AC Response', 'Bode result selection follows the hash');
  await page.goBack();
  check(await page.locator('.result-nav .selected').innerText() === 'DC Bias', 'Result selection follows browser history');

  await page.evaluate(() => window.scrollTo(0, 0));
  const wave = () => page.evaluate(() => [...document.querySelectorAll('[data-signal-wave]')].map(node => node.getAttribute('points')));
  const pulseState = () => page.locator('[data-pulse]').evaluateAll(nodes => nodes.map(node => ({
    branch: node.dataset.pulse,
    offset: getComputedStyle(node).strokeDashoffset,
    time: node.getAnimations()[0]?.currentTime ?? null,
  })));
  const nodeTimes = () => page.locator('.node-pulse').evaluateAll(nodes => nodes.map(node => node.getAnimations()[0]?.currentTime ?? null));
  const reduced = await wave();
  await page.waitForTimeout(115);
  check(JSON.stringify(await wave()) === JSON.stringify(reduced), 'Reduced motion preserves a stable real waveform');
  check((await pulseState()).every(pulse => pulse.time === null), 'Reduced motion stops the traveling highlights');
  check((await nodeTimes()).every(time => time === null), 'Reduced motion stops the node pulses');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const recording = [];
  const writes = [];
  const fs = rawMotionDir && globalThis.process?.getBuiltinModule?.('node:fs/promises');
  const stage = await page.locator('#circuit-svg').boundingBox();
  let cdp;
  if (fs) {
    await fs.mkdir(rawMotionDir, {recursive: true});
    cdp = await page.context().newCDPSession(page);
    cdp.on('Page.screencastFrame', ({sessionId, data, metadata: {timestamp}}) => {
      if (recording.length < 64) {
        const filename = `motion-${String(recording.length).padStart(2, '0')}.jpg`;
        recording.push({filename, timestamp});
        writes.push(fs.writeFile(`${rawMotionDir}/${filename}`, Buffer.from(data, 'base64')));
      }
      void cdp.send('Page.screencastFrameAck', {sessionId}).catch(() => {});
    });
    await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 86, everyNthFrame: 2});
  }
  await page.getByRole('button', {name: 'Restart overlay animation'}).click();
  const initialPulses = await pulseState();
  const start = await page.evaluate(() => performance.now());
  for (let index = 0; index < 12; index++) {
    const state = await page.evaluate(() => ({time: performance.now(),
      vin: document.querySelector('#input-wave').getAttribute('points'),
      vout: document.querySelector('#output-wave').getAttribute('points')}));
    const filename = `animation/frame-${String(index).padStart(2, '0')}.png`;
    frames.push({index, timeMs: Math.round(state.time - start), vin: state.vin.slice(0, 30), vout: state.vout.slice(0, 30), filename});
    if (artifactDir) await page.locator('#circuit-svg').screenshot({path: `${artifactDir}/${filename}`});
    await page.waitForTimeout(65);
  }
  if (cdp) {
    await cdp.send('Page.stopScreencast');
    await Promise.all(writes);
    await cdp.detach();
  }
  check(new Set(frames.map(frame => frame.vin)).size > 4, 'Blue input moves across the frame sequence');
  check(new Set(frames.map(frame => frame.vout)).size > 4, 'Green output moves across the frame sequence');
  const movingPulses = await pulseState();
  check(movingPulses.length === 6 && movingPulses.every((pulse, index) => pulse.time > 0 && pulse.offset !== initialPulses[index].offset), 'Collector, emitter, input and output highlights move along their paths');
  await page.getByRole('button', {name: 'Pause overlay animation'}).click();
  const paused = await wave();
  const pausedPulses = await pulseState();
  const pausedNodes = await nodeTimes();
  await page.waitForTimeout(140);
  check(JSON.stringify(await wave()) === JSON.stringify(paused), 'Pause freezes both traces');
  check(JSON.stringify(await pulseState()) === JSON.stringify(pausedPulses), 'Pause freezes all directional highlights');
  check(JSON.stringify(await nodeTimes()) === JSON.stringify(pausedNodes), 'Pause freezes the node glows');
  await capture('animation-paused');
  await page.getByRole('button', {name: 'Resume overlay animation'}).click();
  await page.waitForTimeout(80);
  check(JSON.stringify(await wave()) !== JSON.stringify(paused), 'Resume advances from the paused time');
  check((await pulseState()).every((pulse, index) => pulse.time > pausedPulses[index].time), 'Resume advances every directional highlight');
  const resetFrame = await page.evaluate(() => {
    document.getElementById('restart-animation').click();
    return [...document.querySelectorAll('[data-signal-wave]')].map(node => node.getAttribute('points'));
  });
  check(JSON.stringify(resetFrame) === JSON.stringify(reduced), 'Restart restores the exact initial phase');
  check((await pulseState()).every(pulse => pulse.time !== null && pulse.time < 180), 'Restart rewinds all four highlights');
  check((await nodeTimes()).every(time => time !== null && time < 180), 'Restart rewinds both node glows');
  await page.locator('#spice-frequency').fill('2000');
  check(await page.locator('[data-tran-badge]').getAttribute('visibility') === 'hidden' && (await wave()).every(points => !points), 'Stale transient cannot animate or retain paths');
  check((await pulseState()).filter(pulse => ['input', 'output'].includes(pulse.branch)).every(pulse => pulse.time === null), 'A stale transient stops AC highlights');
  check((await page.locator('#run-dc .run-state').textContent()).startsWith('Current'), 'Source changes preserve current DC');
  await page.locator('#spice-re').fill('2');
  check((await pulseState()).every(pulse => pulse.time === null), 'A stale circuit stops both DC and AC highlights');
  const restored = await page.evaluate(() => {
    document.getElementById('reset-lab').click();
    return [...document.querySelectorAll('[data-signal-wave]')].map(node => node.getAttribute('points'));
  });
  check(JSON.stringify(restored) === JSON.stringify(reduced), 'Form Reset restores the retained default waveform at its initial phase');
  check(errors.length === 0, `Browser errors: ${errors.join(' | ')}`);
  return {checks, solver, layouts, frames, recording, stage, browserErrors: errors};
}
