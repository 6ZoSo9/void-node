#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW_PATH =
  ".github/workflows/chain2050-role-authority-registry-binding-v1.yml";
const DOC_PATH = "docs/security/chain2050-role-authority-registry-binding-v1.md";
const REGISTRY_PATH = "src/security/chain2050_role_authority_registry_v1.ts";
const BINDING_PATH =
  "src/security/chain2050_role_authority_registry_read_source_binding_v1.ts";
const PROOF_PATH = "scripts/prove_chain2050_role_authority_registry_binding_v1.ts";
const SELF_PATH =
  "scripts/prove_chain2050_role_authority_registry_binding_ci_self_enforcement_v1.mjs";
const RECORD_PATH = "src/security/chain2050_role_authority_record_v1.ts";
const ADAPTER_PATH = "src/security/chain2050_role_authority_read_adapter_v1.ts";
const RECORD_PROOF_PATH = "scripts/prove_chain2050_role_authority_record_v1.ts";
const ADAPTER_PROOF_PATH =
  "scripts/prove_chain2050_role_authority_read_adapter_v1.ts";
const HELPER_PATH = "scripts/ci_diff_hygiene_v1.sh";
const SHARED_PROOF_PATH = "scripts/prove_ci_diff_hygiene_v1.mjs";

const TRIGGER_DEPENDENCIES = [
  WORKFLOW_PATH,
  DOC_PATH,
  REGISTRY_PATH,
  BINDING_PATH,
  PROOF_PATH,
  SELF_PATH,
  RECORD_PATH,
  ADAPTER_PATH,
  RECORD_PROOF_PATH,
  ADAPTER_PROOF_PATH,
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
    requireText(
      pull,
      `      - "${dependency}"`,
      `pull_request dependency ${dependency}`,
    );
    requireText(
      push,
      `      - "${dependency}"`,
      `push dependency ${dependency}`,
    );
  }

  for (const required of [
    "matrix:\n        node: [22, 24, 26]",
    "fetch-depth: 1",
    "persist-credentials: false",
    `run: npx --no-install tsx ${PROOF_PATH}`,
    `run: npx --no-install tsx ${RECORD_PROOF_PATH}`,
    `run: npx --no-install tsx ${ADAPTER_PROOF_PATH}`,
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
  "pull-request self dependency removal",
);
expectInvalid(
  workflow.replace(
    "matrix:\n        node: [22, 24, 26]",
    "matrix:\n        node: [24]",
  ),
  "node matrix narrowing",
);
expectInvalid(
  workflow.replace(
    `run: npx --no-install tsx ${PROOF_PATH}`,
    "run: echo registry-proof-disabled",
  ),
  "focused registry proof removal",
);
expectInvalid(
  workflow.replace(
    `run: npx --no-install tsx ${ADAPTER_PROOF_PATH}`,
    "run: echo adapter-regression-proof-disabled",
  ),
  "underlying adapter proof removal",
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

const pushStart = workflow.indexOf("  push:\n");
assert.notEqual(pushStart, -1, "push section missing for adversary");
expectInvalid(
  `${workflow.slice(0, pushStart)}${workflow
    .slice(pushStart)
    .replace(`      - "${REGISTRY_PATH}"\n`, "")}`,
  "push registry dependency removal",
);

process.stdout.write(
  "VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_CI_SELF_ENFORCEMENT_V1_GREEN\n",
);
process.stdout.write("node_22_24_26_matrix_self_enforced=true\n");
process.stdout.write("registry_and_binding_dependencies_self_enforced=true\n");
process.stdout.write("underlying_record_and_adapter_regressions_bound=true\n");
process.stdout.write("committed_range_hygiene_self_enforced=true\n");
process.stdout.write(
  `complete_direct_dependency_count=${TRIGGER_DEPENDENCIES.length}\n`,
);
