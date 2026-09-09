#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW_PATH = ".github/workflows/chain2050-role-authority-read-adapter-v1.yml";
const DOC_PATH = "docs/security/chain2050-role-authority-read-adapter-v1.md";
const ADAPTER_SOURCE = "src/security/chain2050_role_authority_read_adapter_v1.ts";
const ADAPTER_PROOF = "scripts/prove_chain2050_role_authority_read_adapter_v1.ts";
const RECORD_SOURCE = "src/security/chain2050_role_authority_record_v1.ts";
const RECORD_PROOF = "scripts/prove_chain2050_role_authority_record_v1.ts";
const SELF_PATH = "scripts/prove_chain2050_role_authority_read_adapter_ci_self_enforcement_v1.mjs";
const HELPER_PATH = "scripts/ci_diff_hygiene_v1.sh";
const SHARED_PROOF_PATH = "scripts/prove_ci_diff_hygiene_v1.mjs";

const TRIGGER_DEPENDENCIES = [
  WORKFLOW_PATH,
  DOC_PATH,
  ADAPTER_SOURCE,
  ADAPTER_PROOF,
  RECORD_SOURCE,
  RECORD_PROOF,
  SELF_PATH,
  HELPER_PATH,
  SHARED_PROOF_PATH,
  "package.json",
  "package-lock.json",
  "tsconfig.json",
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
    requireText(pull, `      - "${dependency}"`, `pull dependency ${dependency}`);
    requireText(push, `      - "${dependency}"`, `push dependency ${dependency}`);
  }

  for (const required of [
    "fetch-depth: 1",
    "persist-credentials: false",
    "matrix:",
    "node: [22, 24, 26]",
    "npm ci --ignore-scripts --no-audit --no-fund",
    `npx --no-install tsx ${ADAPTER_PROOF}`,
    `npx --no-install tsx ${RECORD_PROOF}`,
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
  workflow.replace(`      - "${SELF_PATH}"\n`, ""),
  "self-trigger removal",
);
expectInvalid(
  workflow.replace(`      - "${ADAPTER_SOURCE}"\n`, ""),
  "adapter-source trigger removal",
);
expectInvalid(
  workflow.replace(`      - "${RECORD_SOURCE}"\n`, ""),
  "record-source trigger removal",
);
expectInvalid(
  workflow.replace("node: [22, 24, 26]", "node: [24]"),
  "node matrix narrowing",
);
expectInvalid(
  workflow.replace(
    `npx --no-install tsx ${ADAPTER_PROOF}`,
    "echo adapter-proof-disabled",
  ),
  "focused proof removal",
);
expectInvalid(
  workflow.replace(
    `npx --no-install tsx ${RECORD_PROOF}`,
    "echo record-proof-disabled",
  ),
  "underlying record proof removal",
);
expectInvalid(
  workflow.replace(`run: node ${SELF_PATH}`, "run: echo self-proof-disabled"),
  "self-proof invocation removal",
);
expectInvalid(
  workflow.replace(`run: bash ${HELPER_PATH}`, "run: echo diff-hygiene-disabled"),
  "diff-hygiene invocation removal",
);
expectInvalid(
  workflow.replace(
    "CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}",
    "CI_DIFF_PR_BASE_SHA: weakened",
  ),
  "PR base binding weakening",
);

process.stdout.write("VOID_CHAIN2050_ROLE_AUTHORITY_READ_ADAPTER_CI_SELF_ENFORCEMENT_V1_GREEN\n");
process.stdout.write(`complete_direct_dependency_count=${TRIGGER_DEPENDENCIES.length}\n`);
process.stdout.write("node_22_24_26_matrix_required=true\n");
process.stdout.write("adapter_and_record_proofs_required=true\n");
process.stdout.write("committed_range_helper_self_enforced=true\n");
process.stdout.write("ci_diff_authority_bindings_self_enforced=true\n");
process.stdout.write("source_mutation=false\n");
process.stdout.write("authority_granted=false\n");
