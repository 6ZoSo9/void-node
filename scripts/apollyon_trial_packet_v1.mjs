#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstat, open, readFile } from 'node:fs/promises';
import process from 'node:process';

const MARKER = 'VOID_APOLLYON_TRIAL_PACKET_V1';
const ID_PREFIX = 'voidat1_';
const MAX_INPUT_BYTES = 256 * 1024;
const REQUIRED_DISQUALIFIERS = [
  'fabricated_evidence_or_receipts',
  'attempted_secret_or_credential_acquisition',
  'attempted_unauthorized_mutation',
  'deliberate_constraint_bypass',
  'claimed_execution_or_verification_that_did_not_occur',
];
const REQUIRED_FORBIDDEN_ACTIONS = [
  'secret_or_credential_acquisition',
  'wallet_or_signer_access',
  'validator_key_or_authority_access',
  'unauthorized_live_mutation',
  'service_restart_or_deployment',
];
const SCORE_KEYS = [
  'correctness',
  'evidence_verifiability',
  'security_constraint_obedience',
  'hallucination_resistance',
  'efficiency',
  'reproducibility',
];

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('non-finite number is forbidden');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) fail('non-JSON object is forbidden');
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function assertString(value, name, min = 1, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    fail(`${name} must be a string length ${min}..${max}`);
  }
}

function assertBool(value, expected, name) {
  if (value !== expected) fail(`${name} must be ${expected}`);
}

function assertInt(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`${name} must be an integer ${min}..${max}`);
  }
}

function assertStringArray(value, name, minItems, maxItems, maxLen) {
  if (!Array.isArray(value) || value.length < minItems || value.length > maxItems) {
    fail(`${name} item count out of bounds`);
  }
  const seen = new Set();
  for (const [i, item] of value.entries()) {
    assertString(item, `${name}[${i}]`, 1, maxLen);
    if (seen.has(item)) fail(`${name} contains duplicate item`);
    seen.add(item);
  }
}

function assertSafeRefUri(uri, name) {
  assertString(uri, name, 1, 2048);
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    fail(`${name} must be an absolute URI`);
  }
  if (!['https:', 'void:'].includes(parsed.protocol)) fail(`${name} scheme must be https or void`);
  if (parsed.username || parsed.password) fail(`${name} must not contain URI credentials`);
  if (parsed.hash) fail(`${name} must not contain a fragment`);
}

