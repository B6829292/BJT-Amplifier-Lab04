/* Render only the numerical samples returned by ngspice; axes are presentation. */
(() => {
  const source = document.getElementById('plot-data');
  function render(data, container) {
  const ns = 'http://www.w3.org/2000/svg';
  const element = (tag, attributes, text) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function plot(title, x, series, xLabel, yLabel, logarithmic, dualAxis = false) {
    const width = 400, height = 250, left = 82, right = 82, top = 16, bottom = 50;
    const xMap = logarithmic ? Math.log10 : value => value;
    const xmin = xMap(x[0]), xmax = xMap(x[x.length - 1]);
    const bounds = values => {
      let min = Math.min(...values), max = Math.max(...values);
      const padding = (max - min || Math.abs(max) || 1) * 0.08;
      return {min: min - padding, max: max + padding};
    };
    const primary = bounds(dualAxis ? series[0].values : series.flatMap(item => item.values));
    const secondary = dualAxis ? bounds(series[1].values) : primary;
    const ymin = primary.min, ymax = primary.max;
    const displayScale = logarithmic ? 1 : 1000;
    const tickLabel = (value, span) => {
      const decimals = Math.min(10, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(span) || 1))));
      return String(+value.toFixed(decimals));
    };
    const px = value => left + (xMap(value) - xmin) / (xmax - xmin) * (width - left - right);
    const py = (value, axis = primary) => top + (axis.max - value) / (axis.max - axis.min) * (height - top - bottom);
    const figure = document.createElement('figure');
    const caption = document.createElement('figcaption');
    caption.textContent = title;
    figure.appendChild(caption);
    const svg = element('svg', {viewBox: `0 0 ${width} ${height}`, role: 'img',
      'aria-label': `${title}, ${xLabel}, ${yLabel}${dualAxis ? ', Phase (degrees), right axis' : ''}`});
    svg.appendChild(element('desc', {}, `${x.length} ngspice samples. ${xLabel}: ${x[0] * displayScale} to ${x[x.length - 1] * displayScale}. ` +
      series.map(item => `${item.name}: ${(Math.min(...item.values) * displayScale).toPrecision(4)} to ${(Math.max(...item.values) * displayScale).toPrecision(4)} ${dualAxis && item.wrapped ? 'degrees (right axis)' : yLabel}.`).join(' ')));
    for (let i = 0; i <= 4; i++) {
      const y = top + i * (height - top - bottom) / 4;
      const value = ymax - i * (ymax - ymin) / 4;
      svg.appendChild(element('line', {x1: left, x2: width - right, y1: y, y2: y, class: 'plot-grid'}));
      svg.appendChild(element('text', {x: left - 8, y: y + 4, 'text-anchor': 'end'}, tickLabel(value * displayScale, (ymax - ymin) * displayScale)));
      if (dualAxis) svg.appendChild(element('text', {x: width - right + 8, y: y + 4,
        'text-anchor': 'start', class: 'phase-axis'}, tickLabel(secondary.max - i * (secondary.max - secondary.min) / 4, secondary.max - secondary.min)));
    }
    for (let i = 0; i <= 4; i++) {
      const value = logarithmic ? 10 ** (xmin + i * (xmax - xmin) / 4) : xmin + i * (xmax - xmin) / 4;
      const xx = px(value);
      svg.appendChild(element('line', {x1: xx, x2: xx, y1: top, y2: height - bottom, class: 'plot-grid'}));
      const tick = logarithmic && value >= 1e6 ? `${+(value / 1e6).toPrecision(3)}M` :
        logarithmic && value >= 1000 ? `${+(value / 1000).toPrecision(3)}k` : tickLabel(value * displayScale, (x[x.length - 1] - x[0]) * displayScale);
      svg.appendChild(element('text', {x: xx, y: height - bottom + 20, 'text-anchor': 'middle'}, tick));
    }
    svg.appendChild(element('text', {x: (left + width - right) / 2, y: height - 8, 'text-anchor': 'middle'}, xLabel));
    svg.appendChild(element('text', {x: 16, y: (top + height - bottom) / 2,
      transform: `rotate(-90 16 ${(top + height - bottom) / 2})`, 'text-anchor': 'middle'}, yLabel));
    if (dualAxis) svg.appendChild(element('text', {x: width - 12, y: (top + height - bottom) / 2,
      transform: `rotate(90 ${width - 12} ${(top + height - bottom) / 2})`,
      'text-anchor': 'middle', class: 'phase-axis'}, 'Phase (degrees)'));
    series.forEach(item => {
      const segments = [[]];
      x.forEach((value, i) => {
        if (item.wrapped && i > 0 && Math.abs(item.values[i] - item.values[i - 1]) > 180) segments.push([]);
        segments[segments.length - 1].push(`${px(value).toFixed(2)},${py(item.values[i], item.wrapped && dualAxis ? secondary : primary).toFixed(2)}`);
      });
      segments.forEach(points => svg.appendChild(element('polyline', {points: points.join(' '), fill: 'none', stroke: item.color,
        'stroke-width': 2.5, 'stroke-dasharray': item.wrapped || item.dashed ? '5 3' : 'none', 'data-series': item.name,
        'data-axis': item.wrapped && dualAxis ? 'right' : 'left'})));
    });
    figure.appendChild(svg);
    const legend = document.createElement('p');
    legend.className = 'plot-legend';
    series.forEach(item => {
      const label = document.createElement('span');
      label.textContent = `${item.wrapped || item.dashed ? '┄' : '—'} ${item.name}${dualAxis ? item.wrapped ? ' (°, right)' : ' (dB, left)' : ''}`;
      label.style.color = item.color;
      legend.appendChild(label);
    });
    figure.appendChild(legend);
    if (dualAxis) {
      const note = document.createElement('p');
      note.className = 'bode-note';
      note.textContent = 'Phase wraps at ±180°; gaps are intentional.';
      figure.appendChild(note);
    }
    container.appendChild(figure);
  }
  if (data.frequency_hz) {
    plot('Bode gain / phase (wrapped)', data.frequency_hz, [
      {name: 'Gain', values: data.gain_db, color: '#006f80'},
      {name: 'Phase', values: data.phase_deg, color: '#a44f17', wrapped: true}
    ], 'Frequency (Hz, log)', 'Gain (dB)', true, true);
  } else {
    plot('Transient input and output', data.time_s, [
      {name: 'Vin', values: data.vin_v, color: '#006f80'},
      {name: 'Vout', values: data.vout_v, color: '#a44f17', dashed: true}
    ], 'Time (ms)', 'Voltage (mV)', false);
  }
  }
  if (typeof window !== 'undefined') window.renderSpicePlots = render;
  if (source) render(JSON.parse(source.textContent), document.getElementById('plots'));
})();
