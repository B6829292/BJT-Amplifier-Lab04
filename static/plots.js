/* Render only the numerical samples returned by ngspice; axes are presentation. */
(() => {
  const source = document.getElementById('plot-data');
  const ns = 'http://www.w3.org/2000/svg';

  const element = (tag, attributes, text) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function bounds(values) {
    const min = Math.min(...values), max = Math.max(...values);
    const padding = (max - min || Math.abs(max) || 1) * 0.08;
    return {min: min - padding, max: max + padding};
  }

  function linearTicks(min, max, intervals = 5) {
    const target = (max - min) / intervals;
    const scale = 10 ** Math.floor(Math.log10(target));
    const step = [1, 2, 2.5, 5, 10].reduce((nearest, value) =>
      Math.abs(value * scale - target) < Math.abs(nearest - target) ? value * scale : nearest, scale);
    const first = Math.ceil(min / step - 1e-9);
    const last = Math.floor(max / step + 1e-9);
    return Array.from({length: last - first + 1}, (_, i) => +((first + i) * step).toPrecision(12));
  }

  function powerOfTen(exponent) {
    const superscript = String(exponent).replace(/[-0-9]/g, char => char === '-' ? '⁻' : '⁰¹²³⁴⁵⁶⁷⁸⁹'[char]);
    return `10${superscript}`;
  }

  function plot(title, x, series, xLabel, yLabel, logarithmic, dualAxis = false) {
    const width = 400, height = 200, left = 57, right = dualAxis ? 57 : 22, top = 16, bottom = 46;
    const plotRight = width - right, plotBottom = height - bottom;
    const plotWidth = plotRight - left, plotHeight = plotBottom - top;
    const axisColor = '#667680';
    const xMap = logarithmic ? Math.log10 : value => value;
    const xmin = xMap(x[0]), xmax = xMap(x[x.length - 1]);
    const primary = bounds(dualAxis ? series[0].values : series.flatMap(item => item.values));
    const secondary = dualAxis ? bounds(series[1].values) : primary;
    const yAxis = item => item.wrapped && dualAxis ? secondary : primary;
    const displayScale = logarithmic ? 1 : 1000;
    const tickLabel = value => String(value).replace('-', '−');
    const px = value => left + (xMap(value) - xmin) / (xmax - xmin) * plotWidth;
    const py = (value, axis = primary) => top + (axis.max - value) / (axis.max - axis.min) * plotHeight;

    const figure = document.createElement('figure');
    const caption = document.createElement('figcaption');
    caption.textContent = title;
    figure.appendChild(caption);
    const svg = element('svg', {viewBox: `0 0 ${width} ${height}`, role: 'img', tabindex: 0,
      'aria-label': `${title}, ${xLabel}, ${yLabel}${dualAxis ? ', Phase (degrees), right axis' : ''}`});
    svg.appendChild(element('desc', {}, `${x.length} ngspice samples. ${xLabel}: ${x[0] * displayScale} to ${x[x.length - 1] * displayScale}. ` +
      series.map(item => `${item.name}: ${(Math.min(...item.values) * displayScale).toPrecision(4)} to ${(Math.max(...item.values) * displayScale).toPrecision(4)} ${dualAxis && item.wrapped ? 'degrees (right axis)' : yLabel}.`).join(' ')));
    svg.appendChild(element('rect', {x: 0, y: 0, width, height, fill: 'transparent', 'pointer-events': 'all'}));
    svg.appendChild(element('rect', {x: left, y: top, width: plotWidth, height: plotHeight, fill: '#fcfeff'}));

    const horizontalTicks = [];
    if (logarithmic) {
      const decadeStep = Math.max(1, Math.ceil((xmax - xmin) / 5));
      const firstDecade = Math.ceil(xmin - 1e-9);
      const lastDecade = Math.floor(xmax + 1e-9);
      for (let exponent = firstDecade; exponent <= lastDecade; exponent++) {
        horizontalTicks.push({value: 10 ** exponent, label: (exponent - firstDecade) % decadeStep === 0 ? powerOfTen(exponent) : ''});
      }
    } else {
      linearTicks(xmin * displayScale, xmax * displayScale).forEach(value =>
        horizontalTicks.push({value: value / displayScale, label: tickLabel(value)}));
    }

    horizontalTicks.forEach(({value, label}) => {
      const xx = px(value);
      const grid = {x1: xx, x2: xx, y1: top, y2: plotBottom, class: 'plot-grid'};
      if (!label) grid['stroke-opacity'] = .45;
      svg.appendChild(element('line', grid));
      if (!label) return;
      svg.appendChild(element('line', {x1: xx, x2: xx, y1: plotBottom, y2: plotBottom + 4, stroke: axisColor}));
      svg.appendChild(element('text', {x: xx, y: plotBottom + 19, 'text-anchor': 'middle'}, label));
    });

    const gainStyle = dualAxis ? `fill:${series[0].color}` : '';
    const phaseStyle = dualAxis ? `fill:${series[1].color}` : '';
    const yMagnitude = Math.max(Math.abs(primary.min), Math.abs(primary.max)) * displayScale;
    const yExponent = yMagnitude < .01 || yMagnitude >= 10000 ? 3 * Math.floor(Math.log10(yMagnitude) / 3) : 0;
    const tickScale = displayScale / 10 ** yExponent;
    if (yExponent) svg.appendChild(element('text', {x: left, y: top - 4, style: gainStyle}, `×${powerOfTen(yExponent)}`));
    linearTicks(primary.min * tickScale, primary.max * tickScale).forEach(value => {
      const yy = py(value / tickScale);
      svg.appendChild(element('line', {x1: left, x2: plotRight, y1: yy, y2: yy, class: 'plot-grid'}));
      svg.appendChild(element('line', {x1: left - 4, x2: left, y1: yy, y2: yy, stroke: axisColor}));
      svg.appendChild(element('text', {x: left - 8, y: yy + 4, 'text-anchor': 'end', style: gainStyle}, tickLabel(value)));
    });
    if (dualAxis) {
      const phaseTicks = secondary.min <= -180 && secondary.max >= 180 ? [-180, -90, 0, 90, 180] :
        linearTicks(Math.max(-180, secondary.min), Math.min(180, secondary.max), 4);
      phaseTicks.forEach(value => {
        const yy = py(value, secondary);
        svg.appendChild(element('line', {x1: plotRight, x2: plotRight + 4, y1: yy, y2: yy, stroke: axisColor}));
        svg.appendChild(element('text', {x: plotRight + 8, y: yy + 4, 'text-anchor': 'start',
          class: 'phase-axis', style: phaseStyle}, tickLabel(value)));
      });
    }
    svg.appendChild(element('rect', {x: left, y: top, width: plotWidth, height: plotHeight,
      fill: 'none', stroke: axisColor, 'stroke-width': 1.15, 'data-plot-frame': 'true'}));

    const centerY = (top + plotBottom) / 2;
    svg.appendChild(element('text', {x: (left + plotRight) / 2, y: height - 8,
      'text-anchor': 'middle', class: 'plot-axis-title'}, xLabel));
    svg.appendChild(element('text', {x: 14, y: centerY, transform: `rotate(-90 14 ${centerY})`,
      'text-anchor': 'middle', class: 'plot-axis-title', style: gainStyle}, yLabel));
    if (dualAxis) svg.appendChild(element('text', {x: width - 12, y: centerY,
      transform: `rotate(90 ${width - 12} ${centerY})`, 'text-anchor': 'middle',
      class: 'phase-axis plot-axis-title', style: phaseStyle}, 'Phase (degrees)'));

    series.forEach(item => {
      const segments = [[]];
      x.forEach((value, i) => {
        if (item.wrapped && i > 0 && Math.abs(item.values[i] - item.values[i - 1]) > 180) segments.push([]);
        segments[segments.length - 1].push(`${px(value).toFixed(2)},${py(item.values[i], yAxis(item)).toFixed(2)}`);
      });
      segments.forEach(points => svg.appendChild(element('polyline', {points: points.join(' '), fill: 'none', stroke: item.color,
        'stroke-width': 1.7, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        'stroke-dasharray': item.wrapped ? '5 3' : 'none', 'data-series': item.name,
        'data-axis': item.wrapped && dualAxis ? 'right' : 'left'})));
    });

    const tooltip = element('g', {'data-plot-tooltip': 'true', visibility: 'hidden', 'pointer-events': 'none', role: 'tooltip'});
    const crosshair = element('line', {y1: top, y2: plotBottom, stroke: '#7997a7', 'stroke-width': 1, 'stroke-dasharray': '3 2'});
    const markers = series.map(item => element('circle', {r: 3, fill: item.color, stroke: '#fff', 'stroke-width': 1.2,
      'data-sample-marker': item.name}));
    const boxWidth = 170, boxHeight = 52;
    const tooltipBox = element('rect', {width: boxWidth, height: boxHeight, rx: 3, fill: '#fbfdff', stroke: '#9cb5c6', 'stroke-width': 1});
    const tooltipText = Array.from({length: series.length + 1}, () => element('text', {'font-size': 13}));
    [crosshair, ...markers, tooltipBox, ...tooltipText].forEach(node => tooltip.appendChild(node));
    svg.appendChild(tooltip);

    let selected = 0;
    function inspect(index) {
      selected = Math.max(0, Math.min(x.length - 1, index));
      const xx = px(x[selected]);
      const boxX = Math.min(width - boxWidth - 5, Math.max(5, xx > width / 2 ? xx - boxWidth - 7 : xx + 7));
      crosshair.setAttribute('x1', xx);
      crosshair.setAttribute('x2', xx);
      markers.forEach((marker, i) => {
        marker.setAttribute('cx', xx);
        marker.setAttribute('cy', py(series[i].values[selected], yAxis(series[i])));
      });
      tooltipBox.setAttribute('x', boxX);
      tooltipBox.setAttribute('y', top + 5);
      const labels = [logarithmic ? 'f = ' + x[selected].toPrecision(4) + ' Hz' : 't = ' + +(x[selected] * 1000).toPrecision(4) + ' ms',
        ...series.map(item => item.name + ' = ' + (item.values[selected] * displayScale).toPrecision(4) +
          (dualAxis ? (item.wrapped ? '°' : ' dB') : ' mV'))];
      tooltipText.forEach((node, i) => {
        node.setAttribute('x', boxX + 7);
        node.setAttribute('y', top + 20 + i * 15);
        node.textContent = labels[i];
      });
      tooltip.setAttribute('aria-label', labels.join('; '));
      tooltip.setAttribute('visibility', 'visible');
    }

    svg.addEventListener('pointermove', event => {
      const rect = svg.getBoundingClientRect();
      const xx = (event.clientX - rect.left) / rect.width * width;
      let best = 0;
      for (let i = 1; i < x.length; i++) {
        if (Math.abs(px(x[i]) - xx) < Math.abs(px(x[best]) - xx)) best = i;
      }
      inspect(best);
    });
    svg.addEventListener('pointerleave', () => tooltip.setAttribute('visibility', 'hidden'));
    svg.addEventListener('focus', () => inspect(selected));
    svg.addEventListener('blur', () => tooltip.setAttribute('visibility', 'hidden'));
    svg.addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        inspect(event.key === 'Home' ? 0 : event.key === 'End' ? x.length - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    figure.appendChild(svg);

    const legend = document.createElement('p');
    legend.className = 'plot-legend';
    series.forEach(item => {
      const entry = document.createElement('span');
      entry.className = 'plot-legend-entry';
      const key = document.createElement('span');
      key.className = 'plot-legend-key';
      key.setAttribute('aria-hidden', 'true');
      Object.assign(key.style, {display: 'inline-block', width: '1.6em', verticalAlign: 'middle',
        marginRight: '.45em', borderTop: `2px ${item.wrapped ? 'dashed' : 'solid'} ${item.color}`});
      const label = document.createElement('span');
      label.textContent = `${item.name}${dualAxis ? (item.wrapped ? ' (°, right)' : ' (dB, left)') : ''}`;
      entry.appendChild(key);
      entry.appendChild(label);
      legend.appendChild(entry);
    });
    figure.appendChild(legend);

    if (dualAxis) {
      const note = document.createElement('p');
      note.className = 'bode-note';
      note.textContent = 'Phase wraps at ±180°; gaps are intentional.';
      figure.appendChild(note);
    }
    return figure;
  }

  function render(data, container) {
    if (data.frequency_hz) {
      container.appendChild(plot('Bode gain / phase (wrapped)', data.frequency_hz, [
        {name: 'Gain', values: data.gain_db, color: '#284de0'},
        {name: 'Phase', values: data.phase_deg, color: '#228344', wrapped: true}
      ], 'Frequency (Hz, log)', 'Gain (dB)', true, true));
    } else {
      container.appendChild(plot('Transient input and output', data.time_s, [
        {name: 'Vin', values: data.vin_v, color: '#284de0'},
        {name: 'Vout', values: data.vout_v, color: '#159638'}
      ], 'Time (ms)', 'Voltage (mV)', false));
    }
  }

  if (typeof window !== 'undefined') window.renderSpicePlots = render;
  if (source) render(JSON.parse(source.textContent), document.getElementById('plots'));
})();
