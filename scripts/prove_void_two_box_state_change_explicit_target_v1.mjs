#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_TWO_BOX_STATE_CHANGE_EXPLICIT_TARGET_V1";
const scripts = [
  {
    path: "ops/two-box-void-send-execution-proof.sh",
    required: ["ALIEN", "REMOTE_NODE_BASE", "REMOTE_RELAYER_BASE"],
  },
  {
    path: "ops/two-box-wc-send-execution-proof.sh",
    required: ["ALIEN", "REMOTE_NODE_BASE", "REMOTE_HELPER_BASE"],
  },
  {
    path: "ops/two-box-wc-trade-execution-proof.sh",
    required: ["ALIEN", "REMOTE_NODE_BASE", "REMOTE_HELPER_BASE", "REMOTE_RELAYER_BASE"],
  },
  {
    path: "ops/two-box-mainnet0-state-change-proof.sh",
    required: ["ALIEN"],
  },
  {
    path: "ops/two-box-mainnet0-state-change-proof.v2.sh",
    required: ["ALIEN", "REMOTE_HTTP"],
  },
  {
    path: "ops/two-box-post-ui-trade-gate.sh",
    required: ["ALIEN", "REMOTE_NODE_BASE", "REMOTE_BASE", "REMOTE_HELPER_BASE", "REMOTE_RELAYER_BASE"],
  },
  {
    path: "ops/mainnet0-launch-readiness.sh",
    required: ["ALIEN", "REMOTE_HTTP"],
  },
];

const explicitExamples = {
  ALIEN: "operator@203.0.113.10",
  REMOTE_NODE_BASE: "http://203.0.113.10:4100",
  REMOTE_BASE: "http://203.0.113.10:4100",
  REMOTE_HELPER_BASE: "http://203.0.113.10:4312/workcredits/devnet",
  REMOTE_RELAYER_BASE: "http://203.0.113.10:4313/api/wc-relayer/v1",
  REMOTE_HTTP: "http://203.0.113.10:4100",
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
  assert.equal(text.includes("peer=http://100.122.79.39:4100"), false, `${spec.path}: retired follower peer remains`);

  for (const name of spec.required) {
    assert.ok(
      text.includes(`require_explicit "${name}" "\${${name}:-}"`),
      `${spec.path}: explicit requirement missing for ${name}`,
    );
  }

  const guardPos = text.indexOf(`MARKER="${MARKER}"`);
  const sideEffectTokens = [
    "mkdir -p",
    "systemctl --user restart",
    "curl -fsS",
    "ssh ",
    "jpost_json ",
    "remote_rpc eth_sendTransaction",
  ];
  const firstSideEffect = Math.min(
    ...sideEffectTokens
      .map((token) => text.indexOf(token))
      .filter((index) => index >= 0),
  );
  assert.ok(
    Number.isFinite(firstSideEffect) && guardPos >= 0 && guardPos < firstSideEffect,
    `${spec.path}: guard does not precede first side-effect token`,
  );

  const missing = run(spec.path, {
    PATH: process.env.PATH || "/usr/bin:/bin",
  });
  assert.equal(missing.status, 2, `${spec.path}: missing-target exit=${missing.status} stderr=${missing.stderr}`);
  assert.match(
    missing.stderr,
    new RegExp(`${MARKER} HOLD: missing explicit`),
    `${spec.path}: missing-target marker absent`,
  );

  const retiredEnv = {
    PATH: process.env.PATH || "/usr/bin:/bin",
  };
  for (const name of spec.required) retiredEnv[name] = explicitExamples[name];
  retiredEnv[spec.required[0]] = "zoso@100.122.79.39";

  const retired = run(spec.path, retiredEnv);
  assert.equal(retired.status, 2, `${spec.path}: retired-target exit=${retired.status} stderr=${retired.stderr}`);
  assert.match(
    retired.stderr,
    new RegExp(`${MARKER} HOLD: retired Alienware target is forbidden`),
    `${spec.path}: retired-target marker absent`,
  );
}

const v2 = fs.readFileSync("ops/two-box-mainnet0-state-change-proof.v2.sh", "utf8");
assert.ok(
  v2.includes('follower/status?peer=$REMOTE_HTTP'),
  "state-change v2 follower proof is not bound to explicit REMOTE_HTTP",
);

const productGate = fs.readFileSync("ops/two-box-post-ui-trade-gate.sh", "utf8");
assert.ok(
  productGate.includes("export ALIEN REMOTE_NODE_BASE REMOTE_BASE REMOTE_HELPER_BASE REMOTE_RELAYER_BASE"),
  "product gate does not export explicit targets to child proofs",
);

const launch = fs.readFileSync("ops/mainnet0-launch-readiness.sh", "utf8");
assert.ok(
  launch.includes("export ALIEN REMOTE_HTTP"),
  "launch readiness does not export explicit targets to state-change proof",
);

console.log(`${MARKER}_PROOF_GREEN`);
console.log("script_count=7");
console.log("missing_target_fails_before_side_effect=true");
console.log("retired_alienware_target_rejected=true");
console.log("explicit_target_inheritance=true");
console.log("state_change_execution_performed=false");
