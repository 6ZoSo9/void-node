#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_TWO_BOX_DATANET_MATERIALIZE_EXPLICIT_TARGET_V1";
const scripts = [
  "ops/two-box-datanet-provenance-diff.sh",
  "ops/two-box-datanet-materialize-from-peer.sh",
  "ops/two-box-datanet-materialize-proof.sh",
];

function run(path, env) {
  return spawnSync("bash", [path], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    timeout: 5000,
  });
}

for (const path of scripts) {
  const text = fs.readFileSync(path, "utf8");

  assert.ok(text.includes(`MARKER="${MARKER}"`), `${path}: marker missing`);
  assert.equal(text.includes(":-zoso@100.122.79.39"), false, `${path}: retired SSH default remains`);
  assert.equal(text.includes(":-http://100.122.79.39"), false, `${path}: retired HTTP default remains`);
  assert.ok(text.includes('HOLD: missing explicit ALIEN'), `${path}: ALIEN wall missing`);
  assert.ok(text.includes('HOLD: missing explicit REMOTE_BASE'), `${path}: REMOTE_BASE wall missing`);
  assert.ok(text.includes('HOLD: retired Alienware target is forbidden'), `${path}: retired wall missing`);
  assert.ok(text.includes("export ALIEN REMOTE_BASE"), `${path}: target export missing`);

  const guardPos = text.indexOf(`MARKER="${MARKER}"`);
  const sideEffectPositions = ["mkdir -p", "ssh ", "curl -fsS"]
    .map((token) => text.indexOf(token))
    .filter((index) => index >= 0);
  assert.ok(sideEffectPositions.length > 0, `${path}: no observable side-effect token found`);
  assert.ok(
    guardPos >= 0 && guardPos < Math.min(...sideEffectPositions),
    `${path}: target guard must precede output/network activity`,
  );

  const missing = run(path, {
    PATH: process.env.PATH || "/usr/bin:/bin",
  });
  assert.equal(missing.status, 2, `${path}: missing-target exit=${missing.status} stderr=${missing.stderr}`);
  assert.match(missing.stderr, new RegExp(`${MARKER} HOLD: missing explicit ALIEN`));

  const retired = run(path, {
    PATH: process.env.PATH || "/usr/bin:/bin",
    ALIEN: "zoso@100.122.79.39",
    REMOTE_BASE: "http://203.0.113.10:4100",
  });
  assert.equal(retired.status, 2, `${path}: retired-target exit=${retired.status} stderr=${retired.stderr}`);
  assert.match(retired.stderr, new RegExp(`${MARKER} HOLD: retired Alienware target is forbidden`));
}

const proofText = fs.readFileSync("ops/two-box-datanet-materialize-proof.sh", "utf8");
assert.equal(
  (proofText.match(/ALIEN="\$ALIEN".*REMOTE_BASE="\$REMOTE_BASE".*two-box-datanet-provenance-diff\.sh/g) || []).length,
  2,
  "materialize proof must forward explicit target pair to both provenance comparisons",
);
assert.equal(
  (proofText.match(/ALIEN="\$ALIEN".*REMOTE_BASE="\$REMOTE_BASE".*APPLY=1.*two-box-datanet-materialize-from-peer\.sh/g) || []).length,
  1,
  "materialize proof must forward explicit target pair to apply child",
);

const fromPeer = fs.readFileSync("ops/two-box-datanet-materialize-from-peer.sh", "utf8");
assert.ok(fromPeer.includes('if [ "$APPLY" != "1" ]'), "materialize-from-peer dry-run gate disappeared");
assert.ok(fromPeer.includes("[dry-run] pass --apply to materialize selected datasets"));

console.log(`${MARKER}_PROOF_GREEN`);
console.log("script_count=3");
console.log("explicit_alien_required=true");
console.log("explicit_remote_base_required=true");
console.log("retired_alienware_target_rejected=true");
console.log("explicit_target_propagation=true");
console.log("live_materialization_performed=false");
