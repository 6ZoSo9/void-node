#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { lstat, open, readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const MARKER = 'VOID_APOLLYON_OUTBOUND_ADMISSION_MANIFEST_V1';
const RECEIPT_MARKER = 'VOID_APOLLYON_OUTBOUND_ADMISSION_RECEIPT_V1';
const TRIAL_TOOL = 'scripts/apollyon_trial_packet_v1.mjs';
const CONSTITUTION_PATH = 'docs/governance/void-crown-brood-queen-command-layer-v1.md';
const CONSTITUTION_MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
const MAX_JSON_BYTES = 256 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_ENTRIES = 64;

const BLOCKED_JSON_KEYS = new Set([
  'privatekey',
  'secret',
  'secretkey',
  'clientsecret',
  'password',
  'passwd',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'walletseed',
  'seedphrase',
  'mnemonic',
  'sshkey',
  'validatorkey',
  'signerkey',
  'authorization',
  'cookie',
  'sessioncookie',
]);

const BLOCKED_PATH_COMPONENTS = new Set([
  '.ssh',
  '.gnupg',
  '.aws',
  '.kube',
  '.docker',
  'secrets',
  'credentials',
  'keystore',
  'wallet',
]);

const BLOCKED_TEXT_PATTERNS = [
  ['private_key_pem', /-----BEGIN (?:ENCRYPTED |OPENSSH |EC |RSA |DSA |ED25519 )?PRIVATE KEY-----/i],
  ['authorization_bearer', /(?:^|\n)\s*Authorization\s*:\s*Bearer\s+\S+/i],
  ['secret_environment_assignment', /(?:^|\n)\s*[A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE_KEY|WALLET_SEED|MNEMONIC|SEED_PHRASE|CLIENT_SECRET|ACCESS_KEY)\s*=\s*\S+/i],
  ['github_token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/],
  ['github_fine_grained_token', /\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
  ['openai_style_key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/],
  ['aws_access_key', /\bAKIA[0-9A-Z]{16}\b/],
  ['jwt_like_token', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/],
  ['private_local_path', /(?:^|[\s"'])\/(?:home\/[^/\s]+\/(?:\.ssh|\.gnupg|\.aws|\.kube|\.docker|\.config)\/|root\/(?:\.ssh|\.gnupg|\.aws|\.kube|\.docker|\.config)\/|run\/user\/\d+\/)/i],
];

function fail(message) {
  throw new Error(message);
}

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('non-finite number is forbidden');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== 'object') fail('non-JSON value is forbidden');
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function exactKeys(value, expected, name) {
  const actual = Object.keys(value).sort().join(',');
  const wanted = [...expected].sort().join(',');
  if (actual !== wanted) fail(`${name} has unexpected fields`);
}

function normalizeSecretKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function scanJsonKeys(value, label, path = '$') {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) scanJsonKeys(value[i], label, `${path}[${i}]`);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (BLOCKED_JSON_KEYS.has(normalizeSecretKey(key))) {
      fail(`entry ${label} blocked category=credential_bearing_json_key`);
    }
    scanJsonKeys(child, label, `${path}.${key}`);
  }
}

function scanText(text, label) {
  for (const [category, pattern] of BLOCKED_TEXT_PATTERNS) {
    if (pattern.test(text)) fail(`entry ${label} blocked category=${category}`);
  }
}

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`entry ${label} blocked category=non_utf8_or_binary_payload`);
  }
}

async function readRegularBounded(path, maxBytes, name) {
  const st = await lstat(path);
  if (!st.isFile() || st.isSymbolicLink()) fail(`${name} must be a regular non-symlink file`);
  if (st.size > maxBytes) fail(`${name} exceeds ${maxBytes} bytes`);
  const data = await readFile(path);
  if (data.length !== st.size) fail(`${name} size changed during read`);
  return data;
}

async function readJsonBounded(path, maxBytes, name) {
  const data = await readRegularBounded(path, maxBytes, name);
  const text = decodeUtf8(data, name);
  try {
    return { value: JSON.parse(text), bytes: data, text };
  } catch {
    fail(`${name} must contain valid JSON`);
  }
}

