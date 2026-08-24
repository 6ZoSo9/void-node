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
const selfPath = "scripts/prove_canonical_producer_no_empty_operator_contract_v1.mjs";

const workflow = fs.readFileSync(workflowPath, "utf8");
const noEmptyProof = fs.readFileSync(noEmptyProofPath, "utf8");
const runtimeProof = fs.readFileSync(runtimeProofPath, "utf8");
const goNoGo = fs.readFileSync(goNoGoPath, "utf8");

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

console.log(MARKER);
console.log(`direct_dependency_count=${directProofInputs.length}`);
console.log("idle_contract=stable_head");
console.log("work_contract=explicit_reviewed_stimulus_then_head_advances");
console.log("automatic_empty_seal=false");
