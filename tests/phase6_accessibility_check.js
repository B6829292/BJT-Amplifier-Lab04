async (page) => {
  const result = {checks:[],errors:[]};
  page.on('pageerror',e=>result.errors.push(e.message));
  async function scan() {
    return await page.evaluate(() => {
      const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);
      const luminance=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      const lowContrast=[],smallText=[];
      for(const n of document.querySelectorAll('body *')) {
        if(!n.getClientRects().length||![...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())||['SCRIPT','STYLE','OPTION','TITLE','DESC'].includes(n.tagName.toUpperCase()))continue;
        const s=getComputedStyle(n);let p=n,b;
        while(p){b=rgb(getComputedStyle(p).backgroundColor);if(b[3]===undefined||b[3]===1)break;p=p.parentElement;}
        if(!p)b=[255,255,255];
        const color=n.namespaceURI?.includes('svg')?s.fill:s.color;
        if(!color.startsWith('rgb'))continue;
        const a=luminance(rgb(color)),c=luminance(b),ratio=(Math.max(a,c)+.05)/(Math.min(a,c)+.05);
        const size=parseFloat(s.fontSize),large=size>=24||(size>=18.66&&Number(s.fontWeight)>=700);
        if(ratio<(large?3:4.5))lowContrast.push({text:n.textContent.trim().slice(0,80),ratio});
        const matrix=n.getScreenCTM?.();const renderedSize=matrix?size*Math.hypot(matrix.a,matrix.b):size;
        if(renderedSize<12)smallText.push({text:n.textContent.trim().slice(0,40),size:renderedSize});
      }
      const controls=[...document.querySelectorAll('input,select')].filter(n=>!n.disabled&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden');
      return {lowContrast,smallText,visibleControlCount:controls.length,
        unlabelled:controls.filter(n=>!n.labels?.length&&!n.getAttribute('aria-label')).map(n=>n.id),
        missingDescriptionTargets:controls.filter(n=>(n.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).some(id=>!document.getElementById(id))).map(n=>n.id),
        overflow:document.documentElement.scrollWidth>innerWidth,
        layout:{viewport:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth},
        outsideViewport:[...document.querySelectorAll('button,input,select,.card')].filter(n=>n.getClientRects().length&&n.getBoundingClientRect().right>document.documentElement.clientWidth+1).map(n=>({tag:n.tagName,id:n.id,right:n.getBoundingClientRect().right})),
        headingSizes:[...document.querySelectorAll('h1,h2')].map(n=>({text:n.textContent.trim(),size:getComputedStyle(n).fontSize}))};
    });
  }
  for(const width of [1085,1280,390]) {
    await page.setViewportSize({width,height:900});
    for(const route of ['/simulation','/?mode=fixed','/?mode=emitter','/?mode=divider']) {
      await page.goto('http://127.0.0.1:5157'+route);
      await page.keyboard.press('Tab');
      const skip=await page.evaluate(()=>({text:document.activeElement.textContent.trim(),outline:getComputedStyle(document.activeElement).outlineWidth}));
      const focus=[];
      for(let i=0;i<45;i++){
        await page.keyboard.press('Tab');
        focus.push(await page.evaluate(()=>({tag:document.activeElement.tagName,id:document.activeElement.id,outline:getComputedStyle(document.activeElement).outlineWidth})));
      }
      result.checks.push({width,route,state:'ready',skip,focus,scan:await scan()});
      if(route==='/simulation') {
        for(const mode of ['dc','ac','tran']) {
          await page.locator('#analysis').selectOption(mode);
          await page.locator('#spice-form button').focus();await page.keyboard.press('Space');
          await page.waitForFunction(()=>!document.querySelector('#spice-form button').disabled);
        }
        const region=page.locator('#run-ac .plots');await region.focus();
        const needsScroll=await region.evaluate(n=>n.scrollWidth>n.clientWidth);
        if(needsScroll){await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('#run-ac .plots').scrollLeft>0);}
        const chart=await region.evaluate(n=>({role:n.getAttribute('role'),label:n.getAttribute('aria-label'),outline:getComputedStyle(n).outlineWidth,scrollLeft:n.scrollLeft}));
        await page.keyboard.press('Tab');
        const leavesChart=await region.evaluate(n=>document.activeElement!==n);
        result.checks.push({width,route,state:'completed',chart,leavesChart,scan:await scan()});
        await page.locator('#spice-re').fill('0');
        result.checks.push({width,route,state:'stale',scan:await scan()});
        await page.locator('#spice-form button').click();await page.waitForFunction(()=>!document.querySelector('#spice-form button').disabled);
        result.checks.push({width,route,state:'failed',scan:await scan()});
      }
    }
  }
  await page.evaluate(data=>{window.phase6A11y=data;},result);
  return result.checks.map(c=>({width:c.width,route:c.route,state:c.state,lowContrast:c.scan.lowContrast,
    unlabelled:c.scan.unlabelled,overflow:c.scan.overflow,outsideViewport:c.scan.outsideViewport,skip:c.skip,chart:c.chart,leavesChart:c.leavesChart}));
}
