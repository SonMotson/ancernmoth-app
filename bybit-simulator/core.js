// Pure, deterministic research primitives shared by browser simulator and Node tests.
export function ema(values, period) {
  if (!Number.isInteger(period) || period < 1) throw new RangeError('period must be a positive integer');
  const out = Array(values.length).fill(null), alpha = 2 / (period + 1);
  let state = null;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!Number.isFinite(value)) continue;
    state = state === null ? value : value * alpha + state * (1 - alpha);
    out[i] = state;
  }
  return out;
}
export function sma(values, period) {
  if (!Number.isInteger(period) || period < 1) throw new RangeError('period must be a positive integer');
  return values.map((_, i) => i + 1 < period ? null : values.slice(i-period+1,i+1).reduce((a,b)=>a+b,0)/period);
}
export function rsi(values, period=14) {
  const out=Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain=0,loss=0;
  for(let i=1;i<=period;i++){const d=values[i]-values[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0);}
  let ag=gain/period,al=loss/period;
  out[period]=al===0?100:100-100/(1+ag/al);
  for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];ag=(ag*(period-1)+Math.max(d,0))/period;al=(al*(period-1)+Math.max(-d,0))/period;out[i]=al===0?100:100-100/(1+ag/al);}
  return out;
}
export function atr(candles, period=14) {
  const tr=candles.map((x,i)=>i===0?x.h-x.l:Math.max(x.h-x.l,Math.abs(x.h-candles[i-1].c),Math.abs(x.l-candles[i-1].c)));
  return sma(tr,period);
}
export function sizePosition({equity,riskPct,entry,stop,feeRate=0,slippage=0,qtyStep,minQty=0,minNotional=0}) {
  const distance=entry-stop;
  if (![equity,riskPct,entry,stop,feeRate,slippage,qtyStep].every(Number.isFinite) || distance<=0 || qtyStep<=0) throw new RangeError('invalid sizing inputs');
  const riskCash=equity*riskPct/100;
  const unitRisk=distance+2*slippage+feeRate*(entry+stop);
  const qty=Math.floor((riskCash/unitRisk)/qtyStep+1e-10)*qtyStep;
  const notional=qty*entry;
  const actualStopRisk=qty*unitRisk;
  const accepted=qty>=minQty && notional>=minNotional && actualStopRisk<=riskCash+1e-9;
  return {qty:accepted?qty:0,notional:accepted?notional:0,riskCash,unitRisk,actualStopRisk:accepted?actualStopRisk:0,accepted,reason:accepted?null:(qty<minQty?'min_qty':notional<minNotional?'min_notional':'risk_limit')};
}
export function resolveBarExit(bar, position) {
  const stopHit=bar.l<=position.stop, targetHit=bar.h>=position.target;
  if(!stopHit&&!targetHit)return null;
  return stopHit?{price:bar.o<position.stop?bar.o:position.stop,reason:targetHit?'stop_first_collision':'stop'}:{price:position.target,reason:'target'};
}
export function dailyRiskState({day,previousDay,equity,dayStart,realizedLoss,lossStreak,locked}) {
  if(day!==previousDay)return {day,dayStart:equity,realizedLoss:0,lossStreak:0,locked:false};
  return {...arguments[0],locked:locked||realizedLoss>=dayStart*.01||lossStreak>=2};
}
export function splitChronologically(rows, trainFraction=.7) {
  if(!Number.isFinite(trainFraction)||trainFraction<=0||trainFraction>=1)throw new RangeError('trainFraction must be between 0 and 1');
  const cut=Math.floor(rows.length*trainFraction);
  return {train:rows.slice(0,cut),test:rows.slice(cut)};
}
export function validateCandles(rows, intervalMs=null) {
  const issues=[];
  for(let i=0;i<rows.length;i++){
    const x=rows[i];
    if(![x.t,x.o,x.h,x.l,x.c,x.v].every(Number.isFinite))issues.push({index:i,issue:'non_finite'});
    if(x.h<x.l||x.h<Math.max(x.o,x.c)||x.l>Math.min(x.o,x.c))issues.push({index:i,issue:'invalid_ohlc'});
    if(x.v<0)issues.push({index:i,issue:'negative_volume'});
    if(i&&x.t<=rows[i-1].t)issues.push({index:i,issue:'non_increasing_timestamp'});
    if(i&&intervalMs&&x.t-rows[i-1].t!==intervalMs)issues.push({index:i,issue:'candle_gap_or_duplicate'});
  }
  return issues;
}
