#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_PATH = '.github/workflows/apollyon-trials-provider-neutral-v1.yml';
const DOC_PATH = 'docs/public/apollyon-trials-provider-neutral-v1.md';
const CONSTITUTION_PATH = 'docs/governance/void-crown-brood-queen-command-layer-v1.md';
const SCHEMA_PATH = 'schemas/apollyon-trial-packet-v1.schema.json';
const TOOL_PATH = 'scripts/apollyon_trial_packet_v1.mjs';
const FOCUSED_PROOF_PATH = 'scripts/prove_apollyon_trials_provider_neutral_v1.mjs';
const SCHEMA_ALIGNMENT_PROOF_PATH = 'scripts/prove_apollyon_trial_schema_alignment_v1.mjs';
const SELF_PATH = 'scripts/prove_apollyon_trial_ci_self_enforcement_v1.mjs';
const HELPER_PATH = 'scripts/ci_diff_hygiene_v1.sh';
const SHARED_PROOF_PATH = 'scripts/prove_ci_diff_hygiene_v1.mjs';

const TRIGGER_DEPENDENCIES = [
  WORKFLOW_PATH,
  DOC_PATH,
  CONSTITUTION_PATH,
  SCHEMA_PATH,
  TOOL_PATH,
  FOCUSED_PROOF_PATH,
  SCHEMA_ALIGNMENT_PROOF_PATH,
  SELF_PATH,
  HELPER_PATH,
  SHARED_PROOF_PATH,
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
  const pull = section(source, '  pull_request:\n', '  push:\n', 'pull_request');
  const push = section(source, '  push:\n', '  workflow_dispatch:\n', 'push');
  for (const dependency of TRIGGER_DEPENDENCIES) {
    requireText(pull, `      - "${dependency}"`, `pull_request dependency ${dependency}`);
    requireText(push, `      - "${dependency}"`, `push dependency ${dependency}`);
  }

  for (const required of [
    'fetch-depth: 1',
    'persist-credentials: false',
    `node --check ${TOOL_PATH}`,
    `node --check ${FOCUSED_PROOF_PATH}`,
    `node --check ${SCHEMA_ALIGNMENT_PROOF_PATH}`,
    `node --check ${SELF_PATH}`,
    `node ${FOCUSED_PROOF_PATH}`,
    `node ${SCHEMA_ALIGNMENT_PROOF_PATH}`,
    `run: node ${SELF_PATH}`,
    `run: node ${SHARED_PROOF_PATH}`,
    `run: bash ${HELPER_PATH}`,
    'CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}',
    'CI_DIFF_PUSH_BEFORE_SHA: ${{ github.event.before }}',
    'CI_DIFF_CURRENT_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
    'CI_DIFF_CHECKOUT_SHA: ${{ github.sha }}',
    'CI_DIFF_BASE_REMOTE: ${{ github.server_url }}/${{ github.repository }}.git',
    'CI_DIFF_HEAD_REMOTE: ${{ github.server_url }}/${{ github.event.pull_request.head.repo.full_name || github.repository }}.git',
  ]) requireText(source, required, 'workflow contract');
}

function expectInvalid(source, label) {
  let rejected = false;
  try { validateWorkflow(source); } catch { rejected = true; }
  assert.equal(rejected, true, `${label}: weakened workflow remained accepted`);
}

const workflow = readFileSync(path.join(ROOT, WORKFLOW_PATH), 'utf8');
validateWorkflow(workflow);

expectInvalid(
  workflow.replace(`run: bash ${HELPER_PATH}`, 'run: echo diff-hygiene-disabled'),
  'helper invocation removal',
);
expectInvalid(
  workflow.replace(
    'CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}',
    'CI_DIFF_PR_BASE_SHA: weakened',
  ),
  'PR base binding weakening',
);
expectInvalid(
  workflow.replace(`      - "${SELF_PATH}"\n`, ''),
  'pull-request self-proof dependency removal',
);
expectInvalid(
  workflow.replace(`run: node ${SELF_PATH}`, 'run: echo self-proof-disabled'),
  'self-proof invocation removal',
);
expectInvalid(
  workflow.replace(`      - "${SCHEMA_PATH}"\n`, ''),
  'pull-request semantic dependency removal',
);
const pushStart = workflow.indexOf('  push:\n');
assert.notEqual(pushStart, -1, 'push section missing for adversary');
expectInvalid(
  `${workflow.slice(0, pushStart)}${workflow.slice(pushStart).replace(`      - "${CONSTITUTION_PATH}"\n`, '')}`,
  'push constitutional dependency removal',
);

process.stdout.write('VOID_APOLLYON_TRIAL_CI_SELF_ENFORCEMENT_V1_GREEN\n');
process.stdout.write('committed_range_helper_self_enforced=true\n');
process.stdout.write('ci_diff_authority_bindings_self_enforced=true\n');
process.stdout.write('pull_and_push_self_proof_dependency_bound=true\n');
process.stdout.write(`complete_direct_dependency_count=${TRIGGER_DEPENDENCIES.length}\n`);
process.stdout.write('semantic_dependency_closure_self_enforced=true\n');
