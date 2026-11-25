/* Enhanced submissions keep independent solver responses in this page's memory. */
(() => {
  const form = document.getElementById('spice-form');
  const status = document.getElementById('spice-status');
  const analysis = document.getElementById('analysis');
  const schematic = document.getElementById('circuit-svg');
  const store = RunHistory.create();
  const signalMotion = SchematicMotion.create({
    vin: document.querySelector('[data-signal-wave="vin"]'),
    vout: document.querySelector('[data-signal-wave="vout"]')
  });
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
       const dcValues = {...result, ie:result.ve / (RunHistory.decimalNumber(record.inputs.re) * 1000)};
       [['vb','V_B',1,'V'],['ve','V_E',1,'V'],['vc','V_C',1,'V'],['vce','V_CE',1,'V'],['ic','I_C',1000,'mA'],['ie','I_E',1000,'mA']].forEach(([key,label,scale,unit]) => {
        const row = make('tr');
         const [symbol, subscript] = label.split('_');
         const heading = make('th', symbol);
         heading.append(make('sub', subscript));
        heading.scope = 'row';
        const value = dcValues[key] * scale;
        const cell = make('td', value.toFixed(2) + ' ' + unit);
        cell.title = value.toFixed(4) + ' ' + unit;
        row.append(heading, cell);
        body.append(row);
      });
       table.append(body); content.append(table);
       const region = make('p', undefined, 'dc-region');
       region.id = 'dc-region';
       const active = result.vc > result.vb && result.vb > result.ve && result.ic > 0;
       region.append(make('span','Operating Region'),make('strong',active?'Active Region':'Check bias'));
       content.append(region);
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
    const currentDC = dc?.result && !store.pending.has('dc') && RunHistory.isCurrent(dc, current);
    schematic.dataset.dcActive = String(Boolean(currentDC));
     document.querySelectorAll('[data-dc-badge]').forEach(node => node.setAttribute('visibility', currentDC ? 'visible' : 'hidden'));
    document.querySelectorAll('[data-dc-node]').forEach(node => {
      const key = node.dataset.dcNode;
        node.textContent = currentDC ? ' = ' + dc.result[key].toFixed(2) + ' V' : '';
    });
    const annotation = document.getElementById('dc-annotation');
    if (annotation) annotation.textContent = currentDC
      ? 'DC node voltages shown · current run'
      : 'DC node annotations available after a current DC run.';
     const collectorCurrent = currentDC ? ' = ' + (dc.result.ic * 1000).toFixed(2) + ' mA' : '';
     document.querySelector('[data-dc-current]').textContent = collectorCurrent;
     document.querySelector('[data-dc-vce]').textContent = currentDC ? ' = ' + dc.result.vce.toFixed(2) + ' V' : '';
     document.querySelector('[data-current-ic]').textContent = collectorCurrent;
     document.querySelector('[data-current-ie]').textContent = currentDC ? ' = ' + (dc.result.ve / RunHistory.decimalNumber(dc.inputs.re)).toFixed(2) + ' mA' : '';
     const tran = store.records.tran;
     const currentTran = tran?.result && !store.pending.has('tran') && RunHistory.isCurrent(tran, current);
     schematic.dataset.acActive = String(Boolean(currentTran));
     const frequency = currentTran ? RunHistory.decimalNumber(tran.inputs.frequency) : null;
     document.getElementById('transient-frequency').textContent = frequency
       ? ` (f = ${frequency >= 1000 ? (frequency / 1000).toFixed(2) + ' kHz' : frequency + ' Hz'})` : '';
     const peak = currentTran ? Math.max(...tran.result.vout_v.map(Math.abs)) : null;
     document.querySelector('[data-output-amplitude]').textContent = currentTran
       ? ' ≈ ' + (peak >= 1 ? peak.toFixed(2) + ' V' : (peak * 1000).toFixed(2) + ' mV') : '';
     const inputPeak = currentTran ? Math.max(...tran.result.vin_v.map(Math.abs)) : null;
     document.querySelector('[data-output-gain]').textContent = currentTran && inputPeak ? ' ≈ ' + (peak/inputPeak).toFixed(2) + ' V/V' : ' —';
     document.querySelector('[data-signal-reading]').setAttribute('visibility', currentTran ? 'visible' : 'hidden');
     document.querySelector('[data-signal-empty]').setAttribute('visibility', currentTran ? 'hidden' : 'visible');
     document.querySelectorAll('[data-tran-badge]').forEach(node => node.setAttribute('visibility',currentTran?'visible':'hidden'));
     if (currentTran) signalMotion.setData(tran.result, RunHistory.decimalNumber(tran.inputs.frequency));
     else signalMotion.setData(null);
     ['dc','ac','tran'].forEach(mode => {
       const record = store.records[mode];
       const check = document.querySelector('[data-check="'+mode+'"]');
       const currentResult = record?.result && RunHistory.isCurrent(record,current) && !store.pending.has(mode);
       check.dataset.state = currentResult?'passed':record?.error?'failed':record?.result?'stale':'pending';
       const names = {dc:'DC bias',ac:'AC response',tran:'Transient response'};
       const label = names[mode]+': '+(store.pending.has(mode)?'Running':currentResult?'Solved':record?.error?'Failed':record?.result?'Stale':'Not run');
       const copy = make('span', label);
       if (currentResult && mode === 'dc') {
         copy.append(make('small', 'VCE = ' + record.result.vce.toFixed(2) + ' V', 'solver-detail'));
       } else if (currentResult && mode === 'ac') {
         const sample = record.result.frequency_hz.indexOf(1000);
         if (sample >= 0) copy.append(make('small', `Gain at 1 kHz = ${record.result.gain_db[sample].toFixed(2)} dB`, 'solver-detail'));
       }
       check.replaceChildren(copy);
     });
     document.querySelector('[data-check="input"]').dataset.state = 'pending';
     document.querySelector('[data-check="input"]').textContent = 'Input validation: Not run';
      document.getElementById('validation-check').textContent = 'Input / result checks: Not run';
      const records=Object.values(store.records);
      const failures=records.filter(record=>record.error);
      const stale=records.some(record=>record.result && !RunHistory.isCurrent(record,current));
      if(store.pending.size) {
        status.className='status status-pending';status.textContent='Running ngspice…';
      } else if(failures.length) {
        status.className='status status-warning';status.textContent='Error: '+failures.map(record=>record.mode+': '+record.error).join('; ');
      } else if(stale) {
        status.className='status status-warning';status.textContent='Inputs changed · retained results are stale. Rerun simulation.';
      } else if(records.some(record=>record.result)) {
        status.className='status status-ok';status.textContent='Simulation successful · ngspice';
      } else {
        status.className='status status-pending';status.textContent='Ready to simulate · no analyses run yet.';
      }
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
     const selected = submitted.get('analysis');
     const modes = selected === 'all' ? ['dc', 'ac', 'tran'] : [selected];
    const button = form.querySelector('[type=submit]');
    if (button.disabled) return;
    button.disabled = true;
     modes.forEach(mode => store.start(mode));
     refresh();
    form.setAttribute('aria-busy', 'true');
    status.className = 'status status-pending'; status.textContent = 'Running ngspice…';
      try {
       for (const mode of modes) {
         submitted.set('analysis', mode);
         try {
           const response = await fetch(form.action || location.href, {method:'POST', body:submitted, headers:{Accept:'application/json'}});
           if (!response.ok) throw new Error('Server error. Run again.');
           const record = await response.json();
            if (record.error) { store.fail(mode, record.error); }
           else store.complete({...record, time:new Date().toLocaleTimeString()});
         } catch (error) {
            store.fail(mode, error.message);
         }
         draw(mode); refresh();
       }
     } finally { button.disabled = false; form.removeAttribute('aria-busy'); }
   });
   window.LabDashboard = {
     setSignalAnimation: signalMotion.setPlaying,
     restartSignalAnimation: signalMotion.restart,
     snapshot() { return {exportedAt:new Date().toISOString(), deviceModel:'Configured external 2N3904; not instructor-verified', inputs:inputs(), records:Object.fromEntries(Object.entries(store.records).map(([mode,record]) => [mode,{...record,current:!!record.result && !store.pending.has(mode) && RunHistory.isCurrent(record,inputs())}]))}; },
     validate() {
       const snapshot = this.snapshot();
       const current = ['dc','ac','tran'].filter(mode => snapshot.records[mode]?.current);
        const {valid,errors} = LabParameters.validate(inputs());
        const message = !valid ? 'Input check failed: '+Object.values(errors).join(' ') : current.length === 3 ? '3 current analyses · Reference: Not run.' : 'Input check passed · ' + current.length + '/3 current analyses. Rerun missing / stale analyses.';
       document.getElementById('validation-check').textContent = message;
       const check = document.querySelector('[data-check="input"]');
       check.dataset.state = valid?'passed':'failed';
       check.textContent = valid?'Input validation passed':'Input validation failed';
        return {valid,current,message,errors};
     },
     refresh
   };
   refresh();
})();
