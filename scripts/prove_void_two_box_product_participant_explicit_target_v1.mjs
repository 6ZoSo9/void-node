#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_TWO_BOX_PRODUCT_PARTICIPANT_EXPLICIT_TARGET_V1";
const scripts = [
  {
    "path": "ops/two-box-wc-state-parity-proof.sh",
    "required": [
      "ALIEN"
    ]
  },
  {
    "path": "ops/two-box-wc-trade-runtime-proof.sh",
    "required": [
      "ALIEN"
    ]
  },
  {
    "path": "ops/two-box-product-ui-smoke.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE",
      "REMOTE_HELPER_BASE",
      "REMOTE_RELAYER_BASE"
    ]
  },
  {
    "path": "ops/two-box-redundancy-check-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_BASE"
    ]
  },
  {
    "path": "ops/two-box-remote-product-network-regression-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE",
      "REMOTE_HELPER_BASE",
      "REMOTE_RELAYER_BASE"
    ]
  },
  {
    "path": "ops/two-box-golden-product-smoke.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE"
    ]
  },
  {
    "path": "ops/two-box-remote-consume-view-product-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE"
    ]
  },
  {
    "path": "ops/two-box-peer-workload-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE",
      "REMOTE_HELPER_BASE",
      "REMOTE_RELAYER_BASE"
    ]
  },
  {
    "path": "ops/two-box-remote-consumer-fetch-product-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE"
    ]
  },
  {
    "path": "ops/two-box-participant-datanet-e2e-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE"
    ]
  },
  {
    "path": "ops/two-box-participant-overview-dataset-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE"
    ]
  },
  {
    "path": "ops/two-box-remote-participant-consume-view-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE"
    ]
  },
  {
    "path": "ops/two-box-participant-golden-path-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE",
      "REMOTE_HELPER_BASE",
      "REMOTE_RELAYER_BASE"
    ]
  },
  {
    "path": "ops/two-box-remote-participant-open-by-id-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE"
    ]
  },
  {
    "path": "ops/two-box-cross-machine-datanet-lifecycle-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE"
    ]
  },
  {
    "path": "ops/two-box-cross-machine-participant-open-workflow-proof.sh",
    "required": [
      "ALIEN",
      "LOCAL_NODE_BASE",
      "PUBLIC_LOCAL_NODE_BASE",
      "REMOTE_NODE_BASE"
    ]
  },
  {
    "path": "ops/mainnet0/datanet-demo-import-share-url-two-box-proof.sh",
    "required": [
      "ALIEN",
      "PRECISION_TAILNET"
    ]
  },
  {
    "path": "ops/two-box-remote-verify-redundancy-product-proof.sh",
    "required": [
      "ALIEN",
      "REMOTE_NODE_BASE"
    ]
  }
];

const explicit = {
  ALIEN: "operator@203.0.113.10",
  REMOTE_NODE_BASE: "http://203.0.113.10:4102",
  REMOTE_HELPER_BASE: "http://203.0.113.10:4312/workcredits/devnet",
  REMOTE_RELAYER_BASE: "http://203.0.113.10:4313/api/wc-relayer/v1",
  REMOTE_BASE: "http://203.0.113.10:4102",
  LOCAL_NODE_BASE: "http://127.0.0.1:4100",
  PUBLIC_LOCAL_NODE_BASE: "http://203.0.113.11:4100",
  PRECISION_TAILNET: "http://203.0.113.11:4100",
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
  assert.equal(text.includes("http://100.122.79.39:4100"), false, `${spec.path}: raw retired HTTP origin remains`);

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

const golden = fs.readFileSync("ops/two-box-participant-golden-path-proof.sh", "utf8");
assert.ok(golden.includes('-X POST "$REMOTE_NODE_BASE/jobs/submit"'));
assert.equal(golden.includes("-X POST http://100.122.79.39:4100/jobs/submit"), false);

const goldenSmoke = fs.readFileSync("ops/two-box-golden-product-smoke.sh", "utf8");
assert.ok(goldenSmoke.includes('REMOTE_BASE="${REMOTE_BASE:-$REMOTE_NODE_BASE}"'));
assert.ok(goldenSmoke.includes("export ALIEN REMOTE_NODE_BASE REMOTE_BASE"));
assert.ok(goldenSmoke.includes('curl -fsS --max-time 8 "$REMOTE_NODE_BASE/health"'));

const regression = fs.readFileSync("ops/two-box-remote-product-network-regression-proof.sh", "utf8");
assert.ok(
  regression.includes('REMOTE_HELPER_BASE="$REMOTE_HELPER_BASE" REMOTE_RELAYER_BASE="$REMOTE_RELAYER_BASE" bash ops/two-box-participant-golden-path-proof.sh'),
);

const redundancy = fs.readFileSync("ops/two-box-remote-verify-redundancy-product-proof.sh", "utf8");
assert.equal(redundancy.includes("http://100.122.79.39:4100"), false);
for (const route of [
  "$REMOTE_NODE_BASE/jobs/submit",
  "$REMOTE_NODE_BASE/wc/runner/config",
  "$REMOTE_NODE_BASE/wc/runner/set",
  "$REMOTE_NODE_BASE/wc/runner/status?account=$ACCOUNT",
  "$REMOTE_NODE_BASE/wc/runner/tick",
]) {
  assert.ok(redundancy.includes(route), `redundancy proof missing explicit route ${route}`);
}

const demo = fs.readFileSync("ops/mainnet0/datanet-demo-import-share-url-two-box-proof.sh", "utf8");
assert.ok(demo.indexOf('guard_targets "$ALIEN" "$PRECISION_TAILNET"') < demo.indexOf('cd "$ROOT"'));

console.log(`${MARKER}_PROOF_GREEN`);
console.log(`script_count=${scripts.length}`);
console.log("missing_target_fails_closed=true");
console.log("retired_alienware_target_rejected=true");
console.log("participant_submit_bound_to_explicit_remote_origin=true");
console.log("parent_child_target_propagation=true");
console.log("network_or_mutation_execution_performed=false");