function validateManifest(manifest) {
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) fail('manifest must be an object');
  exactKeys(manifest, ['marker', 'trial_id', 'entries', 'created_at_utc', 'nonce'], 'manifest');
  if (manifest.marker !== MARKER) fail(`manifest marker must equal ${MARKER}`);
  if (typeof manifest.trial_id !== 'string' || !/^voidat1_[0-9a-f]{64}$/.test(manifest.trial_id)) fail('manifest trial_id is invalid');
  if (!Array.isArray(manifest.entries) || manifest.entries.length < 1 || manifest.entries.length > MAX_ENTRIES) fail('manifest entries count is out of bounds');
  if (typeof manifest.created_at_utc !== 'string' || !Number.isFinite(Date.parse(manifest.created_at_utc))) fail('manifest created_at_utc is invalid');
  if (typeof manifest.nonce !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(manifest.nonce)) fail('manifest nonce is invalid');

  const labels = new Set();
  const paths = new Set();
  for (const [i, entry] of manifest.entries.entries()) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) fail(`entries[${i}] must be an object`);
    exactKeys(entry, ['label', 'relative_path', 'sha256', 'classification', 'media_type'], `entries[${i}]`);
    if (typeof entry.label !== 'string' || !/^[A-Za-z0-9._-]{1,96}$/.test(entry.label)) fail(`entries[${i}].label is invalid`);
    if (labels.has(entry.label)) fail('manifest contains duplicate labels');
    labels.add(entry.label);
    if (typeof entry.relative_path !== 'string' || !/^[A-Za-z0-9._/-]{1,256}$/.test(entry.relative_path)) fail(`entries[${i}].relative_path is invalid`);
    if (isAbsolute(entry.relative_path) || entry.relative_path.startsWith('/')) fail(`entries[${i}].relative_path must be relative`);
    const components = entry.relative_path.split('/');
    if (components.some((x) => x === '' || x === '.' || x === '..')) fail(`entries[${i}].relative_path contains unsafe components`);
    if (components.some((x) => BLOCKED_PATH_COMPONENTS.has(x.toLowerCase()))) fail(`entries[${i}] blocked category=sensitive_path_component`);
    if (paths.has(entry.relative_path)) fail('manifest contains duplicate relative paths');
    paths.add(entry.relative_path);
    if (typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256)) fail(`entries[${i}].sha256 is invalid`);
    if (!['public', 'sanitized'].includes(entry.classification)) fail(`entries[${i}].classification is invalid`);
    if (!['text/plain', 'application/json'].includes(entry.media_type)) fail(`entries[${i}].media_type is invalid`);
  }
}

function verifyTrialTool(trialPath) {
  const r = spawnSync(process.execPath, [TRIAL_TOOL, 'verify', trialPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
    env: { PATH: process.env.PATH ?? '' },
  });
  if (r.error) fail(`trial verifier spawn failed: ${r.error.message}`);
  if (r.status !== 0 || !r.stdout.includes('VOID_APOLLYON_TRIAL_PACKET_V1_VERIFY_GREEN')) {
    fail('trial packet failed provider-neutral verification');
  }
}

function validateConstitutionalPacket(packet) {
  const required = {
    constitution_path: CONSTITUTION_PATH,
    constitution_marker: CONSTITUTION_MARKER,
    constitutional_obedience_required: true,
    secret_nonacquisition_required: true,
    secret_nondisclosure_required: true,
    authority_expansion_forbidden: true,
    constitutional_ambiguity_requires_review: true,
    candidate_executes_outside_void_core: true,
    public_or_sanitized_inputs_only: true,
  };
  for (const [key, expected] of Object.entries(required)) {
    if (packet[key] !== expected) fail(`trial packet constitutional/security field ${key} drifted`);
  }
}

function validatePacketManifestBinding(packet, manifest) {
  if (packet.trial_id !== manifest.trial_id) fail('manifest trial_id does not match packet');
  if (!Array.isArray(packet.input_refs) || packet.input_refs.length !== manifest.entries.length) {
    fail('manifest entries must match trial input_refs one-for-one');
  }
  const expected = new Map(packet.input_refs.map((x) => [x.label, x.sha256]));
  if (expected.size !== packet.input_refs.length) fail('trial input_refs labels are not unique');
  for (const entry of manifest.entries) {
    if (!expected.has(entry.label)) fail(`manifest label ${entry.label} is not present in trial input_refs`);
    if (expected.get(entry.label) !== entry.sha256) fail(`manifest digest for ${entry.label} differs from trial input_ref`);
  }
}

async function assertNoSymlinkComponents(rootPath, relativePath) {
  const rootStat = await lstat(rootPath);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail('staging root must be a real directory, not a symlink');
  let current = rootPath;
  for (const component of relativePath.split('/')) {
    current = join(current, component);
    const st = await lstat(current);
    if (st.isSymbolicLink()) fail(`entry ${relativePath} blocked category=symlink_component`);
  }
}

