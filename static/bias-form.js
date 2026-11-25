(() => {
  const form = document.getElementById('bias-form');
  const factors = {V: 1, mV: 0.001, ohm: 1, kohm: 1000, Mohm: 1000000};
  const minNormal = 2.2250738585072014e-308;
  const modeSelect = document.getElementById('mode');
  function markStale() {
    const status = document.getElementById('result-status');
    status.dataset.stale = 'true';
    status.className = 'status status-pending';
    status.textContent = 'Inputs changed. Calculate again to update results and operating region.';
    document.querySelector('.results-card table').hidden = true;
    document.getElementById('run-dc').dataset.stale = 'true';
    document.getElementById('result-freshness').textContent = 'Awaiting calculation';
    const overlay = document.querySelector('[data-analytical-result]');
    if (overlay) overlay.setAttribute('visibility', 'hidden');
    document.getElementById('result-mode').textContent = (modeSelect.selectedOptions[0].dataset.label || modeSelect.selectedOptions[0].textContent);
  }
  const modeFields = JSON.parse(form.dataset.modeFields);
  const initialMode = modeSelect.value;

  function updateMode(mode) {
    modeSelect.value = mode;
    modeSelect.dataset.activeBias = mode;
    const label = modeSelect.selectedOptions[0].dataset.label;
    document.getElementById('project-bias').textContent = label;
    document.getElementById('workspace-mode').textContent = label;
    document.getElementById('schematic-bias-name').textContent = label;
    document.querySelectorAll('[data-bias-link]').forEach(link => {
      link.classList.toggle('chosen', link.dataset.biasLink === mode);
      if (link.dataset.biasLink === mode) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    form.querySelectorAll('[data-input-row]').forEach((row) => {
      const active = modeFields[mode].includes(row.dataset.inputRow);
      row.hidden = !active;
      row.querySelectorAll('input, select').forEach(control => { control.disabled = !active; });
    });
    document.querySelectorAll('[data-circuit-mode]').forEach((part) => {
      const kind = part.dataset.circuitMode;
      part.style.display = (kind === mode || (kind === 'base-resistor' && ['fixed', 'emitter'].includes(mode)) ||
        (kind === 'emitter-resistor' && ['divider', 'emitter'].includes(mode))) ? '' : 'none';
    });
    document.querySelector('.circuit').setAttribute('aria-label', 'NPN ' + label + ' circuit');
  }
  modeSelect.addEventListener('analytical-bias-change', ({detail: mode}) => {
    if (!Object.hasOwn(modeFields, mode) || mode === modeSelect.dataset.activeBias) return;
    const link = document.querySelector('[data-bias-link="' + mode + '"]');
    history.pushState({biasMode: mode}, '', link.href);
    updateMode(mode);
    markStale();
  });
  window.addEventListener('popstate', (event) => {
    const requested = event.state?.biasMode || new URL(location.href).searchParams.get('mode') || initialMode;
    if (Object.hasOwn(modeFields, requested) && requested !== modeSelect.dataset.activeBias) {
      updateMode(requested);
      markStale();
    }
  });
  function showError(input, message) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    document.getElementById(input.id + '-error').textContent = message;
    return !message;
  }
  function validateField(input) {
    const text = input.value.trim();
    const select = form.querySelector('select[data-field="' + input.id + '"]');
    const number = Number(text);
    let message = '';
    if (!text) message = 'This field is required.';
    else if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(number)) message = 'Enter a finite number.';
    else if (number === 0 && /[1-9]/.test(text.split(/[eE]/)[0])) message = 'Value is too small for reliable calculation.';
    else if (input.id === 'vbe' ? number < 0 : number <= 0) message = input.id === 'vbe' ? 'Enter zero or greater.' : 'Enter a value greater than zero.';
    else if (select && !(select.value in factors)) message = 'Choose a valid unit.';
    else {
      const converted = number * (select ? factors[select.value] : 1);
      if (!Number.isFinite(converted)) message = 'Value is too large after unit conversion.';
      else if ((number !== 0 && converted === 0) || (number !== 0 && Math.abs(number) < minNormal) || (converted !== 0 && Math.abs(converted) < minNormal)) message = 'Value is too small for reliable calculation.';
    }
    return showError(input, message);
  }
  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') validateField(input); });
  });
  form.addEventListener('submit', (event) => {
    const invalid = Array.from(form.querySelectorAll('input:not(:disabled)')).filter(input => !validateField(input));
    if (invalid.length) { event.preventDefault(); invalid[0].focus(); }
  });
  form.querySelectorAll('select[data-field]').forEach((select) => {
    select.addEventListener('change', () => {
      const input = document.getElementById(select.dataset.field);
      if (input.value.trim() && Number.isFinite(Number(input.value)) && factors[select.dataset.previous] !== undefined) {
        const converted = Number(input.value) * (factors[select.dataset.previous] / factors[select.value]);
        if (!Number.isFinite(converted) || (converted === 0 && Number(input.value) !== 0) || (converted !== 0 && Math.abs(converted) < minNormal)) {
          select.value = select.dataset.previous;
          showError(input, 'This value cannot be represented in the selected unit.');
          return;
        }
        input.setCustomValidity('');
        input.value = String(Number(converted.toPrecision(15)));
      }
      select.dataset.previous = select.value;
      const label = document.querySelector('[data-circuit="' + input.name + '"]');
      const unitLabel = document.querySelector('[data-circuit-unit="' + input.name + '"]');
      if (label) label.textContent = input.value || '—';
      if (unitLabel) unitLabel.textContent = select.options[select.selectedIndex].text;
      validateField(input);
      markStale();
    });
  });
  form.addEventListener('input', (event) => {
    if (event.target.tagName !== 'INPUT') return;
    event.target.setCustomValidity('');
    const label = document.querySelector('[data-circuit="' + event.target.name + '"]');
    if (label) label.textContent = event.target.value || '—';
    markStale();
  });
})();
