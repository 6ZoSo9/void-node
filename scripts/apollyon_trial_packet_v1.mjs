#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { constants as FS } from 'node:fs';
import { open } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const MARKER = 'VOID_APOLLYON_TRIAL_PACKET_V1';
const ID_PREFIX = 'voidat1_';
export const MAX_INPUT_BYTES = 256 * 1024;
const MAX_CONSTITUTION_BYTES = 512 * 1024;
const CONSTITUTION_PATH = 'docs/governance/void-crown-brood-queen-command-layer-v1.md';
const CONSTITUTION_MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
export const CONSTITUTION_GIT_BLOB_SHA1 = '732536c0e22ba7ea417be61be7e1f9942bba6d74';
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
const SCORE_KEYS = [
  'correctness', 'evidence_verifiability', 'security_constraint_obedience',
  'hallucination_resistance', 'efficiency', 'reproducibility',
];

// Linux O_TMPFILE is __O_TMPFILE | O_DIRECTORY. Node 22/24/26 do not expose
// fs.constants.O_TMPFILE, so the reviewed Linux value is explicit here.
const LINUX_O_TMPFILE = 0o20000000 | FS.O_DIRECTORY;
const LINK_HELPER = '/usr/bin/ln';
const LINK_HELPER_TIMEOUT_MS = 5_000;
const LINK_HELPER_MAX_STDERR_BYTES = 8 * 1024;

function fail(message) { throw new Error(message); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function gitBlobSha1Utf8(value) {
  const bytes = Buffer.from(value, 'utf8');
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
export function assertReviewedConstitutionText(value) {
  if (typeof value !== 'string') fail('constitution must be UTF-8 text');
  const blobSha = gitBlobSha1Utf8(value);
  if (blobSha !== CONSTITUTION_GIT_BLOB_SHA1) {
    fail(`constitution content does not match reviewed immutable Git blob ${CONSTITUTION_GIT_BLOB_SHA1}`);
  }
  if (!value.includes(CONSTITUTION_MARKER)) fail('reviewed constitution marker is absent');
  return sha256(value);
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
function canonicalJson(value) { return JSON.stringify(canonicalize(value)); }
function assertString(value, name, min = 1, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'string' || value.length < min || value.length > max) fail(`${name} must be a string length ${min}..${max}`);
}
function assertBool(value, expected, name) { if (value !== expected) fail(`${name} must be ${expected}`); }
function assertInt(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) fail(`${name} must be an integer ${min}..${max}`);
}
function assertStringArray(value, name, minItems, maxItems, maxLen) {
  if (!Array.isArray(value) || value.length < minItems || value.length > maxItems) fail(`${name} item count out of bounds`);
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
  try { parsed = new URL(uri); } catch { fail(`${name} must be an absolute URI`); }
  if (!['https:', 'void:'].includes(parsed.protocol)) fail(`${name} scheme must be https or void`);
  if (parsed.username || parsed.password) fail(`${name} must not contain URI credentials`);
  if (parsed.hash) fail(`${name} must not contain a fragment`);
}
function parseCanonicalUtc(value, name) {
  assertString(value, name, 24, 24);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) fail(`${name} must use canonical UTC milliseconds`);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail(`${name} is not canonical UTC`);
  return ms;
}

function stamp(stat) {
  return {
    dev: stat.dev.toString(), ino: stat.ino.toString(), size: stat.size.toString(),
    mtimeNs: stat.mtimeNs.toString(), ctimeNs: stat.ctimeNs.toString(),
  };
}
function sameStamp(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.size === b.size
    && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
}
function sameFileIdentity(a, b) {
  return a.dev === b.dev && a.ino === b.ino;
}

export async function openPinnedRegular(path, maxBytes = MAX_INPUT_BYTES) {
  let fh;
  try {
    fh = await open(path, FS.O_RDONLY | FS.O_NOFOLLOW);
    const stat = await fh.stat({ bigint: true });
    if (!stat.isFile()) fail(`${path} must be a regular file`);
    if (stat.size > BigInt(maxBytes)) fail(`${path} exceeds ${maxBytes} bytes`);
    return { fh, preStamp: stamp(stat) };
  } catch (error) {
    if (fh) await fh.close().catch(() => {});
    throw error;
  }
}

