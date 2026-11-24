async (page) => {
  const reference = __REFERENCE__;
  const report = {checks:[],runs:[],errors:[]};
  page.on('pageerror',e=>report.errors.push(e.message));
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  const states=()=>page.locator('.run-state').allTextContents();
  async function run(mode) {
    await page.locator('#analysis').selectOption(mode);
    const pending=page.waitForResponse(r=>r.url()==='http://127.0.0.1:5157/simulation'&&r.request().method()==='POST');
    await page.locator('#spice-form button').click();
    const payload=await(await pending).json();
    await page.waitForFunction(()=>!document.querySelector('#spice-form button').disabled);
    report.runs.push({width:page.viewportSize().width,...payload});return payload;
  }
  function compare(actual,expected) {
    const diffs={};
    for(const [key,value] of Object.entries(expected)) {
      const a=Array.isArray(value)?actual[key]:[actual[key]],b=Array.isArray(value)?value:[value];
      assert(a?.length===b.length,'Sample count: '+key);
      const difference=Math.max(...b.map((v,i)=>Math.abs(v-a[i])));
      const tolerance=key==='frequency_hz'?.1:key==='time_s'?1e-10:key==='ic'?1e-9:key.endsWith('_v')?1e-8:1e-5;
      assert(difference<=tolerance,'Reference mismatch '+key+': '+difference);diffs[key]=difference;
    }return diffs;
  }
  async function geometry(mode,data) {
    const result=await page.locator('#run-'+mode+' svg').evaluate((svg,{mode,data})=>{
      const x=mode==='ac'?data.frequency_hz:data.time_s;
      const ys=mode==='ac'?[data.gain_db,data.phase_deg]:[data.vin_v,data.vout_v];
      const names=mode==='ac'?['Gain','Phase']:['Vin','Vout'];
      const fx=mode==='ac'?Math.log10:v=>v;
      let points=0,maxError=0;
      for(let series=0;series<2;series++) {
        const samples=mode==='ac'?ys[series]:ys.flat();
        let low=Math.min(...samples),high=Math.max(...samples);
        const pad=(high-low||Math.abs(high)||1)*.08;low-=pad;high+=pad;
        const lines=[...svg.querySelectorAll('polyline')].filter(n=>n.dataset.series===names[series]);
        const expectedSegments=1+ys[series].slice(1).filter((v,i)=>mode==='ac'&&series===1&&Math.abs(v-ys[series][i])>180).length;
        if(lines.length!==expectedSegments)throw new Error('Phase split or series missing');
        const vertices=lines.flatMap(n=>n.getAttribute('points').trim().split(/\s+/).map(s=>s.split(',').map(Number)));
        if(vertices.length!==x.length)throw new Error('Rendered sample count mismatch');
        vertices.forEach(([px,py],i)=>{
          const xx=82+(fx(x[i])-fx(x[0]))/(fx(x.at(-1))-fx(x[0]))*236;
          const yy=16+(high-ys[series][i])/(high-low)*184;
          maxError=Math.max(maxError,Math.abs(px-xx),Math.abs(py-yy));points++;
        });
      }return {points,maxError};
    },{mode,data});
    assert(result.maxError<.02,'SVG differs from independent samples');return result;
  }
  for(const width of [1085,1280,390]) {
    await page.setViewportSize({width,height:width===1085?613:width===390?844:900});
    const analytical=[];
    for(const mode of ['fixed','emitter','divider']) {
      await page.goto('http://127.0.0.1:5157/?mode='+mode);
      await page.locator('#bias-form button').click();
      const ic=await page.locator('.results-card tr').nth(5).innerText();
      assert(ic.includes({fixed:'1.1300',emitter:'1.0263',divider:'1.2299'}[mode]),'Analytical calculation changed');
      analytical.push({mode,ic});
    }
    await page.goto('http://127.0.0.1:5157/simulation');
    const dc=await run('dc'),ac=await run('ac'),tran=await run('tran');
    const differences={dc:compare(dc.result,reference.dc),ac:compare(ac.result,reference.ac),tran:compare(tran.result,reference.tran)};
    assert(await page.locator('#run-ac svg').count()===1&&await page.locator('#run-tran svg').count()===1,'Expected two charts');
    const acGeometry=await geometry('ac',reference.ac),tranGeometry=await geometry('tran',reference.tran);
    const labels=await page.locator('#run-ac svg').textContent();
    assert(labels.includes('Gain (dB)')&&labels.includes('Phase (degrees)'), 'Dual-axis units missing');
    assert((await states()).every(s=>s.startsWith('Current')),'Retained states wrong');
    const layout=await page.evaluate(()=>({height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,
      resultsTop:document.querySelector('#results').getBoundingClientRect().top+scrollY,sourceForm:document.querySelector('#spice-amplitude').form.id}));
    assert(!layout.overflow&&layout.sourceForm==='spice-form','Layout/form association failed');
    if(width!==390)assert(layout.resultsTop<500&&layout.height<1000,'Dashboard not compact');
    await page.screenshot({path:'.playwright-mcp/phase62-after-'+width+'.png',fullPage:true});
    if(width===1085)await page.screenshot({path:'.playwright-mcp/phase62-after-reference-viewport.png'});
    await page.locator('#spice-amplitude').fill('20');await page.locator('#spice-frequency').fill('2000');
    const sourceStates=await states();
    assert(sourceStates[0].startsWith('Current')&&sourceStates[1].startsWith('Current')&&sourceStates[2].startsWith('Stale'),'External source inputs did not stale transient');
    const changed=await run('tran');compare(changed.result,reference.tran_changed);await geometry('tran',reference.tran_changed);
    await page.locator('#spice-re').fill('2');assert((await states()).every(s=>s.startsWith('Stale')),'Circuit staleness failed');
    const re2=await run('dc');compare(re2.result,reference.dc_re2);
    await page.locator('#spice-re').fill('0');const invalid=await run('dc');
    assert(invalid.error&&!invalid.result&&await page.locator('#run-dc table').count()===0,'Validation retained failed result');
    assert(await page.locator('#run-ac svg').count()===1,'Failure discarded unrelated graph');
    await page.locator('#spice-re').fill('1');await run('dc');
    await page.route('**/simulation',async route=>{const response=await route.fetch({url:'http://127.0.0.1:5158/simulation'});await route.fulfill({response});});
    const missing=await run('ac');await page.unroute('**/simulation');
    assert(missing.error?.includes('model not found')&&await page.locator('#run-ac svg').count()===0,'Missing model showed graph');
    await run('ac');
    report.checks.push({width,analytical,differences,acGeometry,tranGeometry,layout,sourceStates,invalid:invalid.error,missing:missing.error});
  }
  assert(!report.errors.length,report.errors.join('\n'));
  await page.evaluate(data=>window.phase62Evidence=data,report);
  return {checks:report.checks,runs:report.runs.length,errors:report.errors};
}
