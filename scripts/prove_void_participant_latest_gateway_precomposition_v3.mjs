#!/usr/bin/env node
// Independent latest-parent source isolation on an old unmerged participant
// draft checkout. No source merge, route mounting or credential access.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import {
  VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_BLOBS_V2,
} from "../tools/void-public-participant-production-composition-current-gateway-v2.mjs";

const ORIGINAL_PARENT = "4418617018aeb94a3f065ca3d791aa010f2bcff6";
const CURRENT_PARENT = "d49126c39e298313b1151f1cbd3b4068339c0aaa";
const ORIGINAL_GATEWAY_BLOB = "d7174ee47ce2438fcc88764a76e08e7cc7f46787";
const CURRENT_GATEWAY_BLOB = "b718c5eccedc8d1ac08d1bd8f2281304ca49e152";
const V2_TOOL_BLOB = "1acd2ab1d46e06dc0b19059c5e8686a9856ca428";
const V2_PROOF_BLOB = "e9e5ab8419534dffafcee195e7b6ab663711108f";
const FROZEN_V1_BLOB = "507ee9a1c9b553a86944b2e5287f220c6af73044";
const gateway = "ops/public/void-public-app-composition-gateway-v1.mjs";
const v2Tool = "tools/void-public-participant-production-composition-current-gateway-v2.mjs";
const v2Proof = "scripts/prove_void_public_participant_production_composition_current_gateway_v2.mjs";
const frozen = "tools/void-public-participant-production-composition-preflight-v1.mjs";
const maximumOutput = 16 * 1024 * 1024;
function executeGit(args) {
  return execFileSync("/usr/bin/git", args, {
    encoding: "utf8", timeout: 60_000, maxBuffer: maximumOutput,
    env: {
      PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C",
      GIT_CONFIG_NOSYSTEM: "1", GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0",
      GIT_CONFIG_GLOBAL: "/dev/null", GIT_ATTR_NOSYSTEM: "1",
      HOME: "/nonexistent",
    },
  });
}
function blob(bytes) {
  return crypto.createHash("sha1").update(
    Buffer.from("blob " + bytes.length + "\0"),
  ).update(bytes).digest("hex");
}
for (const [name,expected] of [
  [v2Tool,V2_TOOL_BLOB],[v2Proof,V2_PROOF_BLOB],[frozen,FROZEN_V1_BLOB],
]) {
  assert.equal(blob(fs.readFileSync(name)),expected,
    "frozen participant source/proof mutated: " + name);
}
const localGateway = fs.readFileSync(gateway);
assert.equal(blob(localGateway),ORIGINAL_GATEWAY_BLOB,
  "unmerged child checkout source must remain its historical generation");
function checkedGateway(commit,expected) {
  const contents=Buffer.from(executeGit(["show",commit+":"+gateway]),"utf8");
  assert.equal(blob(contents),expected,"unexpected parent gateway generation");
  return contents.toString("utf8");
}
const old=checkedGateway(ORIGINAL_PARENT,ORIGINAL_GATEWAY_BLOB);
const current=checkedGateway(CURRENT_PARENT,CURRENT_GATEWAY_BLOB);
const start="// VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1";
const end="const HOST = process.env.VOID_COMPOSITION_HOST";
function splitCheckout(s) {
  const i=s.indexOf(start),j=s.indexOf(end,i);
  assert.ok(i>0&&j>i,"bounded public POST function missing");
  assert.equal(s.slice(0,i).indexOf(start),-1,"duplicate checkout start");
  return {outside:s.slice(0,i)+s.slice(j),checkout:s.slice(i,j)};
}
const prior=splitCheckout(old),next=splitCheckout(current);
assert.equal(prior.outside,next.outside,
  "public participant gateway code outside checkout POST changed");
assert.equal(prior.outside.length,88262,"unreviewed outside checkout growth");
assert.equal(prior.checkout.length,11014);
assert.equal(next.checkout.length,17911);
assert.ok(next.checkout.includes("UPLOAD_TIMEOUT_MS"),
  "latest parent lost absolute checkout upload lifetime");
assert.ok(next.checkout.includes("voidBuyVoidPublicEdgePostProxyV1"),
  "latest parent no longer has exact request route");

const sources=VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_BLOBS_V2;
const files=Object.entries(sources);
assert.equal(files.length,17,"reviewed source set changed");
assert.equal(sources[gateway],ORIGINAL_GATEWAY_BLOB);
for (const [file,expected] of files) {
  if (file===gateway) continue;
  const sha=executeGit(["rev-parse",CURRENT_PARENT+":"+file]).trim();
  assert.equal(sha,expected,"participant source changed: "+file);
}
const result=execFileSync(process.execPath,[v2Proof],{
  encoding:"utf8",timeout:90_000,maxBuffer:2*1024*1024,
  env:{...process.env,NODE_OPTIONS:""},
});
for (const marker of [
  "VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_PREFLIGHT_V2_PROOF_GREEN",
  "historical_v1_new_generation_negative_preserved=true",
  "source_composition_ready=true",
  "runtime_activation_authorized=false",
]) {
  assert.ok(result.split("\n").includes(marker),
    "V2 participant actual-session proof did not qualify: "+marker);
}
console.log("VOID_PARTICIPANT_LATEST_GATEWAY_PRECOMPOSITION_V3_GREEN");
console.log("old_and_latest_gateway_source_blobs_exact=true");
console.log("only_checkout_post_block_changed=true");
console.log("participant_outside_checkout_bytes_identical=true");
console.log("sixteen_non_gateway_security_source_blobs_unchanged=true");
console.log("historical_v2_actual_session_behavior_replayed=true");
console.log("frozen_v1_source_refusal_preserved=true");
console.log("unmerged_child_gateway_still_old=true");
console.log("host_or_service_activation_authorized=false");
console.log("key_wallet_paid_work_wc_funds_access=false");