export async function readPinnedText(fh, preStamp, maxBytes = MAX_INPUT_BYTES) {
  const chunks = [];
  let total = 0;
  let position = 0;
  while (true) {
    const remaining = maxBytes + 1 - total;
    if (remaining <= 0) fail(`input exceeds ${maxBytes} bytes during read`);
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, remaining));
    const { bytesRead } = await fh.read(buffer, 0, buffer.length, position);
    if (bytesRead === 0) break;
    chunks.push(buffer.subarray(0, bytesRead));
    total += bytesRead;
    position += bytesRead;
    if (total > maxBytes) fail(`input exceeds ${maxBytes} bytes during read`);
  }
  const postStamp = stamp(await fh.stat({ bigint: true }));
  if (!sameStamp(preStamp, postStamp)) fail('file generation changed during bounded read');
  const bytes = Buffer.concat(chunks, total);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { fail('input must be valid UTF-8'); }
}

export async function readRegularText(path, maxBytes = MAX_INPUT_BYTES) {
  const { fh, preStamp } = await openPinnedRegular(path, maxBytes);
  try { return await readPinnedText(fh, preStamp, maxBytes); }
  finally { await fh.close(); }
}

export async function readRegularJson(path, maxBytes = MAX_INPUT_BYTES) {
  const text = await readRegularText(path, maxBytes);
  try { return JSON.parse(text); } catch { fail(`${path} must contain valid JSON`); }
}

async function currentConstitutionSha256() {
  return assertReviewedConstitutionText(await readRegularText(CONSTITUTION_PATH, MAX_CONSTITUTION_BYTES));
}

function validate(packet, { requireId, requireConstitutionSha }) {
  if (!isPlainObject(packet)) fail('packet must be an object');
  if (packet.marker !== MARKER) fail(`marker must equal ${MARKER}`);
  if (requireId) {
    if (typeof packet.trial_id !== 'string' || !/^voidat1_[0-9a-f]{64}$/.test(packet.trial_id)) fail('trial_id is invalid');
  } else if ('trial_id' in packet) fail('draft must not contain trial_id');

  if (requireConstitutionSha) {
    if (typeof packet.constitution_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(packet.constitution_sha256)) fail('constitution_sha256 is invalid');
  } else if ('constitution_sha256' in packet) {
    fail('draft must not contain constitution_sha256; the materializer binds it');
  }

  assertString(packet.title, 'title', 1, 160);
  if (!['analysis', 'code_review', 'data_verification', 'reasoning', 'security_review', 'planning', 'other'].includes(packet.category)) fail('category is invalid');
  assertString(packet.instructions, 'instructions', 1, 32768);
  if (!Array.isArray(packet.input_refs) || packet.input_refs.length < 1 || packet.input_refs.length > 64) fail('input_refs item count out of bounds');
  for (const [i, ref] of packet.input_refs.entries()) {
    if (!isPlainObject(ref)) fail(`input_refs[${i}] must be an object`);
    if (!/^[A-Za-z0-9._-]{1,96}$/.test(ref.label ?? '')) fail(`input_refs[${i}].label is invalid`);
    assertSafeRefUri(ref.uri, `input_refs[${i}].uri`);
    if (typeof ref.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(ref.sha256)) fail(`input_refs[${i}].sha256 is invalid`);
    if (Object.keys(ref).sort().join(',') !== 'label,sha256,uri') fail(`input_refs[${i}] has unexpected fields`);
  }
  assertStringArray(packet.expected_outputs, 'expected_outputs', 1, 32, 96);
  for (const output of packet.expected_outputs) if (!/^[A-Za-z0-9._-]{1,96}$/.test(output)) fail('expected_outputs values must be logical labels');
  assertStringArray(packet.evidence_requirements, 'evidence_requirements', 1, 32, 512);
  assertStringArray(packet.forbidden_actions, 'forbidden_actions', REQUIRED_FORBIDDEN_ACTIONS.length, 32, 256);
  for (const item of REQUIRED_FORBIDDEN_ACTIONS) if (!packet.forbidden_actions.includes(item)) fail(`forbidden_actions missing ${item}`);
  if (!isPlainObject(packet.scoring_weights)) fail('scoring_weights must be an object');
  if (Object.keys(packet.scoring_weights).sort().join(',') !== [...SCORE_KEYS].sort().join(',')) fail('scoring_weights has unexpected keys');
  let total = 0;
  for (const key of SCORE_KEYS) { assertInt(packet.scoring_weights[key], `scoring_weights.${key}`, 0, 100); total += packet.scoring_weights[key]; }
  if (total !== 100) fail(`scoring_weights must total 100, got ${total}`);
  assertStringArray(packet.hard_disqualifiers, 'hard_disqualifiers', REQUIRED_DISQUALIFIERS.length, 32, 256);
  for (const item of REQUIRED_DISQUALIFIERS) if (!packet.hard_disqualifiers.includes(item)) fail(`hard_disqualifiers missing ${item}`);
  assertInt(packet.max_wc_reward, 'max_wc_reward', 0, 1_000_000_000);
  if (packet.wc_award_basis !== 'verified_useful_work_only') fail('wc_award_basis is invalid');
  assertBool(packet.provider_cost_reimbursement, false, 'provider_cost_reimbursement');
  assertBool(packet.candidate_executes_outside_void_core, true, 'candidate_executes_outside_void_core');
  assertBool(packet.public_or_sanitized_inputs_only, true, 'public_or_sanitized_inputs_only');
  if (packet.constitution_path !== CONSTITUTION_PATH) fail(`constitution_path must equal ${CONSTITUTION_PATH}`);
  if (packet.constitution_marker !== CONSTITUTION_MARKER) fail(`constitution_marker must equal ${CONSTITUTION_MARKER}`);
  assertBool(packet.constitutional_obedience_required, true, 'constitutional_obedience_required');
  assertBool(packet.secret_nonacquisition_required, true, 'secret_nonacquisition_required');
  assertBool(packet.secret_nondisclosure_required, true, 'secret_nondisclosure_required');
  assertBool(packet.authority_expansion_forbidden, true, 'authority_expansion_forbidden');
  assertBool(packet.constitutional_ambiguity_requires_review, true, 'constitutional_ambiguity_requires_review');
  const created = parseCanonicalUtc(packet.created_at_utc, 'created_at_utc');
  const expires = parseCanonicalUtc(packet.expires_at_utc, 'expires_at_utc');
  if (expires <= created) fail('expires_at_utc must be later than created_at_utc');
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(packet.nonce ?? '')) fail('nonce is invalid');

  const allowed = new Set([
    'marker', 'trial_id', 'title', 'category', 'instructions', 'input_refs', 'expected_outputs',
    'evidence_requirements', 'forbidden_actions', 'scoring_weights', 'hard_disqualifiers',
    'max_wc_reward', 'wc_award_basis', 'provider_cost_reimbursement',
    'candidate_executes_outside_void_core', 'public_or_sanitized_inputs_only',
    'constitution_path', 'constitution_marker', 'constitution_sha256', 'constitutional_obedience_required',
    'secret_nonacquisition_required', 'secret_nondisclosure_required', 'authority_expansion_forbidden',
    'constitutional_ambiguity_requires_review', 'created_at_utc', 'expires_at_utc', 'nonce',
  ]);
  for (const key of Object.keys(packet)) if (!allowed.has(key)) fail(`unexpected packet field: ${key}`);
}

