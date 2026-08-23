#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { lstat, mkdtemp, open, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MARKER = 'VOID_APOLLYON_OUTBOUND_ADMISSION_MANIFEST_V1';
const RECEIPT_MARKER = 'VOID_APOLLYON_OUTBOUND_ADMISSION_RECEIPT_V1';
const TRIAL_TOOL = 'scripts/apollyon_trial_packet_v1.mjs';
const CONSTITUTION_PATH = 'docs/governance/void-crown-brood-queen-command-layer-v1.md';
const CONSTITUTION_MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
const MAX_JSON_BYTES = 256 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_ENTRIES = 64;

// Linux O_TMPFILE is __O_TMPFILE | O_DIRECTORY. Match the reviewed
// provider-neutral packet publisher primitive already merged in #1391.
const LINUX_O_TMPFILE = 0o20000000 | fsConstants.O_DIRECTORY;
const LINK_HELPER = '/usr/bin/ln';
const LINK_HELPER_TIMEOUT_MS = 5_000;
const LINK_HELPER_MAX_STDERR_BYTES = 8 * 1024;

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
  ['private_local_path', /(?:^|[\s"'=])\/(?:home\/[^/\s]+\/(?:\.ssh|\.gnupg|\.aws|\.kube|\.docker|\.config)\/|root\/(?:\.ssh|\.gnupg|\.aws|\.kube|\.docker|\.config)\/|run\/user\/\d+\/)/i],
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

function stamp(stat) {
  return {
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    size: stat.size.toString(),
    mtimeNs: stat.mtimeNs.toString(),
    ctimeNs: stat.ctimeNs.toString(),
  };
}

function sameStamp(a, b) {
  return a.dev === b.dev
    && a.ino === b.ino
    && a.size === b.size
    && a.mtimeNs === b.mtimeNs
    && a.ctimeNs === b.ctimeNs;
}

function sameFileIdentity(a, b) {
  return a.dev.toString() === b.dev.toString() && a.ino.toString() === b.ino.toString();
}

async function invokeFaultHook(hook, phase, context) {
  if (typeof hook === 'function') await hook(phase, context);
}

async function readPinnedBounded(fh, preStamp, maxBytes, name, path, options = {}) {
  await invokeFaultHook(options.faultHook, 'after_bound_stat', {
    fh, name, path, maxBytes, preStamp,
  });

  const chunks = [];
  let total = 0;
  let position = 0;
  while (true) {
    const remaining = maxBytes + 1 - total;
    if (remaining <= 0) fail(`${name} exceeds ${maxBytes} bytes during bounded read`);
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, remaining));
    const { bytesRead } = await fh.read(buffer, 0, buffer.length, position);
    if (bytesRead === 0) break;
    chunks.push(buffer.subarray(0, bytesRead));
    total += bytesRead;
    position += bytesRead;
    if (typeof options.observeRetained === 'function') {
      options.observeRetained({ name, total, maxBytes });
    }
    if (total > maxBytes) fail(`${name} exceeds ${maxBytes} bytes during bounded read`);
  }

  const postStamp = stamp(await fh.stat({ bigint: true }));
  if (!sameStamp(preStamp, postStamp)) fail(`${name} generation changed during bounded read`);
  return Buffer.concat(chunks, total);
}

async function readRegularBounded(path, maxBytes, name, options = {}) {
  const flags = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW;
  const fh = await open(path, flags);
  try {
    const st = await fh.stat({ bigint: true });
    if (!st.isFile()) fail(`${name} must be a regular non-symlink file`);
    if (st.size > BigInt(maxBytes)) fail(`${name} exceeds ${maxBytes} bytes`);
    return await readPinnedBounded(fh, stamp(st), maxBytes, name, path, options);
  } finally {
    await fh.close().catch(() => {});
  }
}

async function readJsonBounded(path, maxBytes, name, options = {}) {
  const data = await readRegularBounded(path, maxBytes, name, options);
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

async function verifyActiveTrialExactBytes(
  trialBytes,
  admissionAtUtc,
  expectedTrialId,
  options = {},
) {
  const scratch = await mkdtemp(join(tmpdir(), 'void-apollyon-active-trial-v1-'));
  const exactPath = join(scratch, 'trial-packet.json');
  try {
    await writeFile(exactPath, trialBytes, { flag: 'wx', mode: 0o600 });
    const r = spawnSync(process.execPath, [TRIAL_TOOL, 'admit', exactPath, admissionAtUtc], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
      env: { PATH: process.env.PATH ?? '' },
    });
    if (r.error) fail(`trial active-admission spawn failed: ${r.error.message}`);
    const expectedMarker = `VOID_APOLLYON_TRIAL_PACKET_V1_ADMISSION_GREEN ${expectedTrialId} at=${admissionAtUtc}`;
    if (r.status !== 0 || !r.stdout.includes(expectedMarker)) {
      fail('trial packet failed active provider-neutral admission');
    }
    await invokeFaultHook(options.faultHook, 'after_parent_active_admission', {
      exactPath,
      expectedTrialId,
      admissionAtUtc,
    });
  } finally {
    await rm(scratch, { recursive: true, force: true });
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

async function readStagedEntry(rootPath, entry, maxBytes, options = {}) {
  await assertNoSymlinkComponents(rootPath, entry.relative_path);
  const rootReal = await realpath(rootPath);
  const candidate = resolve(rootPath, entry.relative_path);
  const candidateReal = await realpath(candidate);
  const rel = relative(rootReal, candidateReal);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail(`entry ${entry.label} blocked category=staging_root_escape`);
  }

  const flags = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW;
  const fh = await open(candidate, flags);
  try {
    const bound = await fh.stat({ bigint: true });
    if (!bound.isFile()) fail(`entry ${entry.label} must be a regular non-symlink file`);
    if (bound.size > BigInt(maxBytes)) fail(`entry ${entry.label} exceeds ${maxBytes} bytes`);
    return await readPinnedBounded(
      fh,
      stamp(bound),
      maxBytes,
      `entry ${entry.label}`,
      candidate,
      options,
    );
  } finally {
    await fh.close().catch(() => {});
  }
}

function parentFdPath(parentHandle) {
  return `/proc/self/fd/${parentHandle.fd}`;
}

function childPath(parentHandle, leaf) {
  if (typeof leaf !== 'string' || leaf.length === 0 || leaf.includes('/') || leaf === '.' || leaf === '..') {
    fail('receipt output must name one final file');
  }
  return `${parentFdPath(parentHandle)}/${leaf}`;
}

function runExactFdLinkHelper(stageHandle, parentHandle, leaf) {
  return spawnSync(
    LINK_HELPER,
    ['-L', '-T', '--', '/proc/self/fd/3', `/proc/self/fd/4/${leaf}`],
    {
      stdio: ['ignore', 'ignore', 'pipe', stageHandle.fd, parentHandle.fd],
      timeout: LINK_HELPER_TIMEOUT_MS,
      maxBuffer: LINK_HELPER_MAX_STDERR_BYTES,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '' },
    },
  );
}

function linkHelperFailure(result) {
  if (result.error) return `receipt exact-fd link helper failed: ${result.error.code ?? result.error.message}`;
  return `receipt exact-fd link helper failed status=${result.status}`;
}

async function readExactReceiptFinal(parentHandle, leaf, expectedBytes) {
  const fh = await open(childPath(parentHandle, leaf), fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const pre = await fh.stat({ bigint: true });
    if (!pre.isFile()) fail('receipt final must be a regular file');
    if ((Number(pre.mode) & 0o777) !== 0o600) fail('receipt final mode must be 0600');
    if (pre.size !== BigInt(expectedBytes.length)) fail('receipt final byte length conflict');
    const bytes = await readPinnedBounded(
      fh,
      stamp(pre),
      expectedBytes.length,
      'admission receipt final',
      childPath(parentHandle, leaf),
    );
    if (!bytes.equals(expectedBytes)) fail('receipt final bytes conflict');
    await fh.sync();
    const post = await fh.stat({ bigint: true });
    return { stat: post };
  } finally {
    await fh.close().catch(() => {});
  }
}

async function exactExistingReceiptOrNull(parentHandle, leaf, expectedBytes) {
  try {
    return await readExactReceiptFinal(parentHandle, leaf, expectedBytes);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function publishReceiptExact(receiptPath, value, options = {}) {
  const absolute = resolve(receiptPath);
  const parentPath = dirname(absolute);
  const leaf = basename(absolute);
  const expectedBytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

  const parentHandle = await open(
    parentPath,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
  );
  let stageHandle = null;
  try {
    const parentStat = await parentHandle.stat({ bigint: true });
    if (!parentStat.isDirectory()) fail('receipt parent must be a real directory');

    const preexisting = await exactExistingReceiptOrNull(parentHandle, leaf, expectedBytes);
    if (preexisting) {
      await parentHandle.sync();
      const durable = await readExactReceiptFinal(parentHandle, leaf, expectedBytes);
      if (!sameFileIdentity(preexisting.stat, durable.stat)) {
        fail('receipt final generation changed during exact retry durability boundary');
      }
      return { created: false, exact_retry: true };
    }

    try {
      stageHandle = await open(
        parentFdPath(parentHandle),
        LINUX_O_TMPFILE | fsConstants.O_RDWR,
        0o600,
      );
    } catch (error) {
      fail(`anonymous receipt staging unavailable: ${error?.code ?? 'unknown_error'}`);
    }

    const stageCreated = await stageHandle.stat({ bigint: true });
    if (!stageCreated.isFile() || (Number(stageCreated.mode) & 0o777) !== 0o600) {
      fail('anonymous receipt stage must be a private regular file');
    }

    await invokeFaultHook(options.faultHook, 'after_stage_create', {
      stageHandle, parentHandle, leaf, expectedBytes,
    });

    await stageHandle.writeFile(expectedBytes);
    await invokeFaultHook(options.faultHook, 'after_stage_write', {
      stageHandle, parentHandle, leaf, expectedBytes,
    });

    await stageHandle.sync();
    const stageStat = await stageHandle.stat({ bigint: true });
    if (stageStat.size !== BigInt(expectedBytes.length)) fail('receipt stage byte length drift');
    await invokeFaultHook(options.faultHook, 'after_stage_sync', {
      stageHandle, parentHandle, leaf, expectedBytes,
    });

    const linkResult = runExactFdLinkHelper(stageHandle, parentHandle, leaf);
    let finalBeforeSync;
    let created = linkResult.status === 0 && !linkResult.error;

    if (created) {
      await invokeFaultHook(options.faultHook, 'after_final_link', {
        stageHandle, parentHandle, leaf, expectedBytes,
      });
      finalBeforeSync = await readExactReceiptFinal(parentHandle, leaf, expectedBytes);
      if (!sameFileIdentity(stageStat, finalBeforeSync.stat)) {
        fail('new receipt final is not the exact staged inode');
      }
    } else {
      try {
        finalBeforeSync = await readExactReceiptFinal(parentHandle, leaf, expectedBytes);
        created = false;
      } catch {
        fail(linkHelperFailure(linkResult));
      }
    }

    await invokeFaultHook(options.faultHook, 'before_parent_sync', {
      stageHandle, parentHandle, leaf, expectedBytes,
    });

    await parentHandle.sync();
    const durable = await readExactReceiptFinal(parentHandle, leaf, expectedBytes);
    if (!sameFileIdentity(finalBeforeSync.stat, durable.stat)) {
      fail('receipt final generation changed before durable parent sync');
    }

    try {
      await invokeFaultHook(options.faultHook, 'after_parent_sync_commit', {
        stageHandle, parentHandle, leaf, expectedBytes,
      });
    } catch {
      const recovered = await readExactReceiptFinal(parentHandle, leaf, expectedBytes);
      if (!sameFileIdentity(durable.stat, recovered.stat)) {
        fail('post-commit receipt observer recovery saw foreign generation');
      }
      return { created, recovered_post_commit_observer_failure: true };
    }

    return { created, exact_retry: false };
  } finally {
    if (stageHandle) await stageHandle.close().catch(() => {});
    await parentHandle.close().catch(() => {});
  }
}

export async function admit(
  trialPath,
  stagingRoot,
  manifestPath,
  receiptPath,
  admissionAtUtc,
  options = {},
) {
  const trialRead = await readJsonBounded(
    trialPath,
    MAX_JSON_BYTES,
    'trial packet',
    {
      faultHook: options.trialReadFaultHook,
      observeRetained: options.observeRetained,
    },
  );
  scanText(trialRead.text, 'trial_packet');
  validateConstitutionalPacket(trialRead.value);

  await verifyActiveTrialExactBytes(
    trialRead.bytes,
    admissionAtUtc,
    trialRead.value.trial_id,
    { faultHook: options.trialVerificationFaultHook },
  );

  const constitutionBytes = await readRegularBounded(
    CONSTITUTION_PATH,
    MAX_JSON_BYTES,
    'VOID constitution',
    {
      faultHook: options.constitutionReadFaultHook,
      observeRetained: options.observeRetained,
    },
  );
  const constitutionText = decodeUtf8(constitutionBytes, 'VOID constitution');
  if (!constitutionText.includes(CONSTITUTION_MARKER)) fail('bound VOID constitution marker is absent');
  if (!constitutionText.includes('**King → Brood Queen → General**')) fail('bound VOID constitution command chain is absent');
  if (!constitutionText.includes('The title **General** does not itself grant autonomous repository writes')) {
    fail('bound VOID constitution General authority boundary is absent');
  }
  if (sha256(constitutionBytes) !== trialRead.value.constitution_sha256) {
    fail('trial packet constitution digest no longer matches exact admission constitution bytes');
  }

  const manifestRead = await readJsonBounded(
    manifestPath,
    MAX_JSON_BYTES,
    'outbound manifest',
    {
      faultHook: options.manifestReadFaultHook,
      observeRetained: options.observeRetained,
    },
  );
  validateManifest(manifestRead.value);
  validatePacketManifestBinding(trialRead.value, manifestRead.value);

  const admitted = [];
  let totalBytes = 0;
  for (const entry of manifestRead.value.entries) {
    const remainingBundle = MAX_TOTAL_BYTES - totalBytes;
    if (remainingBundle <= 0) fail(`outbound bundle exceeds ${MAX_TOTAL_BYTES} bytes`);
    const maxEntryBytes = Math.min(MAX_FILE_BYTES, remainingBundle);
    const bytes = await readStagedEntry(
      stagingRoot,
      entry,
      maxEntryBytes,
      {
        faultHook: options.stagedReadFaultHook,
        observeRetained: options.observeRetained,
      },
    );
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
    admission_at_utc: admissionAtUtc,
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
  await publishReceiptExact(receiptPath, receipt, { faultHook: options.receiptFaultHook });

  if (options.emitOutput !== false) {
    process.stdout.write(`VOID_APOLLYON_SECRET_SANITIZATION_CONSTITUTIONAL_ADMISSION_V1_GREEN ${admissionId}\n`);
  }
  return receipt;
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (command === 'admit' && args.length === 5) {
    return admit(args[0], args[1], args[2], args[3], args[4]);
  }
  process.stderr.write(
    'usage: apollyon_secret_sanitization_constitutional_admission_v1.mjs '
    + 'admit <trial-packet.json> <staging-root> <manifest.json> <receipt.json> <admission-at-utc>\n',
  );
  process.exitCode = 64;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
    process.exitCode = 2;
  });
}
