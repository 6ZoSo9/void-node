#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { constants as FS } from 'node:fs';
import { lstat, mkdtemp, open, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { admit as admitSanitizedInputs, publishReceiptExact as publishJsonExactV1 } from './apollyon_secret_sanitization_constitutional_admission_v1.mjs';
import { runBrokerClientV1 } from './apollyon_openrouter_broker_client_v1.mjs';
import { buildOpenRouterBrokerBindingV1 } from './apollyon_openrouter_broker_binding_v1.mjs';
import {
  buildBrokerAdmissionCapabilityV1,
  buildBrokerReplayCapabilityV1,
  readBrokerAdmissionMacCredentialV1,
} from './apollyon_openrouter_broker_admission_capability_v1.mjs';

export const MARKER = 'VOID_APOLLYON_OPENROUTER_CONTESTANT_ADAPTER_V1';
export const RESULT_MARKER = 'VOID_APOLLYON_OPENROUTER_CONTESTANT_RESULT_V1';
export const REGISTRY_MARKER = 'VOID_APOLLYON_OPENROUTER_CONTESTANT_REGISTRY_V1';
export const PROVIDER = 'openrouter';
export const DEFAULT_MODEL = 'stealth/ox-alpha';
export const MODEL = DEFAULT_MODEL;
export const REGISTRY_PATH = 'public/apollyon-openrouter-contestants-v1.json';

const MAX_JSON_BYTES = 256 * 1024;
const MAX_REGISTRY_BYTES = 256 * 1024;
const MAX_ENTRY_BYTES = 1024 * 1024;
const MAX_TOTAL_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_MODEL_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_CHAT_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_ERROR_RESPONSE_BYTES = 64 * 1024;
const DEFAULT_MAX_TOKENS = 8_192;
const MAX_MAX_TOKENS = 32_768;
const DEFAULT_METADATA_TIMEOUT_MS = 15_000;
const DEFAULT_CHAT_TIMEOUT_MS = 180_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 300_000;

const BLOCKED_OUTBOUND_PATTERNS = [
  /-----BEGIN (?:ENCRYPTED |OPENSSH |EC |RSA |DSA |ED25519 )?PRIVATE KEY-----/i,
  /(?:^|\n)\s*Authorization\s*:\s*Bearer\s+\S+/i,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /(?:^|[\s"'=])\/(?:home\/[^/\s]+\/(?:\.ssh|\.gnupg|\.aws|\.kube|\.docker)\/|root\/(?:\.ssh|\.gnupg|\.aws|\.kube|\.docker)\/)/i,
];

const SYSTEM_PROMPT = `You are an untrusted external contestant in a bounded VOID Apollyon trial.
You have no VOID office, authority, credential, wallet, signer, validator, deployment, service-control, or live-mutation capability.
Use only the trial packet and sanitized/public inputs supplied in this request.
Do not request secrets, credentials, private context, local filesystem access, network access, tool execution, or expanded authority.
Do not claim execution, verification, deployment, observation, or evidence that did not occur.
If information is unavailable, state uncertainty instead of fabricating it.
Return analysis and proposed artifacts only. No tool use is available.`;

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('non-finite JSON number is forbidden');
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

function exactKeys(value, expected, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
  const actual = Object.keys(value).sort().join(',');
  const wanted = [...expected].sort().join(',');
  if (actual !== wanted) fail(`${name} has unexpected fields`);
}

function parseBoundedInt(raw, fallback, min, max, name) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const text = String(raw).trim();
  if (!/^[1-9][0-9]*$/.test(text)) fail(`${name} must be an exact positive integer`);
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${name} must be within ${min}..${max}`);
  return value;
}

export function validateContestantRegistryV1(registry) {
  exactKeys(registry, ['marker', 'version', 'reviewed_at_utc', 'default_model', 'contestants'], 'contestant registry');
  if (registry.marker !== REGISTRY_MARKER) fail(`registry marker must equal ${REGISTRY_MARKER}`);
  if (registry.version !== 1) fail('registry version must equal 1');
  if (typeof registry.reviewed_at_utc !== 'string' || !Number.isFinite(Date.parse(registry.reviewed_at_utc))) {
    fail('registry reviewed_at_utc is invalid');
  }
  if (typeof registry.default_model !== 'string' || registry.default_model.length < 3) fail('registry default_model is invalid');
  if (!Array.isArray(registry.contestants) || registry.contestants.length < 1 || registry.contestants.length > 64) {
    fail('registry contestants count is out of bounds');
  }

  const seen = new Set();
  let defaultEntry = null;
  for (const [i, entry] of registry.contestants.entries()) {
    exactKeys(
      entry,
      ['model', 'canonical_slug', 'status', 'scored_trial_eligible', 'zero_price_required', 'min_context_length', 'max_tokens_cap', 'retention_class', 'privacy_class', 'provider_policy'],
      `contestants[${i}]`,
    );
    if (typeof entry.model !== 'string' || !/^[a-z0-9._-]+\/[A-Za-z0-9._:-]+$/.test(entry.model)) {
      fail(`contestants[${i}].model is invalid`);
    }
    if (entry.status === 'quarantined') {
      if (entry.canonical_slug !== null
        && (typeof entry.canonical_slug !== 'string'
          || !/^[a-z0-9._~-]+\/[A-Za-z0-9._~:-]+$/.test(entry.canonical_slug))) {
        fail(`contestants[${i}].canonical_slug is invalid`);
      }
    } else if (typeof entry.canonical_slug !== 'string'
      || !/^[a-z0-9._~-]+\/[A-Za-z0-9._~:-]+$/.test(entry.canonical_slug)) {
      fail(`active contestant ${entry.model} must bind canonical_slug`);
    }
    if (seen.has(entry.model)) fail(`duplicate contestant model ${entry.model}`);
    seen.add(entry.model);
    if (!['qualified', 'qualification_only', 'quarantined'].includes(entry.status)) fail(`contestants[${i}].status is invalid`);
    if (typeof entry.scored_trial_eligible !== 'boolean') fail(`contestants[${i}].scored_trial_eligible must be boolean`);
    if (entry.status !== 'qualified' && entry.scored_trial_eligible !== false) fail(`non-qualified contestant ${entry.model} cannot be scored-trial eligible`);
    if (entry.zero_price_required !== true) fail(`contestant ${entry.model} must require zero pricing`);
    if (!Number.isSafeInteger(entry.min_context_length) || entry.min_context_length < 32_768) fail(`contestant ${entry.model} min_context_length is invalid`);
    if (!Number.isSafeInteger(entry.max_tokens_cap) || entry.max_tokens_cap < 1 || entry.max_tokens_cap > MAX_MAX_TOKENS) fail(`contestant ${entry.model} max_tokens_cap is invalid`);
    if (typeof entry.retention_class !== 'string' || entry.retention_class.length < 3 || entry.retention_class.length > 256) fail(`contestant ${entry.model} retention_class is invalid`);
    if (!['zdr_public_or_sanitized', 'retained_public_only'].includes(entry.privacy_class)) {
      fail(`contestant ${entry.model} privacy_class is invalid`);
    }

    exactKeys(entry.provider_policy, ['allow_fallbacks', 'require_parameters', 'data_collection', 'zdr', 'only'], `contestant ${entry.model} provider_policy`);
    if (entry.provider_policy.allow_fallbacks !== false) fail(`contestant ${entry.model} must disable provider fallbacks`);
    if (entry.provider_policy.require_parameters !== true) fail(`contestant ${entry.model} must require provider parameter support`);
    if (![null, 'allow', 'deny'].includes(entry.provider_policy.data_collection)) fail(`contestant ${entry.model} data_collection policy is invalid`);
    if (typeof entry.provider_policy.zdr !== 'boolean') fail(`contestant ${entry.model} zdr policy is invalid`);
    if (!Array.isArray(entry.provider_policy.only) || entry.provider_policy.only.length > 16) fail(`contestant ${entry.model} provider only-list is invalid`);
    for (const providerSlug of entry.provider_policy.only) {
      if (typeof providerSlug !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(providerSlug)) fail(`contestant ${entry.model} provider slug is invalid`);
    }
    if (entry.scored_trial_eligible === true && entry.provider_policy.only.length !== 1) {
      fail(`scored contestant ${entry.model} must bind exactly one reviewed provider`);
    }
    if (entry.status !== 'quarantined') {
      if (entry.privacy_class === 'zdr_public_or_sanitized') {
        if (entry.provider_policy.data_collection !== 'deny' || entry.provider_policy.zdr !== true) {
          fail(`ZDR contestant ${entry.model} must require data_collection=deny and zdr=true`);
        }
      } else {
        if (entry.provider_policy.zdr !== false || ![null, 'allow'].includes(entry.provider_policy.data_collection)) {
          fail(`retained-public-only contestant ${entry.model} has inconsistent provider retention policy`);
        }
      }
    }
    if (entry.model === registry.default_model) defaultEntry = entry;
  }
  if (!defaultEntry) fail('registry default_model is not present');
  if (defaultEntry.status !== 'qualified') fail('registry default_model must be qualified');
  return registry;
}

export function getContestantV1(registry, model) {
  validateContestantRegistryV1(registry);
  const entry = registry.contestants.find((candidate) => candidate.model === model);
  if (!entry) fail(`model ${model} is not in the reviewed OpenRouter contestant registry`);
  return entry;
}

export function contestantRegistryDigestV1(registry) {
  validateContestantRegistryV1(registry);
  return sha256(Buffer.from(canonicalJson(registry), 'utf8'));
}

async function loadContestantRegistryV1(path = REGISTRY_PATH) {
  const registryRead = await readJsonBounded(path, MAX_REGISTRY_BYTES, 'OpenRouter contestant registry');
  validateContestantRegistryV1(registryRead.value);
  return {
    registry: registryRead.value,
    sha256: contestantRegistryDigestV1(registryRead.value),
  };
}

function requireRuntimeGate(env, registry, registrySha256) {
  if (env.VOID_OPENROUTER_ENABLE !== '1') fail('VOID_OPENROUTER_ENABLE=1 is required');
  const policyAck = env.VOID_OPENROUTER_ACK_PROVIDER_POLICY === '1'
    || env.VOID_OPENROUTER_ACK_PROVIDER_RETENTION === '1';
  if (!policyAck) fail('VOID_OPENROUTER_ACK_PROVIDER_POLICY=1 is required');
  const registryAck = String(env.VOID_OPENROUTER_ACK_REGISTRY_SHA256 ?? '').trim();
  if (!/^[0-9a-f]{64}$/.test(registryAck) || registryAck !== registrySha256) {
    fail('VOID_OPENROUTER_ACK_REGISTRY_SHA256 must equal the loaded registry generation');
  }

  const logicalOperationIntentDigest = String(
    env[LOGICAL_OPERATION_INTENT_ENV] ?? '',
  ).trim();
  if (!/^[0-9a-f]{64}$/.test(logicalOperationIntentDigest)) {
    fail(`${LOGICAL_OPERATION_INTENT_ENV} must be a trusted stable 64-hex intent digest`);
  }

  const model = String(env.VOID_OPENROUTER_MODEL ?? registry.default_model).trim();
  const contestant = getContestantV1(registry, model);
  if (contestant.status === 'quarantined') fail(`contestant ${model} is quarantined and requires requalification`);
  if (contestant.status === 'qualification_only' && env.VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY !== '1') {
    fail(`contestant ${model} is qualification_only; VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY=1 is required`);
  }
  if (contestant.privacy_class === 'retained_public_only'
    && env.VOID_OPENROUTER_ACK_PUBLIC_RETENTION !== '1') {
    fail(`contestant ${model} requires VOID_OPENROUTER_ACK_PUBLIC_RETENTION=1`);
  }
  return {
    contestant,
    logicalOperationIntentDigest,
    maxTokens: parseBoundedInt(
      env.VOID_OPENROUTER_MAX_TOKENS,
      Math.min(DEFAULT_MAX_TOKENS, contestant.max_tokens_cap),
      1,
      contestant.max_tokens_cap,
      'VOID_OPENROUTER_MAX_TOKENS',
    ),
    chatTimeoutMs: parseBoundedInt(
      env.VOID_OPENROUTER_CHAT_TIMEOUT_MS,
      DEFAULT_CHAT_TIMEOUT_MS,
      MIN_TIMEOUT_MS,
      MAX_TIMEOUT_MS,
      'VOID_OPENROUTER_CHAT_TIMEOUT_MS',
    ),
  };
}

function stamp(st) {
  return {
    dev: st.dev.toString(), ino: st.ino.toString(), size: st.size.toString(),
    mtimeNs: st.mtimeNs.toString(), ctimeNs: st.ctimeNs.toString(),
  };
}

function sameStamp(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.size === b.size
    && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
}

async function readRegularBounded(path, maxBytes, name) {
  const fh = await open(path, FS.O_RDONLY | FS.O_NOFOLLOW | FS.O_NONBLOCK);
  try {
    const pre = await fh.stat({ bigint: true });
    if (!pre.isFile()) fail(`${name} must be a regular non-symlink file`);
    if (pre.size > BigInt(maxBytes)) fail(`${name} exceeds ${maxBytes} bytes`);
    const chunks = [];
    let total = 0;
    let position = 0;
    while (true) {
      const remaining = maxBytes + 1 - total;
      if (remaining <= 0) fail(`${name} exceeds ${maxBytes} bytes during read`);
      const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, remaining));
      const { bytesRead } = await fh.read(buffer, 0, buffer.length, position);
      if (bytesRead === 0) break;
      chunks.push(buffer.subarray(0, bytesRead));
      total += bytesRead;
      position += bytesRead;
      if (total > maxBytes) fail(`${name} exceeds ${maxBytes} bytes during read`);
    }
    const post = await fh.stat({ bigint: true });
    if (!sameStamp(stamp(pre), stamp(post))) fail(`${name} generation changed during bounded read`);
    return Buffer.concat(chunks, total);
  } finally {
    await fh.close().catch(() => {});
  }
}

function decodeUtf8(bytes, name) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`${name} must be valid UTF-8`);
  }
}

async function readJsonBounded(path, maxBytes, name) {
  const bytes = await readRegularBounded(path, maxBytes, name);
  const text = decodeUtf8(bytes, name);
  try {
    return { value: JSON.parse(text), bytes, text };
  } catch {
    fail(`${name} must contain valid JSON`);
  }
}

async function assertNoSymlinkComponents(rootPath, relativePath) {
  const rootStat = await lstat(rootPath);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail('staging root must be a real directory');
  let current = rootPath;
  for (const component of relativePath.split('/')) {
    current = join(current, component);
    const st = await lstat(current);
    if (st.isSymbolicLink()) fail(`entry ${relativePath} contains a symlink component`);
  }
}

function safeRelativePath(value, name) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._/-]{1,256}$/.test(value)) fail(`${name} is invalid`);
  if (isAbsolute(value) || value.startsWith('/')) fail(`${name} must be relative`);
  const parts = value.split('/');
  if (parts.some((x) => x === '' || x === '.' || x === '..')) fail(`${name} contains unsafe path components`);
}

function scanOutboundText(text) {
  for (const pattern of BLOCKED_OUTBOUND_PATTERNS) {
    if (pattern.test(text)) fail('final outbound prompt failed last-mile secret/path scan');
  }
}

function validateContestantInputPolicy(manifest, contestant) {
  if (contestant.privacy_class !== 'retained_public_only') return;
  for (const entry of manifest.entries) {
    if (entry.classification !== 'public') {
      fail(`retained-public-only contestant ${contestant.model} requires every outbound entry to be classified public`);
    }
  }
}

function validateTrialPacketPrivacyV1(trialSha256, contestant, env) {
  if (contestant.privacy_class !== 'retained_public_only') return;
  const ack = String(env.VOID_OPENROUTER_ACK_PUBLIC_TRIAL_SHA256 ?? '').trim();
  if (!/^[0-9a-f]{64}$/.test(ack) || ack !== trialSha256) {
    fail(`retained-public-only contestant ${contestant.model} requires VOID_OPENROUTER_ACK_PUBLIC_TRIAL_SHA256 for the exact trial packet generation`);
  }
}

function validateReceiptAndManifest(trial, manifest, receipt) {
  if (trial?.marker !== 'VOID_APOLLYON_TRIAL_PACKET_V1') fail('trial packet marker drifted');
  if (!/^voidat1_[0-9a-f]{64}$/.test(String(trial?.trial_id ?? ''))) fail('trial_id is invalid');

  exactKeys(manifest, ['marker', 'trial_id', 'entries', 'created_at_utc', 'nonce'], 'manifest');
  if (manifest.marker !== 'VOID_APOLLYON_OUTBOUND_ADMISSION_MANIFEST_V1') fail('manifest marker drifted');
  if (manifest.trial_id !== trial.trial_id) fail('manifest trial_id does not match trial');
  if (!Array.isArray(manifest.entries) || manifest.entries.length < 1 || manifest.entries.length > 64) fail('manifest entries are out of bounds');

  if (receipt?.marker !== 'VOID_APOLLYON_OUTBOUND_ADMISSION_RECEIPT_V1') fail('sanitization receipt marker drifted');
  if (receipt.trial_id !== trial.trial_id) fail('receipt trial_id does not match trial');
  if (!/^voidaa1_[0-9a-f]{64}$/.test(String(receipt?.admission_id ?? ''))) fail('admission_id is invalid');
  if (receipt.public_or_sanitized_inputs_only !== true) fail('receipt does not prove sanitized/public-only inputs');
  if (receipt.contestant_executes_outside_void_core !== true) fail('receipt outside-core boundary drifted');
  if (receipt.secret_values_present !== false) fail('receipt reports secret values present');
  if (receipt.local_paths_disclosed !== false) fail('receipt reports local path disclosure');
  if (receipt.payload_bytes_embedded !== false) fail('receipt unexpectedly embeds payload bytes');
  if (!Array.isArray(receipt.entries) || receipt.entries.length !== manifest.entries.length) fail('receipt entries do not match manifest cardinality');

  const receiptByLabel = new Map(receipt.entries.map((entry) => [entry.label, entry]));
  for (const [i, entry] of manifest.entries.entries()) {
    exactKeys(entry, ['label', 'relative_path', 'sha256', 'classification', 'media_type'], `manifest.entries[${i}]`);
    safeRelativePath(entry.relative_path, `manifest.entries[${i}].relative_path`);
    if (!['public', 'sanitized'].includes(entry.classification)) fail('manifest entry classification is not outbound-safe');
    if (!['text/plain', 'application/json'].includes(entry.media_type)) fail('manifest entry media type is unsupported');
    const admitted = receiptByLabel.get(entry.label);
    if (!admitted) fail(`receipt missing admitted label ${entry.label}`);
    if (admitted.sha256 !== entry.sha256
      || admitted.classification !== entry.classification
      || admitted.media_type !== entry.media_type) {
      fail(`receipt binding differs for ${entry.label}`);
    }
  }
}

async function collectAdmittedInputs(stagingRoot, manifest, receipt, hooks = {}) {
  const rootReal = await realpath(stagingRoot);
  const receiptByLabel = new Map(receipt.entries.map((entry) => [entry.label, entry]));
  const items = [];
  let total = 0;

  for (const entry of [...manifest.entries].sort((a, b) => a.label.localeCompare(b.label))) {
    await assertNoSymlinkComponents(stagingRoot, entry.relative_path);
    const candidate = resolve(stagingRoot, entry.relative_path);
    const rel = relative(rootReal, await realpath(candidate));
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(`entry ${entry.label} escapes staging root`);
    const bytes = await readRegularBounded(candidate, MAX_ENTRY_BYTES, `entry ${entry.label}`);
    const digest = sha256(bytes);
    const admitted = receiptByLabel.get(entry.label);
    if (digest !== entry.sha256 || digest !== admitted.sha256) fail(`entry ${entry.label} changed after sanitization admission`);
    if (Number(admitted.byte_length) !== bytes.length) fail(`entry ${entry.label} byte length differs from sanitization receipt`);
    total += bytes.length;
    if (total > MAX_TOTAL_INPUT_BYTES) fail(`outbound staged input exceeds ${MAX_TOTAL_INPUT_BYTES} bytes`);
    items.push({
      label: entry.label,
      classification: entry.classification,
      media_type: entry.media_type,
      sha256: digest,
      text: decodeUtf8(bytes, `entry ${entry.label}`),
    });
  }

  if (typeof hooks.afterInputCollection === 'function') await hooks.afterInputCollection({ items, total });
  return { items, total };
}

function isExactPublishedZeroPrice(raw) {
  if (typeof raw === 'number') return Object.is(raw, 0);
  return raw === '0';
}

export function validateZeroPriceModelV1(modelEnvelope, contestant) {
  if (!contestant || typeof contestant !== 'object') fail('contestant policy is required for model metadata validation');
  const model = modelEnvelope?.data ?? modelEnvelope;
  if (!model || typeof model !== 'object' || Array.isArray(model)) fail('OpenRouter model metadata is malformed');
  if (model.id !== contestant.model) fail(`OpenRouter model id must equal ${contestant.model}`);
  if (contestant.canonical_slug !== null && model.canonical_slug !== contestant.canonical_slug) {
    fail(`OpenRouter canonical model generation must equal ${contestant.canonical_slug}`);
  }
  if (!Number.isSafeInteger(model.context_length) || model.context_length < contestant.min_context_length) {
    fail(`OpenRouter model context_length must be an exact safe integer at or above the reviewed minimum for ${contestant.model}`);
  }
  const pricing = model.pricing;
  if (!pricing || typeof pricing !== 'object' || Array.isArray(pricing) || Object.keys(pricing).length === 0) {
    fail('OpenRouter pricing metadata is missing');
  }

  const required = new Set(['prompt', 'completion']);
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(pricing, key)) fail(`OpenRouter pricing.${key} is missing`);
    if (!isExactPublishedZeroPrice(pricing[key])) {
      fail(`OpenRouter pricing.${key} must be canonical exact zero; free-model gate closed`);
    }
  }

  for (const [key, raw] of Object.entries(pricing)) {
    if (required.has(key)) continue;
    if (raw === null || raw === undefined) continue;
    if (!isExactPublishedZeroPrice(raw)) {
      fail(`OpenRouter pricing.${key} is not canonical exact zero; free-model gate closed`);
    }
  }
  return {
    id: model.id,
    canonical_slug: model.canonical_slug ?? null,
    context_length: model.context_length,
    pricing_zero: true,
  };
}

async function readResponseJsonBounded(response, maxBytes, name) {
  if (!response?.body || typeof response.body.getReader !== 'function') fail(`${name} response body is unavailable`);
  const rawLength = String(response.headers?.get?.('content-length') ?? '').trim();
  if (rawLength) {
    if (!/^(0|[1-9][0-9]*)$/.test(rawLength)) fail(`${name} content-length is invalid`);
    const advertised = Number(rawLength);
    if (!Number.isSafeInteger(advertised) || advertised > maxBytes) fail(`${name} exceeds ${maxBytes} bytes`);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!(value instanceof Uint8Array)) fail(`${name} returned an invalid response chunk`);
    if (value.byteLength > maxBytes - total) fail(`${name} exceeds ${maxBytes} bytes`);
    chunks.push(Buffer.from(value));
    total += value.byteLength;
  }
  const text = decodeUtf8(Buffer.concat(chunks, total), name);
  try {
    return JSON.parse(text);
  } catch {
    fail(`${name} did not return valid JSON`);
  }
}

function assertExactResponseUrl(response, expected, name) {
  if (response.url !== expected) fail(`${name} final URL changed`);
}

export function executionModelV1(contestant) {
  if (!contestant || typeof contestant !== 'object') fail('contestant policy is required for execution-model resolution');
  if (typeof contestant.canonical_slug !== 'string' || contestant.canonical_slug.length < 3) {
    fail(`contestant ${contestant.model ?? 'unknown'} has no reviewed canonical generation`);
  }
  if (contestant.model.endsWith(':free') && !contestant.canonical_slug.endsWith(':free')) {
    return `${contestant.canonical_slug}:free`;
  }
  return contestant.canonical_slug;
}

export function providerRequestPolicyV1(contestant) {
  const policy = {
    allow_fallbacks: false,
    require_parameters: true,
    max_price: {
      prompt: 0,
      completion: 0,
    },
  };
  if (contestant.provider_policy.data_collection !== null) {
    policy.data_collection = contestant.provider_policy.data_collection;
  }
  policy.zdr = contestant.provider_policy.zdr;
  if (contestant.provider_policy.only.length > 0) policy.only = [...contestant.provider_policy.only];
  return policy;
}

export function buildOpenRouterRequestV1(trial, admittedInputs, maxTokens, contestant) {
  if (!contestant || typeof contestant !== 'object') fail('contestant policy is required to build OpenRouter request');
  const inputText = admittedInputs.map((entry) => (
    `\n--- BEGIN SANITIZED INPUT ${entry.label} ---\n`
    + `classification=${entry.classification}\nmedia_type=${entry.media_type}\nsha256=${entry.sha256}\n`
    + `${entry.text}\n--- END SANITIZED INPUT ${entry.label} ---\n`
  )).join('');
  const userContent = `APOLLYON TRIAL PACKET (provider-neutral, no authority granted):\n${JSON.stringify(trial, null, 2)}\n${inputText}`;
  scanOutboundText(userContent);
  const bytes = Buffer.byteLength(SYSTEM_PROMPT, 'utf8') + Buffer.byteLength(userContent, 'utf8');
  if (bytes > MAX_TOTAL_INPUT_BYTES + MAX_JSON_BYTES) fail('final outbound prompt exceeds reviewed byte ceiling');
  const body = {
    model: executionModelV1(contestant),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    max_tokens: maxTokens,
    stream: false,
    provider: providerRequestPolicyV1(contestant),
  };
  if ('tools' in body) fail('tools must not be sent');
  return {
    body,
    promptSha256: sha256(Buffer.from(canonicalJson(body.messages), 'utf8')),
    promptBytes: bytes,
    executionModel: executionModelV1(contestant),
  };
}


export const BROKER_SOCKET_PATH = '/run/void-apollyon-openrouter-broker-v1.sock';
export const LOGICAL_OPERATION_INTENT_ENV = 'VOID_OPENROUTER_LOGICAL_OPERATION_INTENT_SHA256';
export const BROKER_ADMISSION_CREDENTIAL_DIRECTORY_ENV = 'CREDENTIALS_DIRECTORY';

function brokerSocketPathV1(hooks) {
  if (hooks.brokerSocketPath === undefined) return BROKER_SOCKET_PATH;
  if (hooks.allowTestBrokerSocketOverride !== true) {
    fail('broker socket override is test-only and requires allowTestBrokerSocketOverride=true');
  }
  const path = String(hooks.brokerSocketPath);
  if (!path.startsWith('/') || path.length < 2 || path.length > 256 || path.includes('\0')) {
    fail('test broker socket path is invalid');
  }
  return path;
}

function brokerAdmissionCredentialDirectoryV1(env) {
  const path=String(env[BROKER_ADMISSION_CREDENTIAL_DIRECTORY_ENV]??'').trim();
  if(!isAbsolute(path)||path.length<2||path.length>4096||path.includes('\0')) {
    fail(`${BROKER_ADMISSION_CREDENTIAL_DIRECTORY_ENV} must be the per-unit systemd credential directory`);
  }
  return path;
}

function brokerClientV1(hooks) {
  if (hooks.brokerClientFn === undefined) return runBrokerClientV1;
  if (hooks.allowTestBrokerClientOverride !== true || typeof hooks.brokerClientFn !== 'function') {
    fail('broker client override is test-only and requires allowTestBrokerClientOverride=true');
  }
  return hooks.brokerClientFn;
}

export function brokerRequestIdV1(logicalOperationIntentDigest) {
  if (!/^[0-9a-f]{64}$/.test(String(logicalOperationIntentDigest ?? ''))) {
    fail('logical operation intent digest is invalid');
  }
  return `voidobr1_${sha256(Buffer.from(canonicalJson({
    marker: 'VOID_APOLLYON_OPENROUTER_BROKER_REQUEST_ID_V1',
    logical_operation_intent_digest: logicalOperationIntentDigest,
  }), 'utf8'))}`;
}

export function buildOpenRouterBrokerIpcRequestV1({
  logicalOperationIntentDigest,
  registrySha256,
  requestBody,
  contestant,
  admissionCapability = null,
  replayCapability = null,
  timeoutMs,
}) {
  if (!/^[0-9a-f]{64}$/.test(String(logicalOperationIntentDigest ?? ''))) {
    fail('logical operation intent digest is invalid');
  }
  if (!/^[0-9a-f]{64}$/.test(String(registrySha256 ?? ''))) {
    fail('registry sha256 is invalid');
  }
  if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
    fail('broker request body is invalid');
  }
  if (!contestant || typeof contestant !== 'object' || Array.isArray(contestant)) {
    fail('broker contestant policy is invalid');
  }
  if (admissionCapability !== null
      && (!admissionCapability || typeof admissionCapability !== 'object' || Array.isArray(admissionCapability))) {
    fail('broker admission capability is invalid');
  }
  if (replayCapability !== null
      && (!replayCapability || typeof replayCapability !== 'object' || Array.isArray(replayCapability))) {
    fail('broker replay capability is invalid');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    fail('broker timeout is invalid');
  }
  return Object.freeze({
    marker: 'VOID_APOLLYON_OPENROUTER_BROKER_REQUEST_V1',
    version: 1,
    request_id: brokerRequestIdV1(logicalOperationIntentDigest),
    logical_operation_intent_digest: logicalOperationIntentDigest,
    registry_sha256: registrySha256,
    request_body: requestBody,
    contestant,
    admission_capability: admissionCapability,
    replay_capability: replayCapability,
    timeout_ms: timeoutMs,
  });
}

export function validateBrokerAcceptedResponseV1(response, request, contestant, expectedAdmissionCapabilityId, expectedReplayCapabilityId) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    fail('broker response is malformed');
  }
  if (response.request_id !== request.request_id) fail('broker response request_id mismatch');
  if (response.status === 'HOLD') {
    const code = typeof response.hold_code === 'string' ? response.hold_code : 'INTERNAL_HOLD';
    const operation = typeof response.operation_id === 'string' ? ` operation=${response.operation_id}` : '';
    fail(`OpenRouter broker HOLD code=${code}${operation}`);
  }
  if (response.status !== 'ACCEPTED') fail('broker response status is invalid');
  if (!/^apollyon_op_v1:[0-9a-f]{64}$/.test(String(response.operation_id ?? ''))) {
    fail('broker accepted operation_id is invalid');
  }
  if (!/^[0-9a-f]{64}$/.test(String(response.result_digest ?? ''))) {
    fail('broker accepted result_digest is invalid');
  }
  const result = response.result;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    fail('broker accepted result is malformed');
  }
  if (typeof result.content !== 'string') fail('broker accepted result content must be text');
  if(!/^voidobac1_[0-9a-f]{64}$/.test(String(result.broker_admission_capability_id??''))||result.broker_admission_capability_id!==expectedAdmissionCapabilityId) fail('broker admission capability evidence is missing or mismatched');
  if(!/^voidobrc1_[0-9a-f]{64}$/.test(String(result.broker_replay_capability_id??''))||result.broker_replay_capability_id!==expectedReplayCapabilityId) fail('broker replay capability evidence is missing or mismatched');
  const model = result.broker_catalog_preflight_v1;
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    fail('broker catalog preflight evidence is missing');
  }
  if (model.marker !== 'VOID_APOLLYON_OPENROUTER_BROKER_CATALOG_PREFLIGHT_V1'
      || model.version !== 1
      || model.pricing_zero !== true) {
    fail('broker catalog preflight evidence is invalid');
  }
  if (model.model !== contestant.model || model.canonical_slug !== contestant.canonical_slug) {
    fail('broker catalog preflight generation does not match reviewed contestant');
  }
  if (!Number.isSafeInteger(model.context_length) || model.context_length < contestant.min_context_length) {
    fail('broker catalog context length is below reviewed minimum');
  }
  if (!/^[0-9a-f]{64}$/.test(String(model.catalog_sha256 ?? ''))
      || !/^[0-9a-f]{64}$/.test(String(model.selected_model_sha256 ?? ''))) {
    fail('broker catalog evidence digest is invalid');
  }
  return Object.freeze({
    operationId: response.operation_id,
    resultDigest: response.result_digest,
    result,
    catalogPreflight: model,
  });
}

export function acceptedRecoveryKeyV1({ registrySha256, contestant, trialId, admissionId, promptSha256, maxTokens }) {
  return sha256(Buffer.from(canonicalJson({
    registry_sha256: registrySha256,
    model: contestant.model,
    canonical_slug: contestant.canonical_slug,
    trial_id: trialId,
    admission_id: admissionId,
    prompt_sha256: promptSha256,
    max_tokens: maxTokens,
  }), 'utf8'));
}

function acceptedRecoveryPathV1(outputPath, key) {
  return join(dirname(resolve(outputPath)), `.void-openrouter-accepted-${key}.json`);
}

async function assertNoAutomaticRecoveryEvidenceV1(path) {
  try {
    await readRegularBounded(path, MAX_CHAT_RESPONSE_BYTES + MAX_JSON_BYTES, 'accepted-result recovery evidence');
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  fail('accepted-result recovery evidence already exists; automatic GREEN and provider reexecution are forbidden; operator reconciliation is required');
}

async function publishFinalResultFromAcceptedV1(path, value, faultHook) {
  try {
    return await publishJsonExactV1(path, value, { faultHook });
  } catch (firstError) {
    try {
      return await publishJsonExactV1(path, value);
    } catch {
      fail(`accepted result publication remains unresolved after exact retry; provider reexecution is forbidden (${firstError?.code ?? 'publication_error'})`);
    }
  }
}

async function publishAcceptedRecoveryV1(path, value, faultHook) {
  try {
    return await publishJsonExactV1(path, value, { faultHook });
  } catch (error) {
    if (typeof faultHook !== 'function') throw error;
    return publishJsonExactV1(path, value);
  }
}

async function readmitPinnedTrialGenerationV1(options, admitFn, originalReceipt, contestant, env) {
  const trialBytes = await readRegularBounded(options.trialPath, MAX_JSON_BYTES, 'trial packet');
  const scratch = await mkdtemp(join(tmpdir(), 'void-openrouter-trial-readmit-'));
  const exactPath = join(scratch, 'trial-packet.json');
  try {
    await writeFile(exactPath, trialBytes, { flag: 'wx', mode: 0o600 });
    const reboundReceipt = await admitFn(
      exactPath, options.stagingRoot, options.manifestPath, options.receiptPath, options.admissionAtUtc,
      { emitOutput: false },
    );
    if (canonicalJson(reboundReceipt) !== canonicalJson(originalReceipt)) {
      fail('post-admission trial generation produced a different constitutional admission receipt');
    }
    let value;
    try { value = JSON.parse(decodeUtf8(trialBytes, 'trial packet')); }
    catch { fail('trial packet must contain valid JSON'); }
    const digest = sha256(trialBytes);
    validateTrialPacketPrivacyV1(digest, contestant, env);
    return { value, bytes: trialBytes, sha256: digest };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

export async function runOpenRouterContestantTrialV1(options, hooks = {}) {
  const registryLoaded = hooks.registry
    ? { registry: validateContestantRegistryV1(hooks.registry), sha256: contestantRegistryDigestV1(hooks.registry) }
    : await loadContestantRegistryV1(hooks.registryPath ?? REGISTRY_PATH);
  const env = hooks.env ?? process.env;
  const runtime = requireRuntimeGate(env, registryLoaded.registry, registryLoaded.sha256);
  const admitFn = hooks.admitFn ?? admitSanitizedInputs;
  if (typeof admitFn !== 'function') fail('sanitization admission function is unavailable');

  const receipt = await admitFn(
    options.trialPath,
    options.stagingRoot,
    options.manifestPath,
    options.receiptPath,
    options.admissionAtUtc,
    { emitOutput: false },
  );
  if (typeof hooks.afterAdmission === 'function') await hooks.afterAdmission({ receipt });

  const trialRead = await readmitPinnedTrialGenerationV1(options, admitFn, receipt, runtime.contestant, env);
  const [manifestRead, receiptRead] = await Promise.all([
    readJsonBounded(options.manifestPath, MAX_JSON_BYTES, 'outbound manifest'),
    readJsonBounded(options.receiptPath, MAX_JSON_BYTES, 'sanitization receipt'),
  ]);
  if (canonicalJson(receiptRead.value) !== canonicalJson(receipt)) {
    fail('published sanitization receipt differs from admitted receipt object');
  }
  validateReceiptAndManifest(trialRead.value, manifestRead.value, receiptRead.value);
  validateContestantInputPolicy(manifestRead.value, runtime.contestant);
  const admitted = await collectAdmittedInputs(
    options.stagingRoot,
    manifestRead.value,
    receiptRead.value,
    hooks,
  );

  const request = buildOpenRouterRequestV1(
    trialRead.value,
    admitted.items,
    runtime.maxTokens,
    runtime.contestant,
  );
  const recoveryKey = acceptedRecoveryKeyV1({
    registrySha256: registryLoaded.sha256,
    contestant: runtime.contestant,
    trialId: trialRead.value.trial_id,
    admissionId: receiptRead.value.admission_id,
    promptSha256: request.promptSha256,
    maxTokens: runtime.maxTokens,
  });
  const recoveryPath = acceptedRecoveryPathV1(options.outputPath, recoveryKey);
  if (typeof hooks.beforeRecoveryEvidenceCheck === 'function') {
    await hooks.beforeRecoveryEvidenceCheck({ recoveryPath, recoveryKey });
  }
  await assertNoAutomaticRecoveryEvidenceV1(recoveryPath);

  const brokerBinding=buildOpenRouterBrokerBindingV1({
    logicalOperationIntentDigest:runtime.logicalOperationIntentDigest,
    registrySha256:registryLoaded.sha256,
    requestBody:request.body,
    contestant:runtime.contestant,
  });
  let brokerAdmissionMacKey=null;
  let brokerAdmission;
  let brokerReplay;
  try{
    brokerAdmissionMacKey=await readBrokerAdmissionMacCredentialV1(
      brokerAdmissionCredentialDirectoryV1(env),
    );
    const capabilityProvenance={
      binding:brokerBinding,model:runtime.contestant.model,
      canonicalSlug:runtime.contestant.canonical_slug,trialId:trialRead.value.trial_id,
      admissionId:receiptRead.value.admission_id,
      admissionReceiptSha256:sha256(receiptRead.bytes),promptSha256:request.promptSha256,
    };
    brokerAdmission=buildBrokerAdmissionCapabilityV1(capabilityProvenance,brokerAdmissionMacKey);
    brokerReplay=buildBrokerReplayCapabilityV1(capabilityProvenance,brokerAdmissionMacKey);
  }finally{
    if(brokerAdmissionMacKey)brokerAdmissionMacKey.fill(0);
  }

  const brokerRequest = buildOpenRouterBrokerIpcRequestV1({
    logicalOperationIntentDigest: runtime.logicalOperationIntentDigest,
    registrySha256: registryLoaded.sha256,requestBody: request.body,
    contestant: runtime.contestant,admissionCapability: brokerAdmission,
    replayCapability: brokerReplay,timeoutMs: runtime.chatTimeoutMs,
  });
  if (typeof hooks.beforeBrokerRequest === 'function') {
    await hooks.beforeBrokerRequest({
      brokerRequest,recoveryKey,brokerAdmissionCapabilityId:brokerAdmission.capability_id,
      brokerReplayCapabilityId:brokerReplay.capability_id,
    });
  }

  const brokerResponse = await brokerClientV1(hooks)(
    brokerSocketPathV1(hooks),
    brokerRequest,
  );
  const brokerAccepted = validateBrokerAcceptedResponseV1(
    brokerResponse,
    brokerRequest,
    runtime.contestant,
    brokerAdmission.capability_id,
    brokerReplay.capability_id,
  );

  if (typeof hooks.afterFreePriceCheck === 'function') {
    await hooks.afterFreePriceCheck({
      model: brokerAccepted.catalogPreflight,
      contestant: runtime.contestant,
    });
  }
  if (typeof hooks.afterChatAccepted === 'function') {
    await hooks.afterChatAccepted({
      accepted: brokerAccepted.result,
      recoveryKey,
      brokerOperationId: brokerAccepted.operationId,
      brokerResultDigest: brokerAccepted.resultDigest,
    });
  }

  const accepted = brokerAccepted.result;
  const model = brokerAccepted.catalogPreflight;
  const result = {
    marker: RESULT_MARKER,
    accepted_recovery_key: recoveryKey,
    provider: PROVIDER,
    broker_operation_id: brokerAccepted.operationId,
    broker_result_digest: brokerAccepted.resultDigest,
    broker_admission_capability_id: brokerAdmission.capability_id,
    broker_catalog_sha256: model.catalog_sha256,
    broker_selected_model_sha256: model.selected_model_sha256,
    model_requested: runtime.contestant.model,
    model_execution_requested: request.executionModel,
    model_canonical_slug: model.canonical_slug,
    model_reported: typeof accepted.reported_model === 'string'
      ? accepted.reported_model
      : request.executionModel,
    router_requested_model: typeof accepted.router_requested_model === 'string'
      ? accepted.router_requested_model
      : request.executionModel,
    router_selected_model: typeof accepted.router_selected_model === 'string'
      ? accepted.router_selected_model
      : request.executionModel,
    router_selected_provider: typeof accepted.router_selected_provider === 'string'
      ? accepted.router_selected_provider
      : null,
    qualification_status: runtime.contestant.status,
    scored_trial_eligible: runtime.contestant.scored_trial_eligible,
    retention_class: runtime.contestant.retention_class,
    privacy_class: runtime.contestant.privacy_class,
    provider_policy_acknowledged: true,
    registry_policy_generation_acknowledged: registryLoaded.sha256,
    public_retention_acknowledged: runtime.contestant.privacy_class === 'retained_public_only',
    scored_provider_allowlist: [...runtime.contestant.provider_policy.only],
    pricing_verified_zero: true,
    request_time_max_price_zero: true,
    provider_policy: providerRequestPolicyV1(runtime.contestant),
    tools_exposed: false,
    registry_sha256: registryLoaded.sha256,
    registry_reviewed_at_utc: registryLoaded.registry.reviewed_at_utc,
    trial_id: trialRead.value.trial_id,
    admission_id: receiptRead.value.admission_id,
    prompt_sha256: request.promptSha256,
    prompt_bytes: request.promptBytes,
    max_tokens: runtime.maxTokens,
    response_id: typeof accepted.response_id === 'string' ? accepted.response_id : null,
    finish_reason: 'stop',
    response_content: accepted.content,
    response_content_sha256: sha256(Buffer.from(accepted.content, 'utf8')),
    usage: accepted.usage && typeof accepted.usage === 'object' ? accepted.usage : null,
    broker_result: accepted,
    created_at_utc: new Date().toISOString(),
  };

  await publishAcceptedRecoveryV1(
    recoveryPath,
    result,
    hooks.resultRecoveryPublicationFaultHook,
  );
  if (typeof hooks.afterAcceptedRecoveryPersisted === 'function') {
    await hooks.afterAcceptedRecoveryPersisted({
      recoveryPath,
      recoveryKey,
      brokerOperationId: brokerAccepted.operationId,
      brokerResultDigest: brokerAccepted.resultDigest,
    });
  }
  await publishFinalResultFromAcceptedV1(
    options.outputPath,
    result,
    hooks.resultPublicationFaultHook,
  );
  if (hooks.emitOutput !== false) {
    process.stdout.write(
      `${MARKER}_GREEN ${trialRead.value.trial_id} `
      + `model=${runtime.contestant.model} `
      + `admission=${receiptRead.value.admission_id} `
      + `status=${runtime.contestant.status}\n`,
    );
  }
  return result;
}

export async function runOpenRouterOxAlphaTrialV1(options, hooks = {}) {
  const env = { ...(hooks.env ?? process.env), VOID_OPENROUTER_MODEL: DEFAULT_MODEL };
  return runOpenRouterContestantTrialV1(options, { ...hooks, env });
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (command === 'run' && args.length === 6) {
    return runOpenRouterContestantTrialV1({
      trialPath: args[0],
      stagingRoot: args[1],
      manifestPath: args[2],
      receiptPath: args[3],
      outputPath: args[4],
      admissionAtUtc: args[5],
    });
  }
  process.stderr.write(
    'usage: apollyon_openrouter_ox_alpha_adapter_v1.mjs run '
    + '<trial-packet.json> <staging-root> <manifest.json> <receipt.json> <output.json> <admission-at-utc>\n',
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