function deriveId(draft) {
  return `${ID_PREFIX}${sha256(canonicalJson(draft))}`;
}

function packetBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parentFdPath(parentHandle) {
  return `/proc/self/fd/${parentHandle.fd}`;
}

function childPath(parentHandle, leaf) {
  if (typeof leaf !== 'string' || leaf.length === 0 || leaf.includes('/') || leaf === '.' || leaf === '..') {
    fail('output path must name one final file');
  }
  return `${parentFdPath(parentHandle)}/${leaf}`;
}

async function readExactPublishedFile(parentHandle, leaf, expectedBytes) {
  let fh;
  let synced = false;
  let primaryError = null;
  try {
    fh = await open(childPath(parentHandle, leaf), FS.O_RDONLY | FS.O_NOFOLLOW);
    const pre = await fh.stat({ bigint: true });
    if (!pre.isFile()) fail('output path occupied by non-regular generation');
    if ((Number(pre.mode) & 0o777) !== 0o600) fail('output path occupied by non-private generation');
    if (pre.size !== BigInt(expectedBytes.length)) fail('output path occupied by conflicting generation');
    const actual = Buffer.alloc(expectedBytes.length);
    let position = 0;
    while (position < actual.length) {
      const { bytesRead } = await fh.read(actual, position, actual.length - position, position);
      if (bytesRead === 0) fail('output path contains a short conflicting generation');
      position += bytesRead;
    }
    const extra = Buffer.alloc(1);
    const { bytesRead: extraRead } = await fh.read(extra, 0, 1, position);
    if (extraRead !== 0) fail('output path occupied by oversized conflicting generation');
    const post = await fh.stat({ bigint: true });
    if (!sameStamp(stamp(pre), stamp(post))) fail('output generation changed during exact retry read');
    if (!actual.equals(expectedBytes)) fail('output path occupied by conflicting generation');
    await fh.sync();
    synced = true;
    return { stat: post, bytes: actual };
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (fh) {
      try { await fh.close(); }
      catch (error) {
        if (!primaryError && !synced) throw error;
      }
    }
  }
}

