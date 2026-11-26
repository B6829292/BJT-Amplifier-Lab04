/* UI-unit limits mirror the engine. Contract tests pin every SI bound. */
(function(root,factory) {
  if(typeof module==='object' && module.exports) module.exports=factory(require('./run-history.js'));
  else root.LabParameters=factory(root.RunHistory);
})(typeof globalThis==='undefined'?this:globalThis,function({decimalNumber,sourceFactor,sourceUnitLabel,sourceUnits}) {
  const resistor={min:1,max:1e9,factor:1000,unit:'kΩ'};
  const capacitor={min:1e-12,max:1,factor:1e-6,unit:'µF'};
  const rules={vcc:{min:.01,max:100,factor:1,unit:'V'},
    r1:{...resistor},r2:{...resistor},rc:{...resistor},re:{...resistor},rl:{...resistor},
    cin:{...capacitor},cout:{...capacitor},ce:{...capacitor},
    amplitude:{min:1e-9,max:100,factor:.001,unit:'mV peak'},
    frequency:{min:1,max:1e6,factor:1,unit:'Hz'}};
  function validate(inputs) {
    const errors={};
    const bypass=inputs.emitter_bypass ?? 'off';
    if (!['off','on'].includes(bypass)) errors.emitter_bypass='Emitter bypass: choose Off or On.';
    Object.entries(rules).forEach(([key,rule])=>{
      if (key==='ce' && bypass!=='on') return;
      const number=decimalNumber(inputs[key]);
      const unit=inputs[key+'_unit'];
      const factor=key in sourceUnits ? sourceFactor(key,unit) : rule.factor;
      if(!Number.isFinite(factor)) {
        errors[key]=key+': choose a valid unit.';
        return;
      }
      const converted=number*factor;
      if(!Number.isFinite(converted) || converted<rule.min || converted>rule.max)
        errors[key]=(key==='ce'?'CE':key)+': enter '+rule.min/factor+'–'+rule.max/factor+' '+(key in sourceUnits?sourceUnitLabel(key,unit):rule.unit)+'.';
    });
    return {valid:Object.keys(errors).length===0,errors};
  }
  return {rules,validate};
});
