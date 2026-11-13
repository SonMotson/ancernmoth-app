import test from "node:test";
import assert from "node:assert/strict";
import {ALLOWED,makeSignature} from "../src/index.js";

test("read-only allowlist contains only documented GET resources",()=>{
  assert.equal(ALLOWED.has("/business/channels"),true);
  assert.equal(ALLOWED.has("/business/sends/"),true);
  assert.equal(ALLOWED.has("/business/receives/"),true);
  assert.equal(ALLOWED.has("/business/settlements"),false);
  assert.equal(ALLOWED.has("/business/refunds"),false);
});
test("signature generation is deterministic",async()=>{
  const a=await makeSignature("secret","2026-11-13T10:00:00.000Z","/business/channels");
  const b=await makeSignature("secret","2026-11-13T10:00:00.000Z","/business/channels");
  assert.equal(a,b);
  assert.equal(typeof a,"string");
});
test("non-GET signing is blocked",async()=>{
  await assert.rejects(()=>makeSignature("secret","2026-11-13T10:00:00.000Z","/business/sends","POST"),/READ_ONLY_BLOCK/);
});
