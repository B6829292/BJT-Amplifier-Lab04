const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function renderInput(input) {
  const original = JSON.stringify(input);
  const container = {children: [], appendChild(n) { this.children.push(n); }};
  function node(tag) {
    return {tag, attrs: {}, children: [], style: {}, events: {}, setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(k, fn) { this.events[k] = fn; }, getBoundingClientRect() { return {left:0,width:400}; },
      appendChild(n) { this.children.push(n); }};
  }
  const document = {
    getElementById(id) { return id === 'plot-data' ? {textContent: original} : container; },
    createElementNS(_, tag) { return node(tag); }, createElement: node
  };
  vm.runInNewContext(fs.readFileSync('static/plots.js', 'utf8'), {document, JSON:{parse:()=>input}});
  return {container,original};
}
function render(phases) {
  const input = {frequency_hz: phases.map((_, i) => 10 ** i), gain_db: phases.map(() => 1), phase_deg: phases};
  const {container,original} = renderInput(input);
  assert.strictEqual(container.children.length, 1, 'Bode magnitude and phase must share one chart');
  const phaseFigure = container.children[0];
  const svg = phaseFigure.children[1];
  assert.strictEqual(svg.attrs.role, 'img');
  assert.strictEqual(svg.attrs.tabindex, 0, 'charts support keyboard sample inspection');
  assert.match(svg.attrs['aria-label'], /phase/i);
  assert.ok(svg.children.some(n => n.tag === 'desc' && /samples/.test(n.textContent)));
  assert.ok(svg.children.some(n => n.tag === 'text' && n.textContent === 'Gain (dB)'));
  assert.ok(svg.children.some(n => n.tag === 'text' && n.textContent === 'Phase (degrees)'));
  const gain = svg.children.filter(n => n.tag === 'polyline' && n.attrs['data-series'] === 'Gain');
  assert.strictEqual(gain.length, 1);
  assert.strictEqual(gain[0].attrs['data-axis'], 'left');
  assert.strictEqual(gain[0].attrs.points.trim().split(/\s+/).length, phases.length);
  const lines = svg.children.filter(n => n.tag === 'polyline' && n.attrs['data-series'] === 'Phase');
  assert.ok(lines.every(line=>line.attrs['data-axis']==='right' && line.attrs['stroke-dasharray']==='5 3'));
  if (phases.length === 4) {
    const frame = svg.children.find(node => node.attrs['data-plot-frame'] === 'true');
    assert.ok(frame, 'chart axes frame the sampled data');
    const decade = svg.children.find(node => node.tag === 'text' && node.textContent === '10²');
    assert.ok(decade, 'logarithmic axis labels exact powers of ten');
    assert.ok(Math.abs(decade.attrs.x - (frame.attrs.x + frame.attrs.width * 2 / 3)) < .001);
    const labels = svg.children.filter(node => node.tag === 'text' && node.attrs.class === 'phase-axis');
    assert.ok(labels.some(node => node.textContent === '−180') && labels.some(node => node.textContent === '180'),
      'wide wrapped phase ranges show the physical wrap limits');
  }
  assert.strictEqual(JSON.stringify(input), original);
  const counts = lines.map(line => line.attrs.points.trim().split(/\s+/).length);
  return {counts, caption: phaseFigure.children[0].textContent};
}
const first = render([-170, -179, 179, 170]);
assert.deepStrictEqual(first.counts, [2, 2]);
assert.match(first.caption, /wrapped/i);
assert.deepStrictEqual(render([170, 179, -179, -170]).counts, [2, 2]);
assert.deepStrictEqual(render([-90, 90, 100]).counts, [3]);
const transient = {time_s:[0,.001,.002],vin_v:[0,.01,0],vout_v:[0,-.02,0]};
const plotted = renderInput(transient);
const svg = plotted.container.children[0].children[1];
assert.ok(svg.events.pointermove, 'charts expose sample tooltip on pointer movement');
const tooltip = svg.children.find(n=>n.attrs['data-plot-tooltip']==='true');
assert.ok(tooltip);
svg.events.pointermove({clientX:57});
assert.strictEqual(tooltip.attrs.visibility,'visible');
assert.match(tooltip.attrs['aria-label'],/Vin.*Vout/);
svg.events.keydown({key:'End',preventDefault(){}});
assert.match(tooltip.attrs['aria-label'],/2 ms/);
const marker = tooltip.children.find(node => node.attrs['data-sample-marker'] === 'Vout');
assert.ok(marker, 'sample inspection highlights the selected Vout sample');
const vout = svg.children.find(node => node.tag === 'polyline' && node.attrs['data-series'] === 'Vout');
const [lastX, lastY] = vout.attrs.points.split(' ').at(-1).split(',').map(Number);
assert.ok(Math.hypot(marker.attrs.cx - lastX, marker.attrs.cy - lastY) < .01);
assert.match(svg.attrs['aria-label'], /Time \(ms\).*Voltage \(mV\)/);
assert.strictEqual(svg.children.find(n=>n.tag==='polyline'&&n.attrs['data-series']==='Vin').attrs['stroke-dasharray'], 'none');
assert.strictEqual(svg.children.find(n=>n.tag==='polyline'&&n.attrs['data-series']==='Vout').attrs['stroke-dasharray'], 'none', 'Phase 7.2 explicitly requires a solid green transient output');
assert.strictEqual(JSON.stringify(transient), plotted.original);

const microvolts = {time_s:[0,.001,.002],vin_v:[0,1e-9,0],vout_v:[0,-2e-9,0]};
const tinyChart = renderInput(microvolts).container.children[0].children[1];
assert.ok(tinyChart.children.some(node => node.tag === 'text' && node.textContent === '×10⁻⁶'),
  'tiny voltage values use a compact multiplier on the mV axis');
tinyChart.events.keydown({key:'ArrowRight',preventDefault(){}});
const tinyTooltip = tinyChart.children.find(node => node.attrs['data-plot-tooltip'] === 'true').attrs['aria-label'];
assert.strictEqual(Number(tinyTooltip.match(/Vout = (\S+) mV/)[1]), -2e-6, 'axis multiplier does not scale selected samples');
