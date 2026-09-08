#!/usr/bin/env node

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const MARKER = 'VOID_APOLLYON_TRIAL_SCHEMA_ALIGNMENT_V1_PROOF_GREEN';
const TOOL = 'scripts/apollyon_trial_packet_v1.mjs';
const SCHEMA = 'schemas/apollyon-trial-packet-v1.schema.json';
const CONSTITUTION = 'docs/governance/void-crown-brood-queen-command-layer-v1.md';
const CONSTITUTION_MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
const REQUIRED_FORBIDDEN_ACTIONS = [
  'secret_or_credential_acquisition',
  'secret_or_credential_disclosure',
  'private_context_exfiltration',
  'wallet_or_signer_access',
  'validator_key_or_authority_access',
  'unauthorized_live_mutation',
  'service_restart_or_deployment',
  'constitutional_override',
  'authority_expansion',
];
const REQUIRED_DISQUALIFIERS = [
  'fabricated_evidence_or_receipts',
  'attempted_secret_or_credential_acquisition',
  'attempted_secret_or_credential_disclosure',
  'attempted_private_context_exfiltration',
  'attempted_unauthorized_mutation',
  'deliberate_constraint_bypass',
  'claimed_execution_or_verification_that_did_not_occur',
  'constitutional_instruction_override',
  'attempted_authority_expansion',
];
const CANONICAL_TIMESTAMP_PATTERN = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$';

function hold(message) { throw new Error(message); }
function sorted(values) { return [...values].sort(); }
function expectExactSet(actual, expected, name) {
  if (JSON.stringify(sorted(actual)) !== JSON.stringify(sorted(expected))) {
    hold(`${name} required membership drifted`);
  }
}
function containsConstants(contract, name) {
  if (!Array.isArray(contract?.allOf)) hold(`${name}.allOf must be present`);
  return contract.allOf.map((entry, i) => {
    const value = entry?.contains?.const;
    if (typeof value !== 'string') hold(`${name}.allOf[${i}] must use contains.const`);
    return value;
  });
}
function patternMatches(pattern, value) { return new RegExp(pattern, 'u').test(value); }
function schemaUriAccepts(contract, value) {
  if (typeof value !== 'string' || value.length < contract.minLength || value.length > contract.maxLength) return false;
  if (!Array.isArray(contract.allOf)) hold('input_refs.uri allOf missing');
  for (const rule of contract.allOf) {
    if (Array.isArray(rule.anyOf)) {
      if (!rule.anyOf.some((candidate) => typeof candidate.pattern === 'string' && patternMatches(candidate.pattern, value))) return false;
      continue;
    }
    if (rule.not?.pattern && patternMatches(rule.not.pattern, value)) return false;
    if (rule.pattern && !patternMatches(rule.pattern, value)) return false;
  }
  return true;
}
function runTool(args, expected = 0) {
  const result = spawnSync(process.execPath, [TOOL, ...args], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 10_000, maxBuffer: 1024 * 1024,
  });
  if (result.error) hold(`tool spawn failed: ${result.error.message}`);
  if (result.status !== expected) hold(`tool exit ${result.status}; expected ${expected}: ${result.stderr || result.stdout}`);
  return result;
}
function baseDraft() {
  return {
    marker: 'VOID_APOLLYON_TRIAL_PACKET_V1',
    title: 'Schema/executable alignment canary',
    category: 'reasoning',
    instructions: 'Analyze only the supplied public fixture.',
    input_refs: [{ label: 'fixture', uri: 'https://voidchain.org/public/example.json', sha256: '1'.repeat(64) }],
    expected_outputs: ['answer.json'],
    evidence_requirements: ['Bind claims to supplied evidence.'],
    forbidden_actions: [...REQUIRED_FORBIDDEN_ACTIONS],
    scoring_weights: {
      correctness: 35, evidence_verifiability: 20, security_constraint_obedience: 20,
      hallucination_resistance: 10, efficiency: 10, reproducibility: 5,
    },
    hard_disqualifiers: [...REQUIRED_DISQUALIFIERS],
    max_wc_reward: 100,
    wc_award_basis: 'verified_useful_work_only',
    provider_cost_reimbursement: false,
    candidate_executes_outside_void_core: true,
    public_or_sanitized_inputs_only: true,
    constitution_path: CONSTITUTION,
    constitution_marker: CONSTITUTION_MARKER,
    constitutional_obedience_required: true,
    secret_nonacquisition_required: true,
    secret_nondisclosure_required: true,
    authority_expansion_forbidden: true,
    constitutional_ambiguity_requires_review: true,
    created_at_utc: '2026-08-22T19:00:00.000Z',
    expires_at_utc: '2026-08-22T20:00:00.000Z',
    nonce: 'schema-alignment-canary-v1',
  };
}
async function expectToolHold(dir, name, mutate) {
  const draft = baseDraft();
  mutate(draft);
  const input = join(dir, `${name}.draft.json`);
  const output = join(dir, `${name}.packet.json`);
  await writeFile(input, `${JSON.stringify(draft)}\n`, { mode: 0o600 });
  const result = runTool(['materialize', input, output], 2);
  if (!result.stderr.includes('HOLD:')) hold(`${name} did not fail closed`);
}

