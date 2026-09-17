#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW_PATH = ".github/workflows/chain2050-role-authority-record-v1.yml";
const DOC_PATH = "docs/security/chain2050-role-authority-record-v1.md";
const SOURCE_PATH = "src/security/chain2050_role_authority_record_v1.ts";
const FOCUSED_PROOF_PATH = "scripts/prove_chain2050_role_authority_record_v1.ts";
const SELF_PATH = "scripts/prove_chain2050_role_authority_ci_self_enforcement_v1.mjs";
const HELPER_PATH = "scripts/ci_diff_hygiene_v1.sh";
const SHARED_PROOF_PATH = "scripts/prove_ci_diff_hygiene_v1.mjs";
const PACKAGE_PATH = "package.json";
const LOCK_PATH = "package-lock.json";
const TSCONFIG_PATH = "tsconfig.json";

const TRIGGER_DEPENDENCIES = [
  WORKFLOW_PATH,
  DOC_PATH,
  SOURCE_PATH,
  FOCUSED_PROOF_PATH,
  SELF_PATH,
  HELPER_PATH,
  SHARED_PROOF_PATH,
  PACKAGE_PATH,
  LOCK_PATH,
  TSCONFIG_PATH,
];

function section(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${label}: start marker missing`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `${label}: end marker missing`);
  return source.slice(start, end);
}

function requireText(source, needle, label) {
  assert.ok(source.includes(needle), `${label}: missing ${needle}`);
}

function validateWorkflow(source) {
  const pull = section(source, "  pull_request:\n", "  push:\n", "pull_request");
  const push = section(source, "  push:\n", "  workflow_dispatch:\n", "push");

  for (const dependency of TRIGGER_DEPENDENCIES) {
    requireText(pull, `      - "${dependency}"`, `pull_request dependency ${dependency}`);
    requireText(push, `      - "${dependency}"`, `push dependency ${dependency}`);
  }

  for (const required of [
    "uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
    "uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
    "fetch-depth: 1",
    "persist-credentials: false",
    "node: [22, 24, 26]",
    "npm ci --ignore-scripts --no-audit --no-fund",
    `npx --no-install tsx ${FOCUSED_PROOF_PATH}`,
    `run: node ${SELF_PATH}`,
    `run: node ${SHARED_PROOF_PATH}`,
    `run: bash ${HELPER_PATH}`,
    "CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}",
    "CI_DIFF_PUSH_BEFORE_SHA: ${{ github.event.before }}",
    "CI_DIFF_CURRENT_SHA: ${{ github.event.pull_request.head.sha || github.sha }}",
    "CI_DIFF_CHECKOUT_SHA: ${{ github.sha }}",
    "CI_DIFF_BASE_REMOTE: ${{ github.server_url }}/${{ github.repository }}.git",
    "CI_DIFF_HEAD_REMOTE: ${{ github.server_url }}/${{ github.event.pull_request.head.repo.full_name || github.repository }}.git",
  ]) {
    requireText(source, required, "workflow contract");
  }
}

function expectInvalid(source, label) {
  let rejected = false;
  try {
    validateWorkflow(source);
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, `${label}: weakened workflow remained accepted`);
}

const workflow = readFileSync(path.join(ROOT, WORKFLOW_PATH), "utf8");
validateWorkflow(workflow);

expectInvalid(
  workflow.replace(`      - "${WORKFLOW_PATH}"\n`, ""),
  "pull-request workflow self-dependency removal",
);

const pushStart = workflow.indexOf("  push:\n");
assert.notEqual(pushStart, -1, "push section missing for adversary");
expectInvalid(
  `${workflow.slice(0, pushStart)}${workflow.slice(pushStart).replace(`      - "${SOURCE_PATH}"\n`, "")}`,
  "push source dependency removal",
);

expectInvalid(
  workflow.replace(`      - "${FOCUSED_PROOF_PATH}"\n`, ""),
  "pull-request focused-proof dependency removal",
);
expectInvalid(
  workflow.replace(
    `npx --no-install tsx ${FOCUSED_PROOF_PATH}`,
    "echo focused-proof-disabled",
  ),
  "focused proof invocation removal",
);
expectInvalid(
  workflow.replace("node: [22, 24, 26]", "node: [24]"),
  "node matrix narrowing",
);
expectInvalid(
  workflow.replace(`run: node ${SELF_PATH}`, "run: echo self-proof-disabled"),
  "self-proof invocation removal",
);
expectInvalid(
  workflow.replace(`run: bash ${HELPER_PATH}`, "run: echo diff-hygiene-disabled"),
  "diff-hygiene helper removal",
);
expectInvalid(
  workflow.replace(
    "CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}",
    "CI_DIFF_PR_BASE_SHA: weakened",
  ),
  "PR base binding weakening",
);
expectInvalid(
  workflow.replace(`      - "${SHARED_PROOF_PATH}"\n`, ""),
  "shared diff-hygiene proof dependency removal",
);

process.stdout.write("VOID_CHAIN2050_ROLE_AUTHORITY_CI_SELF_ENFORCEMENT_V1_GREEN\n");
process.stdout.write("node_matrix_22_24_26_self_enforced=true\n");
process.stdout.write("focused_proof_invocation_self_enforced=true\n");
process.stdout.write("pull_and_push_dependency_closure_self_enforced=true\n");
process.stdout.write("committed_range_diff_hygiene_self_enforced=true\n");
process.stdout.write(`complete_direct_dependency_count=${TRIGGER_DEPENDENCIES.length}\n`);
