/* Per-tab result freshness: compare only the parameters that affect each analysis. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RunHistory = factory();
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  const common = ['vcc', 'r1', 'r2', 'rc', 're', 'rl', 'cin', 'cout'];
  const sourceUnits = {
    amplitude: {mV: 1e-3, V: 1, uV: 1e-6},
    frequency: {Hz: 1, kHz: 1e3, MHz: 1e6}
  };
  const defaultSourceUnits = {amplitude:'mV', frequency:'Hz'};
  function decimalNumber(value) {
    // Python float accepts separators between decimal digits, but not JS radix literals.
    const text = String(value ?? '').trim().replace(/(\d)_(?=\d)/g, '$1');
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ? Number(text) : NaN;
  }
  function sourceFactor(key, unit = defaultSourceUnits[key]) {
    const units = sourceUnits[key];
    return units && Object.hasOwn(units, unit) ? units[unit] : NaN;
  }
  function sourceUnitLabel(key, unit = defaultSourceUnits[key]) {
    return key === 'amplitude' ? `${unit === 'uV' ? 'µV' : unit} peak` : unit;
  }
  function sourceValue(key, value, unit) {
    return decimalNumber(value) * sourceFactor(key, unit);
  }
  function sameSource(key, left, right) {
    const leftUnit = left[key + '_unit'] ?? defaultSourceUnits[key];
    const rightUnit = right[key + '_unit'] ?? defaultSourceUnits[key];
    const a = sourceValue(key, left[key], leftUnit);
    const b = sourceValue(key, right[key], rightUnit);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (leftUnit === rightUnit) return decimalNumber(left[key]) === decimalNumber(right[key]);
    // Equivalent unit conversions can round to adjacent floating-point values.
    return Math.abs(a - b) <= 4 * Number.EPSILON * Math.max(Math.abs(a), Math.abs(b));
  }
  function isCurrent(record, inputs) {
    const bypass = inputs.emitter_bypass ?? 'off';
    if (bypass !== (record.inputs.emitter_bypass ?? 'off')) return false;
    const keys = common.slice();
    if (bypass === 'on') keys.push('ce');
    const circuitMatches = keys.every(key => Number.isFinite(decimalNumber(inputs[key])) &&
      decimalNumber(inputs[key]) === decimalNumber(record.inputs[key]));
    return circuitMatches && (record.mode !== 'tran' || Object.keys(sourceUnits).every(key => sameSource(key, inputs, record.inputs)));
  }
  function create() {
    const records = {};
    const pending = new Set();
    return {records, pending,
      start(mode) { pending.add(mode); },
      complete(record) { pending.delete(record.mode); records[record.mode] = {...record, inputs: {...record.inputs}}; },
      fail(mode, error) { pending.delete(mode); records[mode] = {mode, error}; }
    };
  }
  return {isCurrent, create, decimalNumber, sourceFactor, sourceUnitLabel, sourceValue, sourceUnits};
});
