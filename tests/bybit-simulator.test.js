import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../bybit-simulator/index.html', import.meta.url), 'utf8');
const script = html.split('<script>')[1]?.split('</script>')[0] ?? '';

test('inline browser JavaScript parses', () => {
  assert.ok(script.length > 1000, 'expected simulator script');
  assert.doesNotThrow(() => new Function(script));
});

test('simulator uses public market-data endpoints only', () => {
  assert.match(html, /api\.bybit\.com/);
  assert.match(html, /v5\/market\/kline/);
  assert.match(html, /v5\/market\/tickers/);
  assert.match(html, /v5\/market\/instruments-info/);
  assert.doesNotMatch(script, /v5\/(?:order|position|account|asset|withdraw|transfer)/i);
  assert.doesNotMatch(script, /apiKey|apiSecret|X-BAPI-API-KEY|Authorization/i);
});

test('risk and execution safety controls are present', () => {
  assert.match(html, /value="50"/);
  assert.match(html, /value="0.5"/);
  assert.match(script, /Math\.min\(\.5/);
  assert.match(script, /dayLoss>=dayStart\*\.01/);
  assert.match(script, /lossStreak>=2/);
  assert.match(script, /minNotional/);
  assert.match(script, /stopHit\?position\.stop:position\.target/);
  assert.match(html, /SIMULATION ONLY/);
  assert.match(html, /no order execution/i);
});

test('all four research variants are wired into comparison', () => {
  for (const v of ['A','B','C','D']) assert.match(script, new RegExp("'" + v + "'"));
  assert.match(script, /map\(v=>runBacktest/);
});

test('Gaborone daily reset uses UTC+2 offset', () => {
  assert.match(script, /ts\+2\*3600000/);
});
