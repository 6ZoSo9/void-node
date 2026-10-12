#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fs from "node:fs";

const MARKER = "VOID_CANONICAL_PRODUCER_NO_EMPTY_OPERATOR_CONTRACT_V1_GREEN";
const workflowPath = ".github/workflows/mainnet0-canonical-producer-liveness-guard-v1.yml";
const noEmptyProofPath = "scripts/prove_canonical_producer_no_empty_autoprop_v1.mjs";
const runtimeProofPath = "ops/prove-main-runtime-autoprop.sh";
const goNoGoPath = "ops/mainnet0-go-no-go-with-runtime.sh";
const crossboxSmokePath = "ops/mainnet/mainnet0-crossbox-status-smoke.sh";
const makefilePath = "Makefile";
const selfPath = "scripts/prove_canonical_producer_no_empty_operator_contract_v1.mjs";

const workflow = fs.readFileSync(workflowPath, "utf8");
const noEmptyProof = fs.readFileSync(noEmptyProofPath, "utf8");
const runtimeProof = fs.readFileSync(runtimeProofPath, "utf8");
const goNoGo = fs.readFileSync(goNoGoPath, "utf8");
const crossboxSmoke = fs.readFileSync(crossboxSmokePath, "utf8");
const makefile = fs.readFileSync(makefilePath, "utf8");

function sectionPaths(section, nextToken) {
  const startToken = `  ${section}:\n`;
  const start = workflow.indexOf(startToken);
  assert.notEqual(start, -1, `workflow missing ${section} section`);
  const rest = workflow.slice(start + startToken.length);
  const end = rest.indexOf(nextToken);
  const block = end === -1 ? rest : rest.slice(0, end);
  const pathsIndex = block.indexOf("    paths:\n");
  assert.notEqual(pathsIndex, -1, `${section} missing paths allowlist`);
  const pathBlock = block.slice(pathsIndex + "    paths:\n".length);
  return [...pathBlock.matchAll(/^      - "([^"]+)"$/gm)].map((m) => m[1]);
}

const prPaths = sectionPaths("pull_request", "\n  push:\n");
const pushPaths = sectionPaths("push", "\npermissions:\n");

const directProofInputs = [
  ...noEmptyProof.matchAll(/fs\.readFileSync\("([^"]+)",\s*"utf8"\)/g),
].map((m) => m[1]);

assert.deepEqual(
  directProofInputs,
  [
    "src/index.ts",
    "src/node_core.ts",
    "ops/fix-main-runtime-autoprop.sh",
    "ops/install-user-units.sh",
    "scripts/boot.sh",
    ".env.example",
  ],
  "no-empty proof direct dependency set changed; update the closure contract deliberately",
);

const requiredTriggerInputs = [
  noEmptyProofPath,
  ...directProofInputs,
  runtimeProofPath,
  goNoGoPath,
  crossboxSmokePath,
  makefilePath,
  selfPath,
];

for (const file of requiredTriggerInputs) {
  assert.ok(prPaths.includes(file), `pull_request.paths missing direct contract input: ${file}`);
  assert.ok(pushPaths.includes(file), `push.paths missing direct contract input: ${file}`);
}

assert.equal(new Set(prPaths).size, prPaths.length, "pull_request.paths contains duplicates");
assert.equal(new Set(pushPaths).size, pushPaths.length, "push.paths contains duplicates");

assert.ok(runtimeProof.includes('MODE="${MODE:-idle}"'), "runtime proof must default to idle mode");
assert.ok(
  runtimeProof.includes('REAL_WORK_STIMULUS="${REAL_WORK_STIMULUS:-}"'),
  "work mode must require an explicitly supplied reviewed stimulus",
);
assert.ok(
  runtimeProof.includes('test "$H2" -eq "$H1"'),
  "idle mode must require stable canonical head",
);
assert.ok(
  runtimeProof.includes('test "$H2" -gt "$H1"'),
  "work mode must require canonical head advancement",
);
assert.ok(
  runtimeProof.includes('"$REAL_WORK_STIMULUS"'),
  "real-work stimulus must be executed as an explicit executable path, not an implicit automatic action",
);
assert.ok(
  !runtimeProof.includes("commit?empty=1"),
  "runtime operator proof must not restore automatic empty=1 authority",
);
assert.ok(
  goNoGo.includes("MODE=idle make prove-main-runtime-autoprop"),
  "official runtime go/no-go must use the healthy-idle contract by default",
);
assert.ok(
  !goNoGo.includes("MODE=work make prove-main-runtime-autoprop"),
  "official runtime go/no-go must not inject real work implicitly",
);

assert.ok(
  goNoGo.includes('CROSSBOX_PEER="${VOID_MAINNET0_CROSSBOX_PEER:-}"'),
  "official runtime go/no-go must require an explicit current-fleet cross-box peer",
);
assert.ok(
  goNoGo.includes("crossbox_peer_required"),
  "official runtime go/no-go must fail closed when cross-box peer is missing",
);
assert.ok(
  goNoGo.includes(
    'VOID_MAINNET0_CROSSBOX_PEER="$CROSSBOX_PEER" make mainnet0-crossbox-status-smoke',
  ),
  "official runtime go/no-go must run the guarded current-fleet cross-box smoke",
);
assert.equal(
  goNoGo.includes("prove-alienware-follower-autostart"),
  false,
  "official runtime go/no-go must not call the retired Alienware follower proof",
);
assert.ok(
  makefile.includes(
    "mainnet0-crossbox-status-smoke:\n\tbash ops/mainnet/mainnet0-crossbox-status-smoke.sh",
  ),
  "Makefile must route current-fleet cross-box smoke to the reviewed script",
);
assert.ok(
  crossboxSmoke.includes('CROSSBOX_PEER="${VOID_MAINNET0_CROSSBOX_PEER:-}"'),
  "cross-box smoke must require explicit peer input",
);
assert.ok(
  crossboxSmoke.includes("crossbox_peer_retired"),
  "cross-box smoke must reject retired Alienware identity",
);

console.log(MARKER);
console.log(`direct_dependency_count=${directProofInputs.length}`);
console.log("idle_contract=stable_head");
console.log("work_contract=explicit_reviewed_stimulus_then_head_advances");
console.log("current_fleet_crossbox_required=true");
console.log("retired_alienware_gonogo_dependency=false");
console.log("automatic_empty_seal=false");
