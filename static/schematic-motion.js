/* Schematic waveforms follow one presentation clock over actual transient samples. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SchematicMotion = factory();
})(globalThis, function () {
  const keys = ['vin', 'vout'];
  const traceHeight = 17.5;
  const defaultBounds = {x: 0, width: 100, y: 0};

  function lowerBound(times, target) {
    let low = 0;
    let high = times.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (times[middle] < target) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function prepare(data, frequency, bounds) {
    if (!Number.isFinite(frequency) || frequency <= 0) throw new RangeError('Frequency must be finite and positive.');
    const {time_s: times, vin_v: input, vout_v: output} = data;
    const last = times[times.length - 1];
    const duration = last - times[0];
    const period = 1 / frequency;
    const travel = Math.min(period, duration / 3);
    const span = Math.min(2 * period, duration - travel);
    // Compress the supported source frequencies into a visible range of motion.
    const displayCyclesPerSecond = 0.4 + 0.24 * Math.log10(1 + frequency);
    const peak = times.reduce((value, _, index) => Math.max(value, Math.abs(input[index]), Math.abs(output[index])), 1e-12);
    const voltageScale = traceHeight / peak;

    return function frameAt(elapsedSeconds) {
      const phase = (elapsedSeconds * displayCyclesPerSecond) % 1;
      // Slide a two-period window through the final three periods of the run.
      // Each frame stays in one continuous part of the sampled transient.
      const start = Math.max(times[0], last - span - travel * (1 - phase));
      const end = Math.min(last, start + span);
      const inputValues = [];
      const outputValues = [];
      const inputPoints = [];
      const outputPoints = [];

      function point(bounds, fraction, voltage) {
        return (bounds.x + fraction * bounds.width).toFixed(2) + ',' + (bounds.y - voltage * voltageScale).toFixed(2);
      }

      function append(time, inputVoltage, outputVoltage) {
        const fraction = (time - start) / (end - start);
        inputValues.push(inputVoltage);
        outputValues.push(outputVoltage);
        inputPoints.push(point(bounds.vin, fraction, inputVoltage));
        outputPoints.push(point(bounds.vout, fraction, outputVoltage));
      }

      function appendBoundary(time, index) {
        if (index === 0 || times[index] === time) {
          append(time, input[index], output[index]);
          return;
        }
        const before = index - 1;
        const fraction = (time - times[before]) / (times[index] - times[before]);
        append(time,
          input[before] + fraction * (input[index] - input[before]),
          output[before] + fraction * (output[index] - output[before]));
      }

      const firstIndex = lowerBound(times, start);
      const lastIndex = lowerBound(times, end);
      appendBoundary(start, firstIndex);
      for (let i = firstIndex; i < lastIndex; i++) {
        if (times[i] > start) append(times[i], input[i], output[i]);
      }
      appendBoundary(end, lastIndex);
      return {vin: inputPoints.join(' '), vout: outputPoints.join(' '), inputValues, outputValues, displayCyclesPerSecond};
    };
  }

  function frame(data, frequency, elapsedSeconds) {
    return prepare(data, frequency, {vin: defaultBounds, vout: defaultBounds})(elapsedSeconds);
  }

  function setCurrentFlow(schematic, branch, amperes) {
    // Values below half the displayed 0.01 mA step have no visible flow marker.
    const direction = !Number.isFinite(amperes) || Math.abs(amperes) < 5e-6 ? 'idle' : amperes < 0 ? 'reverse' : 'forward';
    const property = branch + 'Flow';
    if (schematic.dataset[property] === direction) return;
    schematic.dataset[property] = direction;
    schematic.querySelectorAll(`[data-current-arrow="${branch}"]`).forEach(arrow => {
      arrow.removeAttribute('marker-start');
      arrow.removeAttribute('marker-end');
      if (direction !== 'idle') arrow.setAttribute(direction === 'reverse' ? 'marker-start' : 'marker-end', 'url(#arrow-orange)');
    });
  }

  function bindControls(schematic, {onChange = () => {}, onRestart = () => {}} = {}) {
    const states = document.body.dataset;
    const switches = [...document.querySelectorAll('.overlay-toolbar input[data-overlay]')];
    const enabledAnimation = document.getElementById('overlay-animation');
    const pause = document.getElementById('pause-animation');
    const restart = document.getElementById('restart-animation');

    function sync() {
      switches.forEach(control => { states[control.dataset.overlay] = control.checked ? 'on' : 'off'; });
      onChange();
    }
    function setPaused(value) {
      states.paused = String(value);
      pause.setAttribute('aria-pressed', String(value));
      pause.setAttribute('aria-label', value ? 'Resume overlay animation' : 'Pause overlay animation');
      sync();
    }
    function rewind() {
      enabledAnimation.checked = true;
      setPaused(false);
      onRestart();
      schematic.querySelectorAll('.flow-path, .node-pulse').forEach(node => {
        for (const animation of node.getAnimations?.() ?? []) animation.currentTime = 0;
      });
    }

    switches.forEach(control => control.addEventListener('change', sync));
    pause.addEventListener('click', () => setPaused(states.paused !== 'true'));
    restart.addEventListener('click', rewind);
    setPaused(false);
    return {reset() {
      switches.forEach(control => { control.checked = true; });
      rewind();
    }};
  }

  function create(waves) {
    const bounds = Object.fromEntries(keys.map(key => {
      const {waveX, waveWidth, waveY} = waves[key].dataset;
      return [key, {x: Number(waveX), width: Number(waveWidth), y: Number(waveY)}];
    }));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let playing = false;
    let data = null;
    let frameAt;
    let elapsed = 0;
    let previousTime;
    let requestId = null;

    function render() {
      const points = frameAt(elapsed);
      keys.forEach(key => waves[key].setAttribute('points', points[key]));
    }

    function tick(timestamp) {
      if (previousTime !== undefined) elapsed += (timestamp - previousTime) / 1000;
      previousTime = timestamp;
      render();
      requestId = window.requestAnimationFrame(tick);
    }

    function sync() {
      if (frameAt && playing && !document.hidden && !reducedMotion.matches) {
        if (requestId === null) requestId = window.requestAnimationFrame(tick);
      } else {
        if (requestId !== null) window.cancelAnimationFrame(requestId);
        requestId = null;
        previousTime = undefined;
      }
    }

    function restart() {
      elapsed = 0;
      previousTime = undefined;
      if (frameAt) render();
    }

    reducedMotion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);

    return {
      setData(nextData, frequency) {
        if (data === nextData) return;
        data = nextData;
        frameAt = data ? prepare(data, frequency, bounds) : undefined;
        if (!frameAt) keys.forEach(key => waves[key].removeAttribute('points'));
        restart();
        sync();
      },
      setPlaying(value) {
        playing = value;
        sync();
      },
      restart
    };
  }

  return {frame, create, setCurrentFlow, bindControls};
});
