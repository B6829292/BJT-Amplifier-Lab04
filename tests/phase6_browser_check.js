/* Generated reference data is injected by phase6_reference.py, not by the app. */
async (page) => {
  const reference = __REFERENCE__;
  const base = 'http://127.0.0.1:5157';
  const evidence = {browser:page.context().browser().version(), cases:[], runs:[], errors:[]};
  page.on('pageerror', error => evidence.errors.push(error.message));
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const states = () => page.locator('.run-state').allTextContents();
  async function capture(id, width, observed) {
    const snapshot = await page.locator('body').ariaSnapshot();
    evidence.cases.push({id,width,status:'PASS',observed,snapshot});
  }
  async function run(mode) {
    await page.locator('#analysis').selectOption(mode);
    const pending = page.waitForResponse(response => response.url() === base + '/simulation' && response.request().method() === 'POST');
    await page.locator('#spice-form button').click();
    const payload = await (await pending).json();
    evidence.runs.push({width:page.viewportSize().width,...payload});
    await page.waitForFunction(() => !document.querySelector('#spice-form button').disabled);
    return payload;
  }
  function compare(actual, expected) {
    const differences = {};
    for (const [key, value] of Object.entries(expected)) {
      const a = Array.isArray(value) ? actual[key] : [actual[key]];
      const b = Array.isArray(value) ? value : [value];
      assert(a?.length === b.length, key + ' sample count differs');
      const error = Math.max(...b.map((v,i) => Math.abs(a[i]-v)));
      // Default ngspice print precision is seven significant digits; direct reference uses fifteen.
      const tolerance = key === 'frequency_hz' ? .1 : key === 'time_s' ? 1e-10 : key.endsWith('_v') ? 1e-8 : key === 'ic' ? 1e-9 : key.endsWith('db') || key.endsWith('deg') ? 1e-5 : 1e-5;
      assert(error <= tolerance, `${key}: ${error} > ${tolerance}`);
      differences[key] = {maxAbsoluteError:error,tolerance};
    }
    return differences;
  }
  async function geometry(mode, data) {
    return await page.locator('#run-'+mode).evaluate((panel,{mode,data}) => {
      const specs = mode === 'ac' ? [
        {x:data.frequency_hz,ys:[data.gain_db,data.phase_deg],log:true,wrapped:true}
      ] : [{x:data.time_s,ys:[data.vin_v,data.vout_v]}];
      let maxError = 0, pointsChecked = 0;
      [...panel.querySelectorAll('svg')].forEach((svg,index) => {
        const spec=specs[index], map=spec.log?Math.log10:v=>v;
        const xmin=map(spec.x[0]),xmax=map(spec.x.at(-1));
        let low=Math.min(...spec.ys.flat()),high=Math.max(...spec.ys.flat());
        const padding=(high-low||Math.abs(high)||1)*.08;low-=padding;high+=padding;
        const groups=[...new Set([...svg.querySelectorAll('polyline')].map(n=>n.dataset.series))];
        groups.forEach((group,series) => {
          if(mode==='ac') {
            low=Math.min(...spec.ys[series]);high=Math.max(...spec.ys[series]);
            const pad=(high-low||Math.abs(high)||1)*.08;low-=pad;high+=pad;
          }
          const lines=[...svg.querySelectorAll('polyline')].filter(n=>n.dataset.series===group);
          const actual=lines.flatMap(n=>n.getAttribute('points').trim().split(/\s+/).map(pair=>pair.split(',').map(Number)));
          if(actual.length!==spec.x.length) throw new Error('SVG point count differs');
          const segments=1+spec.ys[series].slice(1).filter((v,i)=>spec.wrapped&&series===1&&Math.abs(v-spec.ys[series][i])>180).length;
          if(lines.length!==segments) throw new Error('Phase discontinuity connected');
          actual.forEach(([x,y],i)=>{
            const px=82+(map(spec.x[i])-xmin)/(xmax-xmin)*236;
            const py=16+(high-spec.ys[series][i])/(high-low)*184;
            maxError=Math.max(maxError,Math.abs(x-px),Math.abs(y-py));pointsChecked++;
          });
        });
      });
      return {maxPixelError:maxError,pointsChecked};
    },{mode,data});
  }
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:width===1280?900:844});
    const analytical=[];
    for(const mode of ['fixed','emitter','divider']) {
      await page.goto(base+'/?mode='+mode);
      await page.locator('body').ariaSnapshot();
      for(const [key,value] of Object.entries({vcc:'12',rc:'2.2',beta:'100',vbe:'0.7',...(mode==='divider'?{r1:'100',r2:'22',re:'1'}:mode==='emitter'?{rb:'1000',re:'1'}:{rb:'1000'})})) await page.locator('#'+key).fill(value);
      await page.locator('#bias-form button').click();
      const ib=mode==='fixed'?11.3/1e6:mode==='emitter'?11.3/(1e6+101e3):(12*22/122-.7)/(100e3*22/122+101e3);
      const expected={ic:ib*100*1000,vce:12-ib*100*2200-(mode==='fixed'?0:ib*101*1000)};
      const rows=await page.locator('.results-card tr').allTextContents();
      const ic=Number(rows[5].match(/[\d.]+/)[0]),vce=Number(rows[3].match(/[\d.]+/)[0]);
      assert(Math.abs(ic-expected.ic)<=.00005&&Math.abs(vce-expected.vce)<=.00005,'Analytical mismatch '+mode);
      analytical.push({mode,ic_mA:ic,vce_V:vce,reference:expected});
      assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Analytical page overflow');
    }
    await page.screenshot({path:`.playwright-mcp/phase6-analytical-${width}.png`,fullPage:true});
    await capture('B1',width,analytical);
    await page.goto(base+'/simulation');
    await page.locator('body').ariaSnapshot();
    for(const [key,value] of Object.entries({vcc:'12',r1:'100',r2:'22',rc:'2.2',re:'1',rl:'10',cin:'10',cout:'10'})) await page.locator('#spice-'+key).fill(value);
    const dc=await run('dc');
    const dcErrors=compare(dc.result,reference.dc);
    const dcRows=await page.locator('#run-dc tr').allTextContents();
    for(const [i,key] of ['vb','ve','vc','vce','ic'].entries()) {
      const expected=(reference.dc[key]*(key==='ic'?1000:1)).toFixed(4);
      assert(dcRows[i].includes(expected),`DC displayed ${key} mismatch`);
    }
    await page.locator('#run-dc details').evaluate(n=>n.open=true);
    assert((await page.locator('#run-dc pre').last().innerText()).includes('v(b)'),'Missing real solver log');
    await page.locator('#run-dc details').evaluate(n=>n.open=false);
    await capture('B2',width,{display:dcRows,differences:dcErrors,model:dc.result.model,status:await states()});
    await page.locator('#spice-re').fill('2');
    assert((await states())[0].startsWith('Stale'),'DC not stale after RE edit');
    const re2=await run('dc');
    assert(Object.keys(dc.inputs).filter(key=>dc.inputs[key]!==re2.inputs[key]).join(',')==='re','B3 changed more than RE');
    await capture('B3',width,{before:dc.result,after:re2.result,differences:compare(re2.result,reference.dc_re2)});
    await page.locator('#spice-re').fill('1');await run('dc');
    const ac=await run('ac'),acErrors=compare(ac.result,reference.ac),acGeometry=await geometry('ac',reference.ac);
    assert(acGeometry.maxPixelError<.02&&acGeometry.pointsChecked===642,'AC geometry mismatch');
    const acText=await page.locator('#run-ac').innerText();
    assert(acText.includes('Frequency (Hz, log)')&&acText.includes('Gain (dB)')&&acText.includes('Phase (degrees)'),'AC axes/units missing');
    const index1k=ac.result.frequency_hz.indexOf(1000);
    await capture('B4',width,{differences:acErrors,geometry:acGeometry,gain1k_dB:ac.result.gain_db[index1k],phase1k_deg:ac.result.phase_deg[index1k],sampleCount:ac.result.frequency_hz.length});
    await page.locator('#analysis').selectOption('tran');await page.locator('#spice-amplitude').fill('10');await page.locator('#spice-frequency').fill('1000');
    const tran=await run('tran'),tranGeometry=await geometry('tran',reference.tran);
    assert(tranGeometry.maxPixelError<.02&&tranGeometry.pointsChecked===1016,'Transient geometry mismatch');
    const index=tran.result.time_s.findIndex(t=>t>=.00424);
    assert(tran.result.vin_v[index]>0&&tran.result.vout_v[index]<0,'Expected phase inversion absent');
    await capture('B5',width,{differences:compare(tran.result,reference.tran),geometry:tranGeometry,
      points:tran.result.time_s.length,end_s:tran.result.time_s.at(-1),vin_V:[Math.min(...tran.result.vin_v),Math.max(...tran.result.vin_v)],vout_V:[Math.min(...tran.result.vout_v),Math.max(...tran.result.vout_v)],
      phaseSample:{time_s:tran.result.time_s[index],vin_V:tran.result.vin_v[index],vout_V:tran.result.vout_v[index]}});
    assert((await states()).every(s=>s.startsWith('Current')),'Three retained runs not current');
    await page.screenshot({path:`.playwright-mcp/phase6-dashboard-${width}.png`,fullPage:true});
    await page.locator('#spice-amplitude').fill('20');await page.locator('#spice-frequency').fill('2000');
    const stale=await states();assert(stale[0].startsWith('Current')&&stale[1].startsWith('Current')&&stale[2].startsWith('Stale'),'Source freshness mismatch');
    const changed=await run('tran'),changedGeometry=await geometry('tran',reference.tran_changed);
    assert(changedGeometry.maxPixelError<.02,'Changed source geometry mismatch');
    await page.screenshot({path:`.playwright-mcp/phase6-source-changed-${width}.png`,fullPage:true});
    await capture('B6',width,{differences:compare(changed.result,reference.tran_changed),geometry:changedGeometry,staleBefore:stale,
      end_s:changed.result.time_s.at(-1),vinPeak_V:Math.max(...changed.result.vin_v),vout_V:[Math.min(...changed.result.vout_v),Math.max(...changed.result.vout_v)]});
    await page.locator('#spice-re').fill('0');
    assert((await states()).every(s=>s.startsWith('Stale')),'RE edit did not stale all retained analyses');
    const invalid=await run('tran');
    assert(invalid.error&&!invalid.result&&await page.locator('#run-tran svg').count()===0,'Invalid run showed results');
    assert(await page.locator('#run-ac svg').count()===1&&await page.locator('#run-dc table').count()===1,'Failure discarded independent retained results');
    const invalidText=await page.locator('#spice-status').innerText();
    await page.screenshot({path:`.playwright-mcp/phase6-invalid-${width}.png`,fullPage:true});
    await page.locator('#spice-re').fill('1');await run('tran');
    await page.route('**/simulation',async route=>{const response=await route.fetch({url:'http://127.0.0.1:5158/simulation'});await route.fulfill({response});});
    const missing=await run('ac');await page.unroute('**/simulation');
    assert(missing.error?.includes('model not found')&&!missing.result,'Missing model not reported');
    assert(await page.locator('#run-ac svg').count()===0&&await page.locator('#run-tran svg').count()===1&&await page.locator('#run-dc table').count()===1,'Failure isolation wrong');
    await page.screenshot({path:`.playwright-mcp/phase6-missing-model-${width}.png`,fullPage:true});
    await capture('B7',width,{invalid:invalidText,missingModel:await page.locator('#spice-status').innerText(),states:await states(),method:'Intercepted AC POST forwarded to actual missing-model Flask instance on port 5158; real JSON response fulfilled unchanged.'});
    await run('ac');
    assert(await page.locator('.run-panel svg').count()===2,'Recovery did not restore all plots');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert(!overflow,'Page overflows');
    await capture('B8',width,{overflow,chartCount:await page.locator('.run-panel svg').count(),screenshots:[`phase6-dashboard-${width}.png`,`phase6-source-changed-${width}.png`]});
  }
  assert(evidence.errors.length===0,evidence.errors.join('\n'));
  await page.evaluate(data=>{window.phase6Evidence=data;},evidence);
  return {browser:evidence.browser,cases:evidence.cases.map(({id,width,status})=>({id,width,status})),savedRuns:evidence.runs.length,errors:evidence.errors};
}
