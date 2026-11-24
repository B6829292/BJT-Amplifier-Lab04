/* Enhanced submissions keep independent solver responses in this page's memory. */
(() => {
  const form = document.getElementById('spice-form');
  const status = document.getElementById('spice-status');
  const analysis = document.getElementById('analysis');
  const store = RunHistory.create();
  const initial = JSON.parse(document.getElementById('initial-run').textContent);
  const inputs = () => Object.fromEntries(new FormData(form));
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function draw(mode) {
    const panel = document.getElementById('run-' + mode);
    if (!panel) return;
    const content = panel.querySelector('.run-content');
    content.replaceChildren();
    const record = store.records[mode];
    if (!record) return;
    if (record.error) { content.append(make('p', record.error, 'run-error')); return; }
    const result = record.result;
    if (mode === 'dc') {
      const table = make('table');
      const body = make('tbody');
      [['vb','VB',1,'V'],['ve','VE',1,'V'],['vc','VC',1,'V'],['vce','VCE',1,'V'],['ic','IC',1000,'mA']].forEach(([key,label,scale,unit]) => {
        const row = make('tr');
        const heading = make('th', label);
        heading.scope = 'row';
        row.append(heading, make('td', (result[key] * scale).toFixed(4) + ' ' + unit));
        body.append(row);
      });
      table.append(body); content.append(table);
    } else {
      const plots = make('div', undefined, 'plots');
      plots.tabIndex = 0;
      plots.setAttribute('role', 'region');
      plots.setAttribute('aria-label', mode === 'ac' ? 'AC gain and phase plots; scroll horizontally if needed' : 'Transient plot; scroll horizontally if needed');
      renderSpicePlots(result, plots); content.append(plots);
      content.append(make('p', 'Scroll chart horizontally for the full axes.', 'mobile-scroll-hint'));
    }
    const details = make('details');
    details.append(make('summary', 'Run inputs & provenance'));
    details.append(make('p', 'Completed ' + record.time + ' · ngspice · configured 2N3904 model, not instructor-verified.'));
    const units = {vcc:'V',r1:'kΩ',r2:'kΩ',rc:'kΩ',re:'kΩ',rl:'kΩ',cin:'µF',cout:'µF',amplitude:'mV peak',frequency:'Hz'};
    details.append(make('p', Object.entries(record.inputs).filter(([key]) => key in units && (mode === 'tran' || !['amplitude','frequency'].includes(key))).map(([key,value]) => key + ': ' + value + ' ' + units[key]).join(' · ')));
    details.append(make('h4', 'Netlist'), make('pre', result.netlist), make('h4', 'ngspice output'), make('pre', result.log));
    content.append(details);
  }
  function refresh() {
    const current = inputs();
    ['dc','ac','tran'].forEach(mode => {
      const record = store.records[mode];
      const stale = record?.result && !RunHistory.isCurrent(record, current);
      const text = store.pending.has(mode) ? 'Running · previous run retained for reference' : !record ? 'Not run' : record.error ? 'Failed · rerun required' : stale ? 'Stale · recorded inputs differ' : 'Current · ngspice completed';
      const panel = document.getElementById('run-' + mode);
      panel.dataset.stale = stale ? 'true' : 'false';
      panel.querySelector('.run-state').textContent = text;
      document.querySelector('[data-run-status="' + mode + '"]').textContent = text;
    });
    document.querySelectorAll('[data-spice-value]').forEach(node => { node.textContent = current[node.dataset.spiceValue] || '—'; });
    const dc = store.records.dc;
    document.querySelectorAll('[data-dc-badge]').forEach(node => node.setAttribute('visibility', dc?.result && RunHistory.isCurrent(dc, current) ? 'visible' : 'hidden'));
    document.querySelectorAll('[data-dc-node]').forEach(node => {
      const key = node.dataset.dcNode;
      node.textContent = dc?.result && RunHistory.isCurrent(dc, current) ? key.toUpperCase() + ' ' + dc.result[key].toFixed(3) + ' V' : '';
    });
    const annotation = document.getElementById('dc-annotation');
    if (annotation) annotation.textContent = dc?.result && RunHistory.isCurrent(dc, current)
      ? 'DC node voltages shown · current run'
      : 'DC node annotations available after a current DC run.';
  }
  document.getElementById('retained-runs').hidden = false;
  const fallback = document.getElementById('spice-results');
  if (fallback) fallback.hidden = true;
  document.querySelectorAll('#results > details').forEach(node => node.hidden = true);
  if (initial.result) { store.complete({...initial, time:new Date().toLocaleTimeString()}); draw(initial.mode); }
  else if (initial.error) { store.fail(initial.mode, initial.error); draw(initial.mode); }
  document.addEventListener('input', event => { if (event.target.form === form) refresh(); });
  analysis.addEventListener('change', refresh);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submitted = new FormData(form);
    const mode = submitted.get('analysis');
    const button = form.querySelector('[type=submit]');
    if (button.disabled) return;
    button.disabled = true;
    store.start(mode);
    refresh();
    form.setAttribute('aria-busy', 'true');
    status.className = 'status status-pending'; status.textContent = 'Running ngspice…';
    document.getElementById('run-' + mode).querySelector('.run-state').textContent = 'Running · previous run not current until completion';
    try {
      const response = await fetch(form.action || location.href, {method:'POST', body:submitted, headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Server error. Run again.');
      const record = await response.json();
      if (record.error) store.fail(mode, record.error);
      else store.complete({...record, time:new Date().toLocaleTimeString()});
      status.className = 'status ' + (record.error ? 'status-warning' : 'status-ok');
      status.textContent = record.error ? 'Error: Simulation failed · ' + record.error : 'Simulation successful · ngspice completed. This is not instructor validation.';
    } catch (error) {
      store.fail(mode, error.message);
      status.className = 'status status-warning'; status.textContent = 'Error: Simulation failed · ' + error.message;
    } finally {
      draw(mode); refresh(); button.disabled = false; form.removeAttribute('aria-busy');
    }
  });
  refresh();
})();
