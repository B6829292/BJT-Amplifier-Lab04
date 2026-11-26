const assert = require('assert');
const history = require('../static/run-history.js');
const common = {vcc:'12',r1:'100',r2:'22',rc:'2.2',re:'1',rl:'10',cin:'10',cout:'10',amplitude:'10',frequency:'1000'};
const dc = {mode:'dc', inputs:common, result:{vb:2,ve:1,vc:9,vce:8,ic:0.001}};
const tran = {mode:'tran', inputs:common, result:{time_s:[0,1],vin_v:[0,0.01],vout_v:[0,-0.02]}};
assert.strictEqual(history.isCurrent(dc, {...common}), true);
assert.strictEqual(history.isCurrent(dc, {...common, frequency:'2000'}), true);
assert.strictEqual(history.isCurrent(tran, {...common, frequency:'2000'}), false);
assert.strictEqual(history.isCurrent(dc, {...common, re:'2'}), false);
assert.strictEqual(history.isCurrent(tran, {...common, re:'2'}), false);
assert.strictEqual(history.isCurrent(dc, {...common, re:''}), false);
const enabled = {...common, emitter_bypass:'on', ce:'100'};
const bypassRun = {...tran, inputs:enabled};
assert.strictEqual(history.isCurrent(tran, enabled), false);
assert.strictEqual(history.isCurrent(bypassRun, {...enabled, ce:'100.0'}), true);
assert.strictEqual(history.isCurrent(bypassRun, {...enabled, ce:'47'}), false);
assert.strictEqual(history.isCurrent(bypassRun, common), false);
assert.strictEqual(history.isCurrent(dc, {...common, emitter_bypass:'off', ce:'invalid'}), true);
const sameSource = {...common, amplitude:'0.01', amplitude_unit:'V', frequency:'1', frequency_unit:'kHz'};
assert.strictEqual(history.isCurrent(tran, sameSource), true);
assert.strictEqual(history.isCurrent({...tran, inputs:sameSource}, common), true);
assert.strictEqual(history.isCurrent(tran, {...sameSource, frequency:'1.001'}), false);
assert.strictEqual(history.isCurrent(tran, {...sameSource, frequency_unit:'invalid'}), false);
// JavaScript Number accepts radix literals that Python float rejects.
for (const r1 of ['0x64', '0b1100100', '0o144']) {
  assert.strictEqual(history.isCurrent(dc, {...common, r1}), false, r1 + ' must not be current');
}
// Preserve server-accepted decimal/scientific notation, including digit separators.
for (const r1 of ['100.0', '1e2', '  +1_0_0.0  ', '1_0e+1']) {
  assert.strictEqual(history.isCurrent(dc, {...common, r1}), true, r1 + ' must match 100');
}
assert.strictEqual(history.isCurrent({...dc, inputs:{...common, r1:'1_00'}}, common), true);
for (const r1 of ['1__00', '_100', '100_', '1_.0e2', 'NaN', 'Infinity']) {
  assert.strictEqual(history.isCurrent(dc, {...common, r1}), false);
}
const store = history.create();
store.complete(dc);
store.complete(tran);
assert.strictEqual(store.records.dc.result.ic, 0.001);
assert.strictEqual(store.records.tran.result.time_s.length, 2);
store.fail('tran', 'Engine unavailable');
assert.strictEqual(store.records.dc.result.ic, 0.001);
assert.strictEqual(store.records.tran.result, undefined);
assert.strictEqual(store.records.tran.error, 'Engine unavailable');
assert.strictEqual(history.isCurrent(dc, {...common, re:'   '}), false);
store.start('dc');
assert.strictEqual(store.pending.has('dc'), true);
store.complete(dc);
assert.strictEqual(store.pending.has('dc'), false);
store.start('tran');
store.fail('tran', 'Failed');
assert.strictEqual(store.pending.has('tran'), false);
