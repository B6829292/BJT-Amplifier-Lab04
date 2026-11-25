/* Presentation controls never change circuit topology or manufacture solver data. */
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
  function syncSource() {
    knobs.forEach(knob => {
      const value = RunHistory.decimalNumber(byId('spice-' + knob.dataset.knob).value);
      const min = Number(knob.getAttribute('aria-valuemin'));
      const max = Number(knob.getAttribute('aria-valuemax'));
      const fraction = Number.isFinite(value) && value > 0 ? Math.max(0, Math.min(1, Math.log(value/min) / Math.log(max/min))) : 0;
      knob.style.setProperty('--knob-angle', (-135 + fraction * 270) + 'deg');
      knob.setAttribute('aria-valuenow', Number.isFinite(value) ? value : min);
      knob.setAttribute('aria-valuetext', Number.isFinite(value) ? value + (knob.dataset.knob === 'amplitude' ? ' mV peak' : ' Hz') : 'Invalid value');
    });
    const amplitude = RunHistory.decimalNumber(byId('spice-amplitude').value);
    document.querySelector('[data-source-amplitude]').textContent = Number.isFinite(amplitude) ? Number(amplitude.toPrecision(4)) : '—';
    const frequency = RunHistory.decimalNumber(byId('spice-frequency').value);
    document.querySelector('[data-source-frequency]').textContent = Number.isFinite(frequency) ? ' = ' + (frequency >= 1000 ? (frequency/1000).toFixed(2) + ' kHz' : frequency + ' Hz') : ' = —';
  }
  function setKnob(knob, fraction) {
    const min = Number(knob.getAttribute('aria-valuemin')), max = Number(knob.getAttribute('aria-valuemax'));
    const input = byId('spice-' + knob.dataset.knob);
    input.value = String(+Number(min * (max/min) ** Math.max(0,Math.min(1,fraction))).toPrecision(4));
    input.dispatchEvent(new Event('input', {bubbles:true}));
  }
  knobs.forEach(knob => {
    const fraction = () => Math.log(RunHistory.decimalNumber(byId('spice-' + knob.dataset.knob).value) / Number(knob.getAttribute('aria-valuemin'))) / Math.log(Number(knob.getAttribute('aria-valuemax'))/Number(knob.getAttribute('aria-valuemin')));
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
  document.addEventListener('input', event => {if(event.target.form === form) syncSource();});
  function syncSignalAnimation() {
    window.LabDashboard.setSignalAnimation(body.dataset.ac === 'on' && body.dataset.animation === 'on' && body.dataset.paused !== 'true');
  }
  function restartOverlayMotion() {
    window.LabDashboard.restartSignalAnimation();
    byId('circuit-svg').querySelectorAll('.flow-path, .node-pulse').forEach(node => {
      node.getAnimations().forEach(animation => { animation.currentTime = 0; });
    });
  }
  const overlays = () => {
    ['dc','ac','animation'].forEach(name => body.dataset[name] = byId('overlay-' + name).checked ? 'on' : 'off');
    syncSignalAnimation();
  };
  ['dc','ac','animation'].forEach(name => byId('overlay-' + name).addEventListener('change', overlays));
  byId('pause-animation').addEventListener('click', () => {
    const paused = body.dataset.paused !== 'true';body.dataset.paused=String(paused);
    byId('pause-animation').setAttribute('aria-pressed',String(paused));
    byId('pause-animation').setAttribute('aria-label',paused?'Resume overlay animation':'Pause overlay animation');
    syncSignalAnimation();
  });
  byId('restart-animation').addEventListener('click', () => {
    body.dataset.paused='false';byId('pause-animation').setAttribute('aria-pressed','false');byId('pause-animation').setAttribute('aria-label','Pause overlay animation');byId('overlay-animation').checked=true;overlays();
    restartOverlayMotion();
  });
  function expand(expanded) {document.querySelector('.schematic-panel').classList.toggle('circuit-expanded',expanded);byId('expand-circuit').setAttribute('aria-pressed',String(expanded));byId('expand-circuit').setAttribute('aria-label',expanded?'Collapse circuit schematic':'Expand circuit schematic');}
  byId('expand-circuit').addEventListener('click', () => expand(byId('expand-circuit').getAttribute('aria-pressed') !== 'true'));
  document.addEventListener('keydown', event => {if(event.key==='Escape')expand(false);});
  byId('guide-toggle').addEventListener('click', () => {const open=byId('operation-guide').hidden;byId('operation-guide').hidden=!open;byId('guide-toggle').setAttribute('aria-expanded',String(open));});
  byId('reset-lab').addEventListener('click', () => {
    form.reset();
    byId('analysis').value = 'all';
    // Canonical defaults are separate from POST-rendered current/defaultValue attributes.
    Object.entries(defaults).forEach(([key,value])=>{form.elements.namedItem(key).value=value;});
    ['dc','ac','animation'].forEach(name => byId('overlay-'+name).checked=true);
    body.dataset.paused='false';byId('pause-animation').setAttribute('aria-pressed','false');byId('pause-animation').setAttribute('aria-label','Pause overlay animation');
    syncSource();overlays();window.LabDashboard.refresh();restartOverlayMotion();
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
  syncSource();overlays();
})();