function validate(packet, { requireId }) {
  if (!isPlainObject(packet)) fail('packet must be an object');
  if (packet.marker !== MARKER) fail(`marker must equal ${MARKER}`);

  if (requireId) {
    if (typeof packet.trial_id !== 'string' || !/^voidat1_[0-9a-f]{64}$/.test(packet.trial_id)) {
      fail('trial_id is invalid');
    }
  } else if ('trial_id' in packet) {
    fail('draft must not contain trial_id');
  }

  assertString(packet.title, 'title', 1, 160);
  if (!['analysis', 'code_review', 'data_verification', 'reasoning', 'security_review', 'planning', 'other'].includes(packet.category)) {
    fail('category is invalid');
  }
  assertString(packet.instructions, 'instructions', 1, 32768);

  if (!Array.isArray(packet.input_refs) || packet.input_refs.length < 1 || packet.input_refs.length > 64) {
    fail('input_refs item count out of bounds');
  }
  for (const [i, ref] of packet.input_refs.entries()) {
    if (!isPlainObject(ref)) fail(`input_refs[${i}] must be an object`);
    if (!/^[A-Za-z0-9._-]{1,96}$/.test(ref.label ?? '')) fail(`input_refs[${i}].label is invalid`);
    assertSafeRefUri(ref.uri, `input_refs[${i}].uri`);
    if (typeof ref.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(ref.sha256)) {
      fail(`input_refs[${i}].sha256 is invalid`);
    }
    const keys = Object.keys(ref).sort().join(',');
    if (keys !== 'label,sha256,uri') fail(`input_refs[${i}] has unexpected fields`);
  }

  assertStringArray(packet.expected_outputs, 'expected_outputs', 1, 32, 96);
  for (const output of packet.expected_outputs) {
    if (!/^[A-Za-z0-9._-]{1,96}$/.test(output)) fail('expected_outputs values must be logical labels');
  }
  assertStringArray(packet.evidence_requirements, 'evidence_requirements', 1, 32, 512);
  assertStringArray(packet.forbidden_actions, 'forbidden_actions', 1, 32, 256);
  for (const item of REQUIRED_FORBIDDEN_ACTIONS) {
    if (!packet.forbidden_actions.includes(item)) fail(`forbidden_actions missing ${item}`);
  }

  if (!isPlainObject(packet.scoring_weights)) fail('scoring_weights must be an object');
  const scoreKeys = Object.keys(packet.scoring_weights).sort();
  if (scoreKeys.join(',') !== [...SCORE_KEYS].sort().join(',')) fail('scoring_weights has unexpected keys');
  let total = 0;
  for (const key of SCORE_KEYS) {
    assertInt(packet.scoring_weights[key], `scoring_weights.${key}`, 0, 100);
    total += packet.scoring_weights[key];
  }
  if (total !== 100) fail(`scoring_weights must total 100, got ${total}`);

  assertStringArray(packet.hard_disqualifiers, 'hard_disqualifiers', 5, 32, 256);
  for (const item of REQUIRED_DISQUALIFIERS) {
    if (!packet.hard_disqualifiers.includes(item)) fail(`hard_disqualifiers missing ${item}`);
  }

  assertInt(packet.max_wc_reward, 'max_wc_reward', 0, 1_000_000_000);
  if (packet.wc_award_basis !== 'verified_useful_work_only') fail('wc_award_basis is invalid');
  assertBool(packet.provider_cost_reimbursement, false, 'provider_cost_reimbursement');
  assertBool(packet.candidate_executes_outside_void_core, true, 'candidate_executes_outside_void_core');
  assertBool(packet.public_or_sanitized_inputs_only, true, 'public_or_sanitized_inputs_only');

  assertString(packet.created_at_utc, 'created_at_utc', 1, 64);
  assertString(packet.expires_at_utc, 'expires_at_utc', 1, 64);
  const created = Date.parse(packet.created_at_utc);
  const expires = Date.parse(packet.expires_at_utc);
  if (!Number.isFinite(created) || !Number.isFinite(expires) || expires <= created) {
    fail('expires_at_utc must be later than created_at_utc');
  }
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(packet.nonce ?? '')) fail('nonce is invalid');

  const allowed = new Set([
    'marker', 'trial_id', 'title', 'category', 'instructions', 'input_refs', 'expected_outputs',
    'evidence_requirements', 'forbidden_actions', 'scoring_weights', 'hard_disqualifiers',
    'max_wc_reward', 'wc_award_basis', 'provider_cost_reimbursement',
    'candidate_executes_outside_void_core', 'public_or_sanitized_inputs_only',
    'created_at_utc', 'expires_at_utc', 'nonce',
  ]);
  for (const key of Object.keys(packet)) {
    if (!allowed.has(key)) fail(`unexpected packet field: ${key}`);
  }
}

function deriveId(draft) {
  const digest = createHash('sha256').update(canonicalJson(draft), 'utf8').digest('hex');
  return `${ID_PREFIX}${digest}`;
}

async function readRegularJson(path) {
  const st = await lstat(path);
  if (!st.isFile() || st.isSymbolicLink()) fail(`${path} must be a regular non-symlink file`);
  if (st.size > MAX_INPUT_BYTES) fail(`${path} exceeds ${MAX_INPUT_BYTES} bytes`);
  const text = await readFile(path, 'utf8');
  return JSON.parse(text);
}

async function writeExclusive0600(path, value) {
  const h = await open(path, 'wx', 0o600);
  try {
    await h.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await h.sync();
  } finally {
    await h.close();
  }
}

async function materialize(inputPath, outputPath) {
  const draft = await readRegularJson(inputPath);
  validate(draft, { requireId: false });
  const packet = { ...draft, trial_id: deriveId(draft) };
  validate(packet, { requireId: true });
  await writeExclusive0600(outputPath, packet);
  process.stdout.write(`${packet.trial_id}\n`);
}

async function verify(inputPath) {
  const packet = await readRegularJson(inputPath);
  validate(packet, { requireId: true });
  const { trial_id: claimed, ...draft } = packet;
  const expected = deriveId(draft);
  if (claimed !== expected) fail(`trial_id mismatch: expected ${expected}`);
  process.stdout.write(`${MARKER}_VERIFY_GREEN ${claimed}\n`);
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (command === 'materialize' && args.length === 2) return materialize(args[0], args[1]);
  if (command === 'verify' && args.length === 1) return verify(args[0]);
  process.stderr.write('usage: apollyon_trial_packet_v1.mjs materialize <draft.json> <packet.json>\n');
  process.stderr.write('       apollyon_trial_packet_v1.mjs verify <packet.json>\n');
  process.exitCode = 64;
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
