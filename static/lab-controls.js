/* Source and presentation controls synchronize the form and schematic. */
(() => {
  const form = document.getElementById('spice-form');
  const body = document.body;
  const byId = id => document.getElementById(id);
  const all = byId('all-analyses');
  all.hidden = false; all.disabled = false;
  const initial = JSON.parse(byId('initial-run').textContent);
  const defaults = JSON.parse(byId('lab-defaults').textContent);
  if (!initial.result && !initial.error) { all.selected = true; all.defaultSelected = true; }
  const knobs = Array.from(document.querySelectorAll('[data-knob]'));
  const sourceUnits = Array.from(document.querySelectorAll('[data-source-unit]'));
  const knobScale = {amplitude:1000, frequency:1};
  const sourceReading = key => RunHistory.sourceValue(key, byId('spice-' + key).value, byId('unit-' + key).value);
  function syncSource() {
    knobs.forEach(knob => {
      const key = knob.dataset.knob;
      const value = sourceReading(key) * knobScale[key];
      const min = Number(knob.getAttribute('aria-valuemin'));
      const max = Number(knob.getAttribute('aria-valuemax'));
      const fraction = Number.isFinite(value) && value > 0 ? Math.max(0, Math.min(1, Math.log(value/min) / Math.log(max/min))) : 0;
      knob.style.setProperty('--knob-angle', (-135 + fraction * 270) + 'deg');
      knob.setAttribute('aria-valuenow', Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min);
      const unit = RunHistory.sourceUnitLabel(key, byId('unit-' + key).value);
      knob.setAttribute('aria-valuetext', Number.isFinite(value) ? `${byId('spice-' + key).value} ${unit}` : 'Invalid value');
    });
    const amplitude = RunHistory.decimalNumber(byId('spice-amplitude').value);
    document.querySelector('[data-source-amplitude]').textContent = Number.isFinite(amplitude) ? Number(amplitude.toPrecision(4)) : '—';
    document.querySelector('[data-source-amplitude-unit]').textContent = RunHistory.sourceUnitLabel('amplitude', byId('unit-amplitude').value).replace(' peak', '');
    const frequency = sourceReading('frequency');
    document.querySelector('[data-source-frequency]').textContent = Number.isFinite(frequency) ? ' = ' + (frequency >= 1000 ? (frequency/1000).toFixed(2) + ' kHz' : +frequency.toPrecision(5) + ' Hz') : ' = —';
  }
  function setKnob(knob, fraction) {
    const min = Number(knob.getAttribute('aria-valuemin')), max = Number(knob.getAttribute('aria-valuemax'));
    const key = knob.dataset.knob;
    const input = byId('spice-' + key);
    const scaledValue = min * (max/min) ** Math.max(0,Math.min(1,fraction));
    const factor = RunHistory.sourceFactor(key, byId('unit-' + key).value);
    input.value = String(+(scaledValue / (knobScale[key] * factor)).toPrecision(4));
    input.dispatchEvent(new Event('input', {bubbles:true}));
  }
  knobs.forEach(knob => {
    const key = knob.dataset.knob;
    const min = Number(knob.getAttribute('aria-valuemin'));
    const max = Number(knob.getAttribute('aria-valuemax'));
    const fraction = () => Math.log(sourceReading(key) * knobScale[key] / min) / Math.log(max / min);
    knob.addEventListener('keydown', event => {
      const direction = {ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1,PageUp:5,PageDown:-5}[event.key];
      if (direction || ['Home','End'].includes(event.key)) {event.preventDefault();setKnob(knob,event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (Number.isFinite(fraction()) ? fraction() : 0) + direction/100);}
    });
    let drag;
    knob.addEventListener('pointerdown', event => {drag={y:event.clientY,fraction:Number.isFinite(fraction())?fraction():0};knob.setPointerCapture(event.pointerId);knob.focus();});
    knob.addEventListener('pointermove', event => {if(drag)setKnob(knob,drag.fraction+(drag.y-event.clientY)/160);});
    knob.addEventListener('pointerup', () => drag=null);
    knob.addEventListener('pointercancel', () => drag=null);
    knob.addEventListener('lostpointercapture', () => drag=null);
  });
  sourceUnits.forEach(select => {
    select.dataset.previousUnit = select.value;
    select.addEventListener('change', () => {
      const key = select.dataset.sourceUnit;
      const input = byId('spice-' + key);
      const physicalValue = RunHistory.sourceValue(key, input.value, select.dataset.previousUnit);
      const converted = physicalValue / RunHistory.sourceFactor(key, select.value);
      if (Number.isFinite(converted)) input.value = String(+converted.toPrecision(16));
      select.dataset.previousUnit = select.value;
      input.dispatchEvent(new Event('input', {bubbles:true}));
    });
  });
  document.addEventListener('input', event => {if(event.target.form === form && !event.target.hasAttribute('data-source-unit')) syncSource();});
  function syncSignalAnimation() {
    window.LabDashboard.setSignalAnimation(body.dataset.ac === 'on' && body.dataset.animation === 'on' && body.dataset.paused !== 'true');
  }
  const playback = SchematicMotion.bindControls(byId('circuit-svg'), {
    onChange:syncSignalAnimation,
    onRestart:window.LabDashboard.restartSignalAnimation
  });
  const schematicPanel = document.querySelector('.schematic-panel');
  const schematicStage = schematicPanel.querySelector('.schematic-stage');
  const fit = byId('fit-circuit');
  fit.parentElement.hidden = false;
  fit.addEventListener('click', () => {
    const fitted = schematicPanel.dataset.fit !== 'true';
    schematicPanel.dataset.fit = String(fitted);
    fit.setAttribute('aria-pressed', String(fitted));
    schematicStage.scrollLeft = 0;
  });
  function expand(expanded) {
    schematicPanel.classList.toggle('circuit-expanded', expanded);
    byId('expand-circuit').setAttribute('aria-pressed', String(expanded));
    byId('expand-circuit').setAttribute('aria-label', expanded ? 'Collapse circuit schematic' : 'Expand circuit schematic');
    if (!expanded && schematicPanel.dataset.fit === 'true') schematicStage.scrollLeft = 0;
  }
  byId('expand-circuit').addEventListener('click', () => expand(byId('expand-circuit').getAttribute('aria-pressed') !== 'true'));
  document.addEventListener('keydown', event => {if(event.key==='Escape')expand(false);});
  byId('guide-toggle').addEventListener('click', () => {const open=byId('operation-guide').hidden;byId('operation-guide').hidden=!open;byId('guide-toggle').setAttribute('aria-expanded',String(open));});
  byId('reset-lab').addEventListener('click', () => {
    form.reset();
    byId('analysis').value = 'all';
    // Canonical defaults are separate from POST-rendered current/defaultValue attributes.
    Object.entries(defaults).forEach(([key,value])=>{form.elements.namedItem(key).value=value;});
    sourceUnits.forEach(select => { select.dataset.previousUnit = select.value; });
    syncSource();
    window.LabDashboard.refresh();
    playback.reset();
  });
  byId('validate-lab').addEventListener('click', () => window.LabDashboard.validate());
  function download(project) {
    const snapshot=window.LabDashboard.snapshot();
    const data=project?{...snapshot,overlays:{dc:byId('overlay-dc').checked,ac:byId('overlay-ac').checked,animation:byId('overlay-animation').checked}}:snapshot;
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=project?'lab04-project.json':'lab04-results.json';a.click();URL.revokeObjectURL(url);
  }
  byId('export-results').addEventListener('click', () => download(false));
  byId('save-project').addEventListener('click', () => download(true));
  syncSource();
})();
