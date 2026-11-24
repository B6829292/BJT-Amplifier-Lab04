/* Per-tab result freshness: compare only the parameters that affect each analysis. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RunHistory = factory();
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  const common = ['vcc', 'r1', 'r2', 'rc', 're', 'rl', 'cin', 'cout'];
  function decimalNumber(value) {
    // Python float accepts separators between decimal digits, but not JS radix literals.
    const text = String(value ?? '').trim().replace(/(\d)_(?=\d)/g, '$1');
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ? Number(text) : NaN;
  }
  function isCurrent(record, inputs) {
    const keys = record.mode === 'tran' ? common.concat(['amplitude', 'frequency']) : common;
    return keys.every(key => Number.isFinite(decimalNumber(inputs[key])) &&
      decimalNumber(inputs[key]) === decimalNumber(record.inputs[key]));
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
  return {isCurrent, create};
});
