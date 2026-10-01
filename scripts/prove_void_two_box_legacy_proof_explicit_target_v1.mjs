#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_TWO_BOX_LEGACY_PROOF_EXPLICIT_TARGET_V1";
const scripts = [
  { path: "ops/two-box-remote-product-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE", "REMOTE_HELPER_BASE", "REMOTE_RELAYER_BASE"] },
  { path: "ops/two-box-remote-participant-js-parse-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-remote-participant-copy-actions-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-datanet-tab-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-datanet-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-datanet-canonical-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-bidirectional-open-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-datanet-workloop-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-receipt-result-fetch-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-reverse-bidirectional-open-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-datanet-peer-path-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-full-useful-work-loop-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-ui-share-open-both-ways-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-remote-verify-redundancy-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-ui-share-open-both-ways-no-seed-proof.sh", required: ["ALIEN", "REMOTE_NODE_BASE"] },
  { path: "ops/two-box-peer-proof-suite.sh", required: ["ALIEN", "REMOTE_BASE"] },
];

const explicit = {
  ALIEN: "operator@203.0.113.10",
  REMOTE_NODE_BASE: "http://203.0.113.10:4102",
  REMOTE_HELPER_BASE: "http://203.0.113.10:4312/workcredits/devnet",
  REMOTE_RELAYER_BASE: "http://203.0.113.10:4313",
  REMOTE_BASE: "http://203.0.113.10:4102",
};

function run(path, env) {
  return spawnSync("bash", [path], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    timeout: 5000,
  });
}

for (const spec of scripts) {
  const text = fs.readFileSync(spec.path, "utf8");

  assert.ok(text.includes(`MARKER="${MARKER}"`), `${spec.path}: marker missing`);
  assert.equal(text.includes(":-zoso@100.122.79.39"), false, `${spec.path}: retired SSH default remains`);
  assert.equal(text.includes(":-http://100.122.79.39"), false, `${spec.path}: retired HTTP default remains`);

  for (const name of spec.required) {
    assert.ok(
      text.includes(`require_explicit "${name}" "\${${name}:-}"`),
      `${spec.path}: explicit requirement missing for ${name}`,
    );
  }

  const guardCall = text.indexOf("guard_targets ");
  const sideEffects = [
    "curl ",
    "ssh ",
    "mkdir -p",
    "jpost_json ",
    "-X POST",
    "systemctl ",
  ].map((token) => text.indexOf(token)).filter((index) => index >= 0);
  const firstSideEffect = sideEffects.length ? Math.min(...sideEffects) : Number.POSITIVE_INFINITY;
  assert.ok(guardCall >= 0 && guardCall < firstSideEffect, `${spec.path}: target guard does not precede side effects`);

  const missing = run(spec.path, {
    PATH: process.env.PATH || "/usr/bin:/bin",
    HOME: process.env.HOME || "/tmp",
  });
  assert.equal(missing.status, 2, `${spec.path}: missing-target exit=${missing.status} stderr=${missing.stderr}`);
  assert.match(missing.stderr, new RegExp(`${MARKER} HOLD: missing explicit`));

  const retiredEnv = {
    PATH: process.env.PATH || "/usr/bin:/bin",
    HOME: process.env.HOME || "/tmp",
  };
  for (const name of spec.required) retiredEnv[name] = explicit[name];
  retiredEnv.ALIEN = "zoso@100.122.79.39";

  const retired = run(spec.path, retiredEnv);
  assert.equal(retired.status, 2, `${spec.path}: retired-target exit=${retired.status} stderr=${retired.stderr}`);
  assert.match(retired.stderr, new RegExp(`${MARKER} HOLD: retired Alienware target is forbidden`));
}

const suite = fs.readFileSync("ops/two-box-peer-proof-suite.sh", "utf8");
assert.ok(suite.includes('require_explicit "REMOTE_BASE" "${REMOTE_BASE:-}"'));
assert.ok(suite.includes('if [ -n "${REMOTE_BASE:-}" ]; then'));

console.log(`${MARKER}_PROOF_GREEN`);
console.log(`script_count=${scripts.length}`);
console.log("missing_target_fails_closed=true");
console.log("retired_alienware_target_rejected=true");
console.log("explicit_remote_http_required=true");
console.log("network_or_mutation_execution_performed=false");
