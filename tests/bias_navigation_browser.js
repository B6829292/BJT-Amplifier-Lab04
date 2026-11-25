async (page, {baseURL = 'http://127.0.0.1:5088', artifactDir} = {}) => {
  const errors = [];
  const checks = [];
  const modes = {
    fixed: {label: 'Fixed Bias', ic: '1.1300 mA', vce: '9.5140 V'},
    emitter: {label: 'Emitter Bias (Unbypassed)', ic: '1.0263 mA', vce: '8.7054 V'},
    divider: {label: 'Voltage Divider Bias', ic: '1.2299 mA', vce: '8.0522 V'},
    simulation: {label: 'Voltage Divider Bias'},
  };
  const check = (condition, name) => {
    if (!condition) throw new Error(name);
    checks.push(name);
  };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const metrics = () => page.evaluate(() => {
    const find = selector => document.querySelector(selector);
    const style = selector => getComputedStyle(find(selector));
    return {
      sidebarWidth: Math.round(find('.lab-sidebar').getBoundingClientRect().width),
      headerHeight: Math.round(find('.lab-header').getBoundingClientRect().height),
      brand: style('.brand-name strong').font,
      sidebar: style('.nav-link').fontSize,
      config: style('.config-panel h2').backgroundImage,
      input: style('.config-panel .input-row input').backgroundImage,
      action: style('.config-actions button').backgroundImage,
      table: style('#run-dc td').borderBottomColor,
      icons: [...document.querySelectorAll('.lab-sidebar nav svg')].map(svg => svg.innerHTML),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  async function current(mode, expected, context) {
    const actual = await metrics();
    if (expected.headerHeight === undefined) delete actual.headerHeight;
    check(JSON.stringify(actual) === JSON.stringify(expected), `${context}: shared shell styles or dimensions changed (${JSON.stringify(actual)})`);
    check(!actual.overflow, `${context}: horizontal overflow`);
    const selected = page.locator('[data-bias-link][aria-current="page"]');
    check(await selected.count() === 1 && await selected.getAttribute('data-bias-link') === mode, `${context}: bias selection`);
    check(await page.locator('#project-bias').isVisible(), `${context}: project information is visible`);
    check(await page.locator('#project-bias').textContent() === modes[mode].label, `${context}: project bias`);
    check(await page.locator('[data-active-bias]').inputValue() === mode, `${context}: bias picker`);
    if (mode !== 'simulation') {
      check(await page.locator('#run-ac,#run-tran,#spice-form,#source-fields').count() === 0, `${context}: analytical capabilities`);
    }
  }

  for (const [width, height] of [[1085, 613], [1440, 900], [820, 900], [390, 844]]) {
    await page.setViewportSize({width, height});
    await page.goto(`${baseURL}/simulation`);
    await page.evaluate(() => document.fonts.ready);
    const shared = await metrics();
    // The simulation header includes Save Project, which can take its own row on narrow screens.
    if (width < 761) shared.headerHeight = undefined;
    const verify = async (mode, step) => {
      await page.evaluate(() => document.fonts.ready);
      await current(mode, shared, `${width}px ${step}`);
    };

    await page.goto(`${baseURL}/`);
    await verify('divider', 'Overview direct');
    check(await page.locator('.nav-link[aria-current="page"]').innerText() === 'Overview', 'Overview selection');
    if (artifactDir && width === 1085) await page.screenshot({path: `${artifactDir}/overview.png`, fullPage: true});

    for (const mode of ['emitter', 'fixed', 'divider']) {
      await page.getByRole('link', {name: 'Simulation', exact: true}).click();
      await verify('simulation', 'Simulation navigation');
      await page.locator(`[data-bias-link="${mode}"]`).click();
      await verify(mode, 'bias sidebar navigation');
      await page.goBack();
      await verify('simulation', 'Back from analytical bias');
      await page.goForward();
      await verify(mode, 'Forward to analytical bias');
      await page.goto(`${baseURL}/?mode=${mode}`);
      await page.reload();
      await verify(mode, 'direct and refresh');
      await page.getByRole('button', {name: 'Calculate DC Bias'}).click();
      for (const [row, key] of [[3, 'vce'], [5, 'ic']]) {
        const value = modes[mode][key];
        check(await page.locator('#run-dc td').nth(row).innerText() === value, `${width}px ${mode} calculation ${value}`);
      }
      if (artifactDir) await page.screenshot({path: `${artifactDir}/${mode}-${width}.png`, fullPage: true});
    }

    await page.getByRole('link', {name: 'Validation', exact: true}).click();
    check(new URL(page.url()).hash === '#result-status', 'Analytical validation anchor');
    check(await page.locator('.nav-link[aria-current="location"]').innerText() === 'Validation', 'Validation selection');
    if (artifactDir && width === 1085) await page.screenshot({path: `${artifactDir}/validation-lab03.png`});
    await page.getByRole('link', {name: 'Reports', exact: true}).click();
    check(new URL(page.url()).hash === '#results', 'Reports anchor');
    if (artifactDir && width === 1085) await page.screenshot({path: `${artifactDir}/reports-lab03.png`});
    await page.reload();
    check(await page.locator('.nav-link[aria-current="location"]').innerText() === 'Reports', 'Reports selection after reload');
    await page.goBack();
    check(await page.locator('.nav-link[aria-current="location"]').innerText() === 'Validation', 'Validation selection on Back');
    await page.goForward();
    check(await page.locator('.nav-link[aria-current="location"]').innerText() === 'Reports', 'Reports selection on Forward');

    await page.goto(`${baseURL}/simulation`);
    await page.locator('#bias-type').selectOption('emitter');
    await page.waitForURL('**/?mode=emitter');
    await verify('emitter', 'Simulation bias picker');
    await page.goBack();
    await verify('simulation', 'Simulation picker after Back');
    await page.goForward();
    await page.getByRole('link', {name: 'Reports', exact: true}).click();
    await page.locator('#rc').fill('2.4');
    await page.locator('#mode').selectOption('fixed');
    await verify('fixed', 'Analytical bias picker');
    check((await page.locator('.nav-link[aria-current="page"]').allTextContents()).map(text => text.trim()).includes('Overview'), 'Historical section selection clears on mode change');
    check(new URL(page.url()).searchParams.get('mode') === 'fixed', 'Picker updates analytical URL');
    check(await page.locator('#rc').inputValue() === '2.4', 'Picker preserves compatible input draft');
    await page.goBack();
    await verify('emitter', 'Back after analytical picker');
    check(await page.locator('.nav-link[aria-current="location"]').innerText() === 'Reports', 'Back restores the previous section');
    await page.goForward();
    await verify('fixed', 'Forward after analytical picker');
    await page.locator('#mode').selectOption('simulation');
    await page.waitForURL('**/simulation');
    await verify('simulation', 'Analytical picker to Lab04');
    await page.goBack();
    await verify('fixed', 'Back from Lab04 restores analytical mode');
    await page.goBack();
    await verify('emitter', 'Returning to Lab04 creates a single history entry');
    await page.goForward();
    await page.goForward();
    await page.reload();
    await verify('simulation', 'Simulation refresh');
  }

  check(errors.length === 0, `Browser console errors: ${errors.join(' | ')}`);
  return {assertions: checks.length, browserErrors: errors};
}
