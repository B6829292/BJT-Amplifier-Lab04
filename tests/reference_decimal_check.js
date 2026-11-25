const assert = require('assert');
const {decimalNumber} = require('../static/run-history.js');
assert.strictEqual(typeof decimalNumber, 'function');
for (const [text, expected] of [['1_0',10],['+1_0.0',10],['1e2',100],[' 100 ',100]]) {
  assert.strictEqual(decimalNumber(text),expected);
}
for (const text of ['0x64','0b10','1__0','nan','']) assert.ok(Number.isNaN(decimalNumber(text)));
