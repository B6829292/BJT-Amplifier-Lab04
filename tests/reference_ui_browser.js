async (page) => {
  const checks = [];
  function check(condition, name) { if (!condition) throw new Error(name); checks.push(name); }
  await page.keyboard.press('Control+0');
  await page.setViewportSize({width:1440,height:900});
  await page.goto('http://127.0.0.1:5088/simulation');
  const run = async () => {
    await page.getByRole('button',{name:'Run Simulation',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#spice-form').hasAttribute('aria-busy'));
  };
  check(await page.locator('#analysis').inputValue() === 'all','enhanced default runs all analyses');
  check((await page.locator('#run-dc .run-state').textContent()).includes('Not run'),'initial state has no fabricated run');
  check(await page.locator('[data-tran-badge]').getAttribute('visibility') === 'hidden','empty circuit has no invented signal waveform');
  await page.getByRole('button',{name:'Validate',exact:true}).click();
  check((await page.locator('#validation-check').textContent()).includes('0/3'),'validation never claims unrun results passed');
  await run();
  check((await page.locator('.run-state').allTextContents()).every(t=>t.startsWith('Current')),'all three real analyses complete');
  check(await page.locator('#run-ac polyline[data-series="Gain"]').count() > 0,'AC trace rendered from results');
  check(await page.locator('#run-tran polyline[data-series="Vout"]').count() > 0,'transient trace rendered from results');
  check(await page.locator('#dc-region').count() === 1,'DC operating region is derived from actual node voltages');
  check((await page.locator('[data-signal-wave="vout"]').getAttribute('points')).split(' ').length > 10,'overlay output uses actual transient samples');
  const acChart=page.locator('#run-ac .plots svg');
  await acChart.hover();
  check(await page.locator('#run-ac [data-plot-tooltip]').getAttribute('visibility')==='visible','Bode pointer tooltip shows real samples');
  await acChart.focus();await acChart.press('End');
  check((await page.locator('#run-ac [data-plot-tooltip]').getAttribute('aria-label')).includes('Gain ='),'Bode keyboard tooltip reads gain and phase');
  check(await page.locator('[data-dc-node="vc"]').evaluate(node=>node.textContent.includes(LabDashboard.snapshot().records.dc.result.vc.toFixed(2)) && node.closest('[data-dc-badge]').getAttribute('visibility')==='visible'),'DC annotation has visible solver data');
  await page.locator('#overlay-dc').uncheck();
  check(await page.locator('.dc-layer').evaluate(x=>getComputedStyle(x).display)==='none','DC overlay switch hides annotations');
  await page.locator('#overlay-dc').check();
  await page.locator('#overlay-ac').uncheck();
  check(await page.locator('.ac-layer').evaluate(x=>getComputedStyle(x).display)==='none','AC overlay switch hides illustration');
  await page.locator('#overlay-ac').check();
  await page.locator('#pause-animation').click();
  check(await page.locator('#pause-animation').getAttribute('aria-pressed')==='true','pause animation exposes state');
  await page.locator('.flow-path').first().evaluate(node=>node.getAnimations().forEach(animation=>animation.currentTime=600));
  await page.locator('#restart-animation').click();
  check(await page.locator('#pause-animation').getAttribute('aria-pressed')==='false','restart resumes animation');
  check(await page.locator('.flow-path').first().evaluate(node=>node.getAnimations().every(animation=>animation.currentTime<250)),'animation reset restarts the presentation timeline');
  await page.locator('#spice-amplitude').fill('20');
  check((await page.locator('#run-tran .run-state').textContent()).startsWith('Stale'),'source edit stales transient');
  check(await page.locator('[data-tran-badge]').getAttribute('visibility')==='hidden','source edit hides stale signal overlays');
  check((await page.locator('#run-dc .run-state').textContent()).startsWith('Current'),'source edit preserves DC freshness');
  check((await page.locator('#run-ac .run-state').textContent()).startsWith('Current'),'source edit preserves AC freshness');
  const knob=page.locator('[data-knob="frequency"]');
  const prior=await page.locator('#spice-frequency').inputValue();
  await knob.focus();await knob.press('ArrowUp');
  check(await page.locator('#spice-frequency').inputValue() !== prior,'rotary keyboard changes submitted frequency');
  const box=await knob.boundingBox();
  const beforeDrag=await page.locator('#spice-frequency').inputValue();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2-20);await page.mouse.up();
  check(await page.locator('#spice-frequency').inputValue() !== beforeDrag,'rotary pointer drag changes submitted frequency');
  const touch=await page.context().newCDPSession(page);
  const beforeTouch=await page.locator('#spice-frequency').inputValue();
  try {
    await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2-16}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } finally {await touch.send('Emulation.setTouchEmulationEnabled',{enabled:false});await touch.detach();}
  check(await page.locator('#spice-frequency').inputValue() !== beforeTouch,'emulated touch drag synchronizes rotary input');
  await page.locator('#spice-re').fill('2');
  check((await page.locator('.run-state').allTextContents()).every(t=>t.startsWith('Stale')),'circuit edit stales all retained analyses');
  check(await page.locator('[data-dc-badge]').first().getAttribute('visibility')==='hidden','stale DC annotations are hidden');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  check(await page.locator('#spice-re').inputValue()==='1','reset restores circuit defaults');
  check(await page.locator('#spice-amplitude').inputValue()==='10','reset restores external form-associated amplitude');
  check(await page.locator('#spice-frequency').inputValue()==='1000','reset restores knob frequency');
  check(await page.locator('#analysis').inputValue()==='all','reset restores all-analysis mode');
  await page.getByRole('button',{name:'Validate',exact:true}).click();
  check((await page.locator('#validation-check').textContent()).includes('3 current analyses'),'validate checks real current results');
  check((await page.locator('#validation-check').textContent()).includes('Not run'),'validate does not claim instructor validation');
  check(await page.locator('.solver-checks [data-check="dc"]').getAttribute('data-state')==='passed','DC check represents current solver completion');
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-results').click();
  const download=await downloadPromise;
  check(download.suggestedFilename()==='lab04-results.json','export downloads results JSON');
  let exported='';for await (const chunk of await download.createReadStream()) exported+=chunk;
  check(JSON.parse(exported).records.tran.result.time_s.length>50,'downloaded JSON contains actual transient samples');
  const snapshot=await page.evaluate(()=>window.LabDashboard.snapshot());
  check(snapshot.records.ac.current && snapshot.records.ac.result.frequency_hz.length>10,'export snapshot contains current actual samples');
  await page.locator('#guide-toggle').click();check(await page.locator('#operation-guide').isVisible(),'operation guide opens');await page.locator('#guide-toggle').click();
  const savePromise=page.waitForEvent('download');await page.locator('#save-project').click();
  check((await savePromise).suggestedFilename()==='lab04-project.json','Save Project downloads actual configuration and data');
  await page.locator('#expand-circuit').click();check(await page.locator('.circuit-expanded').count()===1,'circuit expand works');await page.keyboard.press('Escape');check(await page.locator('.circuit-expanded').count()===0,'escape collapses circuit');
  await page.locator('#spice-r1').fill('nan');await run();
  check((await page.locator('#spice-status').textContent()).startsWith('Error:'),'invalid simulation reports failure');
  check((await page.locator('.run-state').allTextContents()).every(t=>t.startsWith('Failed')),'failed reruns never retain successful states');
  await page.getByRole('button',{name:'Reset',exact:true}).click();await run();
  for (const [width,height] of [[1920,1080],[1440,900],[1366,768],[1085,613],[390,844]]) {
    await page.setViewportSize({width,height});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no document overflow at ${width}×${height}`);
    check(await page.locator('#spice-vcc').isVisible(),`configuration remains accessible at ${width}`);
    if(width>=1085)check(await page.locator('.results-card').evaluate((node,height)=>node.getBoundingClientRect().bottom<=height,height),`populated results fit desktop viewport at ${width}`);
    if(width===390) {
      check(await page.locator('.schematic-stage').evaluate(node=>node.querySelector('svg').getBoundingClientRect().left>=node.getBoundingClientRect().left-1),'mobile circuit starts at its left edge');
      check(await page.locator('.schematic-stage').evaluate(node=>{node.scrollLeft=node.scrollWidth;const visible=node.querySelector('svg').getBoundingClientRect().right<=node.getBoundingClientRect().right+1;node.scrollLeft=0;return visible;}),'mobile circuit can pan to the output node');
    }
  }
  await page.setViewportSize({width:1440,height:900});
  const native=await page.context().browser().newContext({javaScriptEnabled:false});
  try {
    const plain=await native.newPage();await plain.goto('http://127.0.0.1:5088/simulation');
    await plain.getByRole('button',{name:'Run Simulation',exact:true}).click();
    check((await plain.locator('#spice-status').textContent()).includes('Simulation successful'),'native form submits supported DC without JavaScript');
  } finally {await native.close();}
  const report={passed:checks.length,checks,environment:await page.evaluate(()=>navigator.userAgent),physicalTouchDevice:false};
  await page.evaluate(report=>window.labUIVerification=report,report);
  return report;
}
