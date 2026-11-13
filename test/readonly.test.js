import test from "node:test";
import assert from "node:assert/strict";
import {ALLOWED,makeSignature,isDashboardAuthorized} from "../src/index.js";

test("read-only allowlist is restricted to documented GET resources",()=>{
  assert.equal(ALLOWED.has("/business/channels"),true);
  assert.equal(ALLOWED.has("/business/sends/"),true);
  assert.equal(ALLOWED.has("/business/receives/"),true);
  for (const path of ["/business/settlements","/business/refunds","/business/wallets","/business/orders"]) assert.equal(ALLOWED.has(path),false);
});
test("HMAC signing is deterministic",async()=>{
  const a=await makeSignature("secret","2026-11-13T10:00:00.000Z","/business/channels");
  const b=await makeSignature("secret","2026-11-13T10:00:00.000Z","/business/channels");
  assert.equal(a,b);
  assert.equal(typeof a,"string");
});
test("non-GET signing is blocked",async()=>{
  await assert.rejects(()=>makeSignature("secret","2026-11-13T10:00:00.000Z","/business/sends","POST"),/READ_ONLY_BLOCK/);
});
test("private Yellow Card routes require dashboard token",()=>{
  const env={DASHBOARD_TOKEN:"sample-token"};
  assert.equal(isDashboardAuthorized(new Request("https://app.test",{headers:{Authorization:"Bearer sample-token"}}),env),true);
  assert.equal(isDashboardAuthorized(new Request("https://app.test"),env),false);
  assert.equal(isDashboardAuthorized(new Request("https://app.test",{headers:{Authorization:"Bearer wrong"}}),env),false);
  assert.equal(isDashboardAuthorized(new Request("https://app.test",{headers:{Authorization:"Bearer sample-token"}}),{}),false);
});