async function invokeFaultHook(hook, point, detail = {}) {
  if (typeof hook === 'function') await hook(point, detail);
}

async function openAnonymousTrialStage(parentHandle) {
  if (process.platform !== 'linux') {
    fail('trial packet publication requires Linux O_TMPFILE/procfs support');
  }
  try {
    return await open(parentFdPath(parentHandle), LINUX_O_TMPFILE | FS.O_RDWR, 0o600);
  } catch (error) {
    fail(`anonymous trial packet staging unavailable: ${error?.code ?? 'unknown_error'}`);
  }
}

function runExactFdLinkHelper(stageHandle, parentHandle, leaf) {
  const result = spawnSync(
    LINK_HELPER,
    ['-L', '-T', '--', '/proc/self/fd/3', `/proc/self/fd/4/${leaf}`],
    {
      stdio: ['ignore', 'ignore', 'pipe', stageHandle.fd, parentHandle.fd],
      timeout: LINK_HELPER_TIMEOUT_MS,
      maxBuffer: LINK_HELPER_MAX_STDERR_BYTES,
      encoding: 'utf8',
      windowsHide: true,
    },
  );
  return {
    status: result.status,
    signal: result.signal,
    error: result.error ?? null,
    stderr: String(result.stderr ?? '').slice(0, LINK_HELPER_MAX_STDERR_BYTES),
  };
}

function linkHelperFailure(result) {
  if (result.error) {
    const code = result.error?.code ?? 'unknown_error';
    return `exact-fd link helper failed: ${code}`;
  }
  const signal = result.signal ?? 'none';
  const stderr = result.stderr.trim();
  return `exact-fd link helper failed: status=${String(result.status)} signal=${signal}${stderr ? ` stderr=${stderr}` : ''}`;
}

export async function publishTrialPacketV1(path, value, options = {}) {
  const expectedBytes = packetBytes(value);
  const absolute = resolve(path);
  const leaf = basename(absolute);
  const parentPath = dirname(absolute);

  let parentHandle;
  let stageHandle;
  let committed = false;
  let primaryError = null;
  let result = null;
  let closeError = null;

  try {
    parentHandle = await open(parentPath, FS.O_RDONLY | FS.O_DIRECTORY | FS.O_NOFOLLOW);
    const parentStat = await parentHandle.stat({ bigint: true });
    if (!parentStat.isDirectory()) fail('output parent must be a directory');

    let existingSatisfied = false;
    try {
      const beforeSync = await readExactPublishedFile(parentHandle, leaf, expectedBytes);
      await parentHandle.sync();
      const afterSync = await readExactPublishedFile(parentHandle, leaf, expectedBytes);
      if (!sameStamp(stamp(beforeSync.stat), stamp(afterSync.stat))) {
        fail('existing output generation changed across parent durability commit');
      }
      committed = true;
      try {
        await invokeFaultHook(options.afterCommitHook, 'after_parent_directory_sync', { reusedExisting: true });
      } catch {
        // The exact content-addressed packet and parent directory are already durable.
      }
      result = { reused_existing: true, linked_new_final: false };
      existingSatisfied = true;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }

    if (!existingSatisfied) {
      stageHandle = await openAnonymousTrialStage(parentHandle);
      await invokeFaultHook(options.faultHook, 'after_stage_create', {
        stageHandle, stageLeaf: null, parentHandle, finalLeaf: leaf, expectedBytes,
      });
      await stageHandle.writeFile(expectedBytes);
      await invokeFaultHook(options.faultHook, 'after_stage_write', {
        stageHandle, stageLeaf: null, parentHandle, finalLeaf: leaf, expectedBytes,
      });
      await invokeFaultHook(options.faultHook, 'before_stage_sync', {
        stageHandle, stageLeaf: null, parentHandle, finalLeaf: leaf, expectedBytes,
      });
      await stageHandle.sync();
      const stageStat = await stageHandle.stat({ bigint: true });
      if (!stageStat.isFile() || (Number(stageStat.mode) & 0o777) !== 0o600) {
        fail('anonymous staged packet generation is not an exact private regular file');
      }
      await invokeFaultHook(options.faultHook, 'after_stage_sync', {
        stageHandle, stageLeaf: null, parentHandle, finalLeaf: leaf, expectedBytes,
      });

      const linkResult = runExactFdLinkHelper(stageHandle, parentHandle, leaf);
      let final;
      try {
        final = await readExactPublishedFile(parentHandle, leaf, expectedBytes);
      } catch (error) {
        if (linkResult.error || linkResult.status !== 0) fail(linkHelperFailure(linkResult));
        throw error;
      }

      const linkedNewFinal = sameFileIdentity(final.stat, stageStat);
      if (linkResult.status === 0 && !linkedNewFinal) {
        fail('exact-fd link helper reported success without publishing the exact staged generation');
      }

      await invokeFaultHook(options.faultHook, 'after_final_link', {
        stageHandle, stageLeaf: null, parentHandle, finalLeaf: leaf, expectedBytes,
        linkedNewFinal, finalStat: final.stat,
      });
      await invokeFaultHook(options.faultHook, 'before_parent_sync', {
        stageHandle, stageLeaf: null, parentHandle, finalLeaf: leaf, expectedBytes,
        linkedNewFinal, finalStat: final.stat,
      });
      await parentHandle.sync();

      const afterSync = await readExactPublishedFile(parentHandle, leaf, expectedBytes);
      if (!sameStamp(stamp(final.stat), stamp(afterSync.stat))) {
        fail('published final generation changed across parent durability commit');
      }
      if (linkedNewFinal && !sameFileIdentity(afterSync.stat, stageStat)) {
        fail('post-sync final generation does not match exact staged generation');
      }

      committed = true;
      try {
        await invokeFaultHook(options.afterCommitHook, 'after_parent_directory_sync', {
          reusedExisting: !linkedNewFinal,
        });
      } catch {
        // Post-commit observer/reporting failure cannot downgrade durable exact packet truth.
      }

      result = { reused_existing: !linkedNewFinal, linked_new_final: linkedNewFinal };
    }
  } catch (error) {
    primaryError = error;
  }

  if (stageHandle) {
    try { await stageHandle.close(); }
    catch (error) { if (!committed && !primaryError && !closeError) closeError = error; }
  }
  if (parentHandle) {
    try { await parentHandle.close(); }
    catch (error) { if (!committed && !primaryError && !closeError) closeError = error; }
  }

  if (primaryError) throw primaryError;
  if (closeError) throw closeError;
  return result;
}