async function readStagedEntry(rootPath, entry) {
  await assertNoSymlinkComponents(rootPath, entry.relative_path);
  const rootReal = await realpath(rootPath);
  const candidate = resolve(rootPath, entry.relative_path);
  const candidateReal = await realpath(candidate);
  const rel = relative(rootReal, candidateReal);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail(`entry ${entry.label} blocked category=staging_root_escape`);
  }

  const before = await lstat(candidate);
  if (!before.isFile() || before.isSymbolicLink()) fail(`entry ${entry.label} must be a regular non-symlink file`);
  if (before.size > MAX_FILE_BYTES) fail(`entry ${entry.label} exceeds ${MAX_FILE_BYTES} bytes`);

  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
  const fh = await open(candidate, flags);
  try {
    const bound = await fh.stat();
    if (!bound.isFile() || bound.dev !== before.dev || bound.ino !== before.ino) {
      fail(`entry ${entry.label} changed generation before descriptor binding`);
    }
    if (bound.size > MAX_FILE_BYTES) fail(`entry ${entry.label} exceeds ${MAX_FILE_BYTES} bytes`);
    const bytes = await fh.readFile();
    if (bytes.length !== bound.size) fail(`entry ${entry.label} changed size during descriptor read`);
    return bytes;
  } finally {
    await fh.close();
  }
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

async function admit(trialPath, stagingRoot, manifestPath, receiptPath) {
  verifyTrialTool(trialPath);
  const trialRead = await readJsonBounded(trialPath, MAX_JSON_BYTES, 'trial packet');
  scanText(trialRead.text, 'trial_packet');
  validateConstitutionalPacket(trialRead.value);

  const constitutionBytes = await readRegularBounded(CONSTITUTION_PATH, MAX_JSON_BYTES, 'VOID constitution');
  const constitutionText = decodeUtf8(constitutionBytes, 'VOID constitution');
  if (!constitutionText.includes(CONSTITUTION_MARKER)) fail('bound VOID constitution marker is absent');
  if (!constitutionText.includes('**King → Brood Queen → General**')) fail('bound VOID constitution command chain is absent');
  if (!constitutionText.includes('The title **General** does not itself grant autonomous repository writes')) {
    fail('bound VOID constitution General authority boundary is absent');
  }

  const manifestRead = await readJsonBounded(manifestPath, MAX_JSON_BYTES, 'outbound manifest');
  validateManifest(manifestRead.value);
  validatePacketManifestBinding(trialRead.value, manifestRead.value);

  const admitted = [];
  let totalBytes = 0;
  for (const entry of manifestRead.value.entries) {
    const bytes = await readStagedEntry(stagingRoot, entry);
    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) fail(`outbound bundle exceeds ${MAX_TOTAL_BYTES} bytes`);
    const digest = sha256(bytes);
    if (digest !== entry.sha256) fail(`entry ${entry.label} digest mismatch`);
    const text = decodeUtf8(bytes, entry.label);
    scanText(text, entry.label);
    if (entry.media_type === 'application/json') {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        fail(`entry ${entry.label} declared application/json but is invalid JSON`);
      }
      scanJsonKeys(parsed, entry.label);
    }
    admitted.push({
      label: entry.label,
      classification: entry.classification,
      media_type: entry.media_type,
      sha256: digest,
      byte_length: bytes.length,
    });
  }

  admitted.sort((a, b) => a.label.localeCompare(b.label));
  const draftReceipt = {
    marker: RECEIPT_MARKER,
    trial_id: trialRead.value.trial_id,
    constitution: {
      path: CONSTITUTION_PATH,
      marker: CONSTITUTION_MARKER,
      sha256: sha256(constitutionBytes),
    },
    entries: admitted,
    secret_scan_policy: 'apollyon-secret-sanitization-v1',
    constitutional_admission: true,
    public_or_sanitized_inputs_only: true,
    contestant_executes_outside_void_core: true,
    secret_values_present: false,
    local_paths_disclosed: false,
    payload_bytes_embedded: false,
    created_at_utc: manifestRead.value.created_at_utc,
    nonce: manifestRead.value.nonce,
  };
  const admissionId = `voidaa1_${sha256(Buffer.from(canonicalJson(draftReceipt), 'utf8'))}`;
  const receipt = { ...draftReceipt, admission_id: admissionId };
  await writeExclusive0600(receiptPath, receipt);
  process.stdout.write(`VOID_APOLLYON_SECRET_SANITIZATION_CONSTITUTIONAL_ADMISSION_V1_GREEN ${admissionId}\n`);
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (command === 'admit' && args.length === 4) {
    return admit(args[0], args[1], args[2], args[3]);
  }
  process.stderr.write('usage: apollyon_secret_sanitization_constitutional_admission_v1.mjs admit <trial-packet.json> <staging-root> <manifest.json> <receipt.json>\n');
  process.exitCode = 64;
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
