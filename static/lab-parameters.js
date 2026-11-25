/* UI-unit limits mirror the unchanged engine. Contract tests pin every SI bound. */
(function(root,factory) {
  if(typeof module==='object' && module.exports) module.exports=factory(require('./run-history.js').decimalNumber);
  else root.LabParameters=factory(root.RunHistory.decimalNumber);
})(typeof globalThis==='undefined'?this:globalThis,function(decimalNumber) {
  const resistor={min:1,max:1e9,factor:1000,unit:'kΩ'};
  const capacitor={min:1e-12,max:1,factor:1e-6,unit:'µF'};
  const rules={vcc:{min:.01,max:100,factor:1,unit:'V'},
    r1:{...resistor},r2:{...resistor},rc:{...resistor},re:{...resistor},rl:{...resistor},
    cin:{...capacitor},cout:{...capacitor},
    amplitude:{min:1e-9,max:100,factor:.001,unit:'mV peak'},
    frequency:{min:1,max:1e6,factor:1,unit:'Hz'}};
  function validate(inputs) {
    const errors={};
    Object.entries(rules).forEach(([key,rule])=>{
      const number=decimalNumber(inputs[key]);
      const converted=number*rule.factor;
      if(!Number.isFinite(converted) || converted<rule.min || converted>rule.max)
        errors[key]=key+': enter '+rule.min/rule.factor+'–'+rule.max/rule.factor+' '+rule.unit+'.';
    });
    return {valid:Object.keys(errors).length===0,errors};
  }
  return {rules,validate};
});
