const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function renderInput(input) {
  const original = JSON.stringify(input);
  const container = {children: [], appendChild(n) { this.children.push(n); }};
  function node(tag) {
    return {tag, attrs: {}, children: [], style: {}, setAttribute(k, v) { this.attrs[k] = v; },
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
assert.match(svg.attrs['aria-label'], /Time \(ms\).*Voltage \(mV\)/);
assert.strictEqual(svg.children.find(n=>n.tag==='polyline'&&n.attrs['data-series']==='Vin').attrs['stroke-dasharray'], 'none');
assert.strictEqual(svg.children.find(n=>n.tag==='polyline'&&n.attrs['data-series']==='Vout').attrs['stroke-dasharray'], '5 3');
assert.strictEqual(JSON.stringify(transient), plotted.original);
