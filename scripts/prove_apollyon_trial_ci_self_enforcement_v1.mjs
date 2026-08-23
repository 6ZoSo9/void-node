#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_PATH = '.github/workflows/apollyon-trials-provider-neutral-v1.yml';
const SELF_PATH = 'scripts/prove_apollyon_trial_ci_self_enforcement_v1.mjs';
const HELPER_PATH = 'scripts/ci_diff_hygiene_v1.sh';
const SHARED_PROOF_PATH = 'scripts/prove_ci_diff_hygiene_v1.mjs';

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
  const triggerDependencies = [WORKFLOW_PATH, SELF_PATH, HELPER_PATH, SHARED_PROOF_PATH];
  for (const dependency of triggerDependencies) {
    requireText(pull, `      - "${dependency}"`, `pull_request dependency ${dependency}`);
    requireText(push, `      - "${dependency}"`, `push dependency ${dependency}`);
  }

  for (const required of [
    'fetch-depth: 1',
    'persist-credentials: false',
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

process.stdout.write('VOID_APOLLYON_TRIAL_CI_SELF_ENFORCEMENT_V1_GREEN\n');
process.stdout.write('committed_range_helper_self_enforced=true\n');
process.stdout.write('ci_diff_authority_bindings_self_enforced=true\n');
process.stdout.write('pull_and_push_self_proof_dependency_bound=true\n');
