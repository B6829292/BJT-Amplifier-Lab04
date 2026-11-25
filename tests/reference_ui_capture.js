async (page) => {
  await page.keyboard.press('Control+0');
  await page.goto('http://127.0.0.1:5088/simulation');
  await page.setViewportSize({width:1085,height:613});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Run Simulation',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#spice-form').hasAttribute('aria-busy'));
  await page.getByRole('button',{name:'Validate',exact:true}).click();
  await page.mouse.move(0,0);await page.locator('#analysis').evaluate(node=>node.blur());
  const metrics=[];
  for (const [width,height] of [[1085,613],[1920,1080],[1440,900],[1366,768]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`docs/evidence/reference-ui/dashboard-${width}.png`});
    metrics.push(await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,devicePixelRatio,regions:Object.fromEntries(['.lab-header','.lab-sidebar','.schematic-panel','.config-panel','.results-card'].map(selector=>{const box=document.querySelector(selector).getBoundingClientRect();return[selector,{x:box.x,y:box.y,width:box.width,height:box.height}]}))})));
  }
  // A mobile context avoids desktop scrollbars reducing a full-page bitmap to 375px.
  const mobile=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});
  try {
    const phone=await mobile.newPage();await phone.goto('http://127.0.0.1:5088/simulation');
    await phone.getByRole('button',{name:'Run Simulation',exact:true}).click();
    await phone.waitForFunction(()=>!document.querySelector('#spice-form').hasAttribute('aria-busy'));
    await phone.locator('#validate-lab').click();await phone.evaluate(()=>scrollTo(0,0));
    await phone.screenshot({path:'docs/evidence/reference-ui/dashboard-390.png',fullPage:true});
    await phone.screenshot({path:'docs/evidence/reference-ui/viewport-390.png'});
    metrics.push(await phone.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,devicePixelRatio,mobileEmulation:true})));
  } finally {await mobile.close();}
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(metrics=>window.labCaptureMetrics=metrics,metrics);
  return metrics;
}