async function materialize(inputPath, outputPath) {
  const inputDraft = await readRegularJson(inputPath);
  validate(inputDraft, { requireId: false, requireConstitutionSha: false });
  const boundDraft = { ...inputDraft, constitution_sha256: await currentConstitutionSha256() };
  validate(boundDraft, { requireId: false, requireConstitutionSha: true });
  const packet = { ...boundDraft, trial_id: deriveId(boundDraft) };
  validate(packet, { requireId: true, requireConstitutionSha: true });
  await publishTrialPacketV1(outputPath, packet);
  process.stdout.write(`${packet.trial_id}\n`);
}

async function verifiedPacket(inputPath) {
  const packet = await readRegularJson(inputPath);
  validate(packet, { requireId: true, requireConstitutionSha: true });
  const { trial_id: claimed, ...draft } = packet;
  const expected = deriveId(draft);
  if (claimed !== expected) fail(`trial_id mismatch: expected ${expected}`);
  const currentConstitution = await currentConstitutionSha256();
  if (packet.constitution_sha256 !== currentConstitution) fail('constitution generation does not match packet binding');
  return packet;
}

async function verify(inputPath) {
  const packet = await verifiedPacket(inputPath);
  process.stdout.write(`${MARKER}_VERIFY_GREEN ${packet.trial_id}\n`);
}

async function admit(inputPath, atUtc) {
  const packet = await verifiedPacket(inputPath);
  const at = parseCanonicalUtc(atUtc, 'admission_at_utc');
  const created = parseCanonicalUtc(packet.created_at_utc, 'created_at_utc');
  const expires = parseCanonicalUtc(packet.expires_at_utc, 'expires_at_utc');
  if (at < created) fail('trial packet is not active yet');
  if (at >= expires) fail('trial packet is expired');
  process.stdout.write(`${MARKER}_ADMISSION_GREEN ${packet.trial_id} at=${atUtc}\n`);
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (command === 'materialize' && args.length === 2) return materialize(args[0], args[1]);
  if (command === 'verify' && args.length === 1) return verify(args[0]);
  if (command === 'admit' && args.length === 2) return admit(args[0], args[1]);
  process.stderr.write('usage: apollyon_trial_packet_v1.mjs materialize <draft.json> <packet.json>\n');
  process.stderr.write('       apollyon_trial_packet_v1.mjs verify <packet.json>\n');
  process.stderr.write('       apollyon_trial_packet_v1.mjs admit <packet.json> <at-utc>\n');
  process.exitCode = 64;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
    process.exitCode = 2;
  });
}
