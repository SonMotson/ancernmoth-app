import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ema, sma, rsi, atr, sizePosition, resolveBarExit, dailyRiskState, splitChronologically, validateCandles } from '../bybit-simulator/core.js';

const html = readFileSync(new URL('../bybit-simulator/index.html', import.meta.url), 'utf8');
const script = html.split('<script type="module">')[1]?.split('</script>')[0] ?? '';

test('1. Indicator calculations match hand-verified reference values', () => {
  const e=ema([10,20,30],2); assert.equal(e[0],10); assert.ok(Math.abs(e[1]-16.6666666667)<1e-9); assert.ok(Math.abs(e[2]-25.5555555556)<1e-9);
  assert.deepEqual(sma([1,2,3,4], 3), [null,null,2,3]);
  assert.equal(rsi(Array.from({length:15},(_,i)=>i+1),14)[14],100);
  assert.deepEqual(atr([{h:11,l:9,c:10},{h:13,l:10,c:12},{h:14,l:11,c:13}],2),[null,2.5,3]);
});

test('2. Position sizing includes stop distance, both-side fees and slippage', () => {
  const x=sizePosition({equity:1000,riskPct:.5,entry:100,stop:95,feeRate:.001,slippage:.1,qtyStep:.001,minQty:.001,minNotional:5});
  assert.equal(x.accepted,true);
  assert.equal(x.qty,.926);
  assert.ok(x.actualStopRisk<=5);
  assert.ok(x.actualStopRisk>4.9);
  const min=sizePosition({equity:50,riskPct:.5,entry:100,stop:95,feeRate:.001,slippage:.1,qtyStep:.001,minQty:.001,minNotional:5});
  assert.equal(min.accepted,false);
  assert.equal(min.reason,'min_notional');
});

test('3. Daily loss and consecutive-loss locks trigger at configured thresholds', () => {
  const fresh=dailyRiskState({day:'2026-11-13',previousDay:'2026-11-12',equity:1000,dayStart:900,realizedLoss:90,lossStreak:2,locked:true});
  assert.deepEqual(fresh,{day:'2026-11-13',dayStart:1000,realizedLoss:0,lossStreak:0,locked:false});
  const daily=dailyRiskState({day:'same',previousDay:'same',equity:900,dayStart:1000,realizedLoss:10,lossStreak:0,locked:false});
  assert.equal(daily.locked,true);
  const streak=dailyRiskState({day:'same',previousDay:'same',equity:990,dayStart:1000,realizedLoss:5,lossStreak:2,locked:false});
  assert.equal(streak.locked,true);
});

test('4. Stop/target collisions are stop-first and gap-through stops fill at worse open', () => {
  const p={stop:95,target:110};
  assert.deepEqual(resolveBarExit({o:100,h:112,l:94},p),{price:95,reason:'stop_first_collision'});
  assert.deepEqual(resolveBarExit({o:90,h:100,l:88},p),{price:90,reason:'stop'});
  assert.deepEqual(resolveBarExit({o:111,h:114,l:101},p),{price:110,reason:'target'});
  assert.equal(resolveBarExit({o:100,h:109,l:96},p),null);
});

test('5. Historical candle integrity and chronological out-of-sample split', () => {
  const valid=[
    {t:0,o:10,h:12,l:9,c:11,v:4},
    {t:900000,o:11,h:13,l:10,c:12,v:5},
    {t:1800000,o:12,h:14,l:11,c:13,v:6}
  ];
  assert.deepEqual(validateCandles(valid,900000),[]);
  assert.equal(validateCandles([valid[0],{...valid[1],t:1800000}],900000)[0].issue,'candle_gap_or_duplicate');
  assert.ok(validateCandles([{...valid[0],h:8}],900000).some(x=>x.issue==='invalid_ohlc'));
  const rows=Array.from({length:10},(_,i)=>({t:i}));
  const split=splitChronologically(rows,.7);
  assert.deepEqual(split.train.map(x=>x.t),[0,1,2,3,4,5,6]);
  assert.deepEqual(split.test.map(x=>x.t),[7,8,9]);
  assert.ok(split.train.at(-1).t<split.test[0].t);
});

test('browser simulator parses and consumes the shared tested primitives', () => {
  assert.ok(script.length>1000);
  assert.doesNotThrow(()=>new Function(script));
  for(const name of ['ema','sma','rsi','atr','sizePosition','resolveBarExit','validateCandles']) assert.match(script,new RegExp('\\b'+name+'\\b'));
});

test('simulator uses public market-data endpoints only', () => {
  assert.match(html,/api\\.bybit\\.com/);
  assert.ok(html.includes('v5/market/kline'));
  assert.ok(html.includes('v5/market/tickers'));
  assert.ok(html.includes('v5/market/instruments-info'));
  assert.doesNotMatch(script,/v5\\/(?:order|position|account|asset|withdraw|transfer)/i);
  assert.doesNotMatch(script,/apiKey|apiSecret|X-BAPI-API-KEY|Authorization/i);
});

// CI rerun trigger: endpoint assertions use literal path checks.
