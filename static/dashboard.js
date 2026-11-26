/* Enhanced submissions keep independent solver responses in this page's memory. */
(() => {
  const form = document.getElementById('spice-form');
  const status = document.getElementById('spice-status');
  const analysis = document.getElementById('analysis');
  const schematic = document.getElementById('circuit-svg');
  const store = RunHistory.create();
  const analyses = ['dc','ac','tran'];
  const bypassCapacitance = form.elements.ce;
  let setBodeReference;
  const signalMotion = SchematicMotion.create({
    vin: document.querySelector('[data-signal-wave="vin"]'),
    vout: document.querySelector('[data-signal-wave="vout"]')
  });
  const initial = JSON.parse(document.getElementById('initial-run').textContent);
  let model = initial.model_info;
  const inputs = () => ({...Object.fromEntries(new FormData(form)), ce:bypassCapacitance.value});
  const activeRegion = result => result.vc > result.vb && result.vb > result.ve && result.ic > 0;
  const emitterCurrent = record => record.result.ve / (RunHistory.decimalNumber(record.inputs.re) * 1000);
  const matches = (record, current) => !!record?.result && RunHistory.isCurrent(record, current) &&
    (!record.result.model_info || record.result.model_info.fingerprint === model.fingerprint);
  const isCurrent = (record, current) => matches(record, current) && !store.pending.has(record.mode);
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function showBenchmark(label, state = 'pending', checks = []) {
    const row = document.querySelector('[data-check="reference"]');
    const measurements = document.getElementById('benchmark-measurements');
    const tolerance = checks.length ? checks[0].tolerance * 100 : null;
    row.dataset.state = state;
    row.textContent = `Reference benchmark: ${label}`;
    document.getElementById('benchmark-provenance').textContent = tolerance === null
      ? label : `${label} · default fixture, ±${tolerance}%`;
    measurements.hidden = !checks.length;
    measurements.replaceChildren(...checks.map(check => {
      const measured = check.measured === null ? 'sample unavailable' : `${check.measured.toPrecision(4)} ${check.unit}`;
      return make('li', `${check.label}: ${measured} (ref. ${check.target.toPrecision(4)} ${check.unit})`);
    }));
  }
  function showModel(info) {
    if (info.status === 'configured' && model.status === 'loaded' && info.fingerprint === model.fingerprint) return;
    model = info;
    const modelStatus = document.getElementById('device-model-status');
    modelStatus.dataset.state = info.status;
    modelStatus.textContent = info.detail;
    document.getElementById('device-model-source').textContent = info.source;
  }
  function validate(currentInputs) {
    const current = analyses.filter(mode => isCurrent(store.records[mode], currentInputs));
    const {valid,errors} = LabParameters.validate(currentInputs);
    const inputCheck = document.querySelector('[data-check="input"]');
    inputCheck.dataset.state = valid ? 'passed' : 'failed';
    const inputStatus = make('span', valid ? 'Input validation passed' : 'Check circuit inputs');
    if (!valid) inputStatus.append(make('small', Object.values(errors)[0], 'solver-detail'));
    inputCheck.replaceChildren(inputStatus);
    for (const key of Object.keys(LabParameters.rules)) {
      const field = form.elements.namedItem(key);
      if (errors[key]) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }

    let benchmark = 'Not run';
    let state = 'pending';
    let checks = [];
    const hasResults = Object.values(store.records).some(record => record.result);
    if (valid && hasResults) {
      if (currentInputs.emitter_bypass === 'on' || !model.reference) benchmark = 'Not applicable';
      else if (current.length < analyses.length) {
        benchmark = 'Awaiting current results';
        state = 'stale';
      } else {
        const reports = current.map(mode => store.records[mode].result.reference_checks);
        if (reports.every(report => report?.length)) {
          checks = reports.flat();
          const passed = checks.every(item => item.passed);
          benchmark = passed ? 'Passed' : 'Failed';
          state = passed ? 'passed' : 'failed';
        } else benchmark = 'Not applicable';
      }
    }
    showBenchmark(benchmark, state, checks);
    const message = valid ? `Input check passed · ${current.length}/3 current analyses. Reference benchmark: ${benchmark}.` :
      `Input check failed: ${Object.values(errors).join(' ')}`;
    const validation = document.getElementById('validation-check');
    if (validation.textContent !== message) validation.textContent = message;
    return {valid,current,message,errors,benchmark};
  }
  function draw(mode) {
    const panel = document.getElementById('run-' + mode);
    if (!panel) return;
    const content = panel.querySelector('.run-content');
    content.replaceChildren();
    if (mode === 'ac') setBodeReference = undefined;
    const record = store.records[mode];
     if (!record) return;
    if (record.error) { content.append(make('p', record.error, 'run-error')); return; }
    const result = record.result;
    if (mode === 'dc') {
      const table = make('table');
      const body = make('tbody');
       const dcValues = {...result, ie:emitterCurrent(record)};
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
       const active = activeRegion(result);
       region.dataset.region = active ? 'active' : 'check';
       region.append(make('span','Operating Region'),make('strong',active?'Active Region':'Check bias'));
       content.append(region);
    } else {
      const plots = make('div', undefined, 'plots');
      plots.tabIndex = 0;
      plots.setAttribute('role', 'region');
      plots.setAttribute('aria-label', mode === 'ac' ? 'AC gain and phase plots; scroll horizontally if needed' : 'Transient plot; scroll horizontally if needed');
      const updateReference = renderSpicePlots(result, plots);
      if (mode === 'ac') setBodeReference = updateReference;
      content.append(plots);
      content.append(make('p', 'Scroll chart horizontally for the full axes.', 'mobile-scroll-hint'));
    }
    const details = make('details');
    details.append(make('summary', 'Run inputs & provenance'));
    details.append(make('p', `Completed ${record.time} · ngspice · ${result.model}`));
    const units = {vcc:'V',r1:'kΩ',r2:'kΩ',rc:'kΩ',re:'kΩ',rl:'kΩ',cin:'µF',cout:'µF',ce:'µF',
      amplitude:RunHistory.sourceUnitLabel('amplitude', record.inputs.amplitude_unit),
      frequency:RunHistory.sourceUnitLabel('frequency', record.inputs.frequency_unit)};
    const bypass = record.inputs.emitter_bypass === 'on';
    const inputDetails = Object.entries(record.inputs)
      .filter(([key]) => key in units && (key !== 'ce' || bypass) && (mode === 'tran' || !['amplitude','frequency'].includes(key)))
      .map(([key,value]) => `${key}: ${value} ${units[key]}`);
    details.append(make('p', [`Emitter bypass: ${bypass ? 'On' : 'Off'}`, ...inputDetails].join(' · ')));
    details.append(make('h4', 'Netlist'), make('pre', result.netlist), make('h4', 'ngspice output'), make('pre', result.log));
    content.append(details);
  }
  function refresh() {
    const current = inputs();
    const bypass = current.emitter_bypass === 'on';
    bypassCapacitance.disabled = !bypass;
    bypassCapacitance.required = bypass;
    schematic.querySelector('[data-emitter-bypass]').setAttribute('visibility', bypass ? 'visible' : 'hidden');
    const ce = RunHistory.decimalNumber(current.ce);
    schematic.querySelector('[data-bypass-value]').textContent = Number.isFinite(ce) && ce > 0 ? +ce.toPrecision(4) : '—';
    document.querySelector('[data-bypass-state]').textContent = bypass ? 'bypassed' : 'unbypassed';
    analyses.forEach(mode => {
      const record = store.records[mode];
      const stale = record?.result && !matches(record, current);
      const text = store.pending.has(mode) ? 'Running · previous run retained for reference' : !record ? 'Not run' : record.error ? 'Failed · rerun required' : stale ? 'Stale · settings changed' : 'Current · ngspice completed';
      const panel = document.getElementById('run-' + mode);
      panel.dataset.stale = stale ? 'true' : 'false';
      panel.querySelector('.run-state').textContent = text;
      document.querySelector('[data-run-status="' + mode + '"]').textContent = text;
    });
    document.querySelectorAll('[data-spice-value]').forEach(node => { node.textContent = current[node.dataset.spiceValue] || '—'; });
    const dc = store.records.dc;
    const currentDC = isCurrent(dc, current);
    const ic = currentDC ? dc.result.ic : 0;
    const ie = currentDC ? emitterCurrent(dc) : 0;
    schematic.dataset.dcActive = String(currentDC);
    SchematicMotion.setCurrentFlow(schematic, 'collector', ic);
    SchematicMotion.setCurrentFlow(schematic, 'emitter', ie);
     document.querySelectorAll('[data-dc-badge]').forEach(node => node.setAttribute('visibility', currentDC ? 'visible' : 'hidden'));
    document.querySelectorAll('[data-dc-node]').forEach(node => {
      const key = node.dataset.dcNode;
        node.textContent = currentDC ? ' = ' + dc.result[key].toFixed(2) + ' V' : '';
    });
    const annotation = document.getElementById('dc-annotation');
    if (annotation) annotation.textContent = currentDC
      ? 'DC node voltages shown · current run'
      : 'DC node annotations available after a current DC run.';
     const collectorCurrent = currentDC ? ' = ' + (ic * 1000).toFixed(2) + ' mA' : '';
     document.querySelector('[data-dc-current]').textContent = collectorCurrent;
     document.querySelector('[data-dc-vce]').textContent = currentDC ? ' = ' + dc.result.vce.toFixed(2) + ' V' : '';
     document.querySelector('[data-current-ic]').textContent = collectorCurrent;
     document.querySelector('[data-current-ie]').textContent = currentDC ? ' = ' + (ie * 1000).toFixed(2) + ' mA' : '';
     const tran = store.records.tran;
     const currentTran = isCurrent(tran, current);
     schematic.dataset.acActive = String(Boolean(currentTran));
     const frequency = currentTran ? RunHistory.sourceValue('frequency', tran.inputs.frequency, tran.inputs.frequency_unit) : null;
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
     if (currentTran) signalMotion.setData(tran.result, frequency);
     else signalMotion.setData(null);
     const ac = store.records.ac;
     const currentAC = isCurrent(ac, current);
     const bodeSample = setBodeReference?.(currentAC ? RunHistory.sourceValue('frequency', current.frequency, current.frequency_unit) : null);
     analyses.forEach(mode => {
       const record = store.records[mode];
       const check = document.querySelector('[data-check="'+mode+'"]');
       const currentResult = isCurrent(record, current);
       check.dataset.state = currentResult?'passed':record?.error?'failed':record?.result?'stale':'pending';
       const names = {dc:'DC bias',ac:'AC response',tran:'Transient response'};
       const label = names[mode]+': '+(store.pending.has(mode)?'Running':currentResult?'Solved':record?.error?'Failed':record?.result?'Stale':'Not run');
       const copy = make('span', label);
       if (currentResult && mode === 'dc') {
         const region = activeRegion(record.result) ? 'Active Region' : 'Check bias';
         copy.append(make('small', `VCE = ${record.result.vce.toFixed(2)} V · ${region}`, 'solver-detail'));
       } else if (currentResult && mode === 'ac' && bodeSample) {
         copy.append(make('small', `Gain at ${bodeSample.frequencyLabel}: ${bodeSample.values[0].toFixed(2)} dB`, 'solver-detail'));
       }
       check.replaceChildren(copy);
     });
      const validation = validate(current);
      const records=Object.values(store.records);
      const failures=records.filter(record=>record.error);
      const stale = records.some(record => record.result && !matches(record, current));
      if(store.pending.size) {
        status.className='status status-pending';status.textContent='Running ngspice…';
      } else if(failures.length) {
        status.className='status status-warning';status.textContent='Error: '+[...new Set(failures.map(record=>record.error))].join(' · ');
      } else if(model.status === 'unavailable') {
        status.className='status status-warning';status.textContent=model.detail;
      } else if(stale) {
        status.className='status status-warning';status.textContent='Settings changed. Rerun the stale analyses.';
      } else if(!validation.valid) {
        status.className='status status-warning';status.textContent='Correct the highlighted inputs before running.';
      } else if(records.some(record=>record.result)) {
        status.className='status status-ok';status.textContent=`ngspice · ${records.length}/3 analyses complete`;
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
  document.addEventListener('input', event => { if (event.target.form === form && !event.target.hasAttribute('data-source-unit')) refresh(); });
  analysis.addEventListener('change', refresh);
   form.addEventListener('submit', async event => {
    event.preventDefault();
    const submitted = new FormData(form);
     const selected = submitted.get('analysis');
     const modes = selected === 'all' ? analyses : [selected];
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
           if (record.model_info) showModel(record.model_info);
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
     snapshot() {
       const current = inputs();
       return {exportedAt:new Date().toISOString(), deviceModel:`${model.device} · ${model.source}`, modelInfo:{...model},
         inputs:current, records:Object.fromEntries(Object.entries(store.records).map(([mode,record]) =>
           [mode,{...record,current:isCurrent(record,current)}]))};
     },
     validate: () => validate(inputs()),
     refresh
   };
   refresh();
})();