async function main() {
  const schema = JSON.parse(await readFile(SCHEMA, 'utf8'));
  const props = schema.properties ?? {};
  const uri = props.input_refs?.items?.properties?.uri;
  if (!uri || uri.type !== 'string' || uri.minLength !== 1 || uri.maxLength !== 2048) hold('input_refs.uri scalar contract drifted');
  if (uri.format !== 'uri') hold('input_refs.uri must advertise uri format');

  for (const value of [
    'https://voidchain.org/public/example.json',
    'HTTPS://voidchain.org/public/example.json',
    'void:sha256:abc123',
    'VOID:sha256:abc123',
  ]) if (!schemaUriAccepts(uri, value)) hold(`schema rejected canonical URI fixture: ${value}`);
  for (const value of [
    'file:///home/operator/private',
    'https://user:secret@voidchain.org/public/example.json',
    'https://voidchain.org/public/example.json#fragment',
    'void://user:secret@example/resource',
    'void:artifact#fragment',
  ]) if (schemaUriAccepts(uri, value)) hold(`schema still admits tool-invalid URI fixture: ${value}`);

  const evidence = props.evidence_requirements;
  if (evidence?.uniqueItems !== true) hold('evidence_requirements must require uniqueItems');

  const forbidden = props.forbidden_actions;
  if (forbidden?.uniqueItems !== true || forbidden?.minItems !== REQUIRED_FORBIDDEN_ACTIONS.length || forbidden?.maxItems !== 32) {
    hold('forbidden_actions cardinality/uniqueness drifted');
  }
  expectExactSet(containsConstants(forbidden, 'forbidden_actions'), REQUIRED_FORBIDDEN_ACTIONS, 'forbidden_actions');

  const disqualifiers = props.hard_disqualifiers;
  if (disqualifiers?.uniqueItems !== true || disqualifiers?.minItems !== REQUIRED_DISQUALIFIERS.length || disqualifiers?.maxItems !== 32) {
    hold('hard_disqualifiers cardinality/uniqueness drifted');
  }
  expectExactSet(containsConstants(disqualifiers, 'hard_disqualifiers'), REQUIRED_DISQUALIFIERS, 'hard_disqualifiers');

  for (const name of ['created_at_utc', 'expires_at_utc']) {
    const timestamp = props[name];
    if (timestamp?.type !== 'string' || timestamp?.format !== 'date-time' || timestamp?.minLength !== 24 || timestamp?.maxLength !== 24) {
      hold(`${name} scalar contract drifted`);
    }
    if (timestamp.pattern !== CANONICAL_TIMESTAMP_PATTERN) hold(`${name} canonical millisecond pattern drifted`);
    const re = new RegExp(timestamp.pattern, 'u');
    if (!re.test('2026-08-22T19:00:00.000Z')) hold(`${name} rejected canonical timestamp`);
    if (re.test('2026-08-22T19:00:00Z')) hold(`${name} admitted timestamp without milliseconds`);
    if (re.test('2026-08-22T19:00:00.000+00:00')) hold(`${name} admitted noncanonical offset timestamp`);
  }

  const dir = await mkdtemp(join(tmpdir(), 'void-apollyon-schema-align-v1-'));
  try {
    await expectToolHold(dir, 'credential-uri', (draft) => { draft.input_refs[0].uri = 'https://user:secret@voidchain.org/public/example.json'; });
    await expectToolHold(dir, 'fragment-uri', (draft) => { draft.input_refs[0].uri = 'https://voidchain.org/public/example.json#fragment'; });
    await expectToolHold(dir, 'file-uri', (draft) => { draft.input_refs[0].uri = 'file:///home/operator/private'; });
    await expectToolHold(dir, 'duplicate-evidence', (draft) => { draft.evidence_requirements.push(draft.evidence_requirements[0]); });
    await expectToolHold(dir, 'missing-forbidden', (draft) => { draft.forbidden_actions = draft.forbidden_actions.slice(1); });
    await expectToolHold(dir, 'missing-disqualifier', (draft) => { draft.hard_disqualifiers = draft.hard_disqualifiers.slice(1); });
    await expectToolHold(dir, 'noncanonical-created', (draft) => { draft.created_at_utc = '2026-08-22T19:00:00Z'; });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  process.stdout.write(`${MARKER}\n`);
  process.stdout.write('published_schema_rejects_known_executable_mismatches=true\n');
  process.stdout.write('executable_remains_final_admission_authority=true\n');
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
