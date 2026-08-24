#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { constants as FS } from 'node:fs';
import { lstat, mkdtemp, open, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { admit as admitSanitizedInputs, publishReceiptExact as publishJsonExactV1 } from './apollyon_secret_sanitization_constitutional_admission_v1.mjs';

export const MARKER = 'VOID_APOLLYON_OPENROUTER_CONTESTANT_ADAPTER_V1';
export const RESULT_MARKER = 'VOID_APOLLYON_OPENROUTER_CONTESTANT_RESULT_V1';
export const REGISTRY_MARKER = 'VOID_APOLLYON_OPENROUTER_CONTESTANT_REGISTRY_V1';
export const PROVIDER = 'openrouter';
export const DEFAULT_MODEL = 'stealth/ox-alpha';
export const MODEL = DEFAULT_MODEL;
export const API_ORIGIN = 'https://openrouter.ai';
export const MODEL_CATALOG_URL = `${API_ORIGIN}/api/v1/models`;
export const CHAT_URL = `${API_ORIGIN}/api/v1/chat/completions`;
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

  const apiKey = String(env.OPENROUTER_API_KEY ?? '');
  if (apiKey.length < 8 || apiKey.length > 512 || /\s/.test(apiKey)) fail('OPENROUTER_API_KEY is missing or malformed');
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
    apiKey,
    contestant,
    maxTokens: parseBoundedInt(env.VOID_OPENROUTER_MAX_TOKENS, Math.min(DEFAULT_MAX_TOKENS, contestant.max_tokens_cap), 1, contestant.max_tokens_cap, 'VOID_OPENROUTER_MAX_TOKENS'),
    metadataTimeoutMs: parseBoundedInt(env.VOID_OPENROUTER_METADATA_TIMEOUT_MS, DEFAULT_METADATA_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS, 'VOID_OPENROUTER_METADATA_TIMEOUT_MS'),
    chatTimeoutMs: parseBoundedInt(env.VOID_OPENROUTER_CHAT_TIMEOUT_MS, DEFAULT_CHAT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS, 'VOID_OPENROUTER_CHAT_TIMEOUT_MS'),
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

async function fetchModelMetadata(fetchImpl, apiKey, timeoutMs, contestant) {
  const response = await fetchImpl(MODEL_CATALOG_URL, {
    method: 'GET',
    redirect: 'error',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  assertExactResponseUrl(response, MODEL_CATALOG_URL, 'model catalog');
  if (response.status !== 200) fail(`OpenRouter model catalog returned HTTP ${response.status}`);
  const catalog = await readResponseJsonBounded(response, MAX_MODEL_RESPONSE_BYTES, 'OpenRouter model catalog');
  if (!catalog || typeof catalog !== 'object' || !Array.isArray(catalog.data)) {
    fail('OpenRouter model catalog is malformed');
  }
  const matches = catalog.data.filter((entry) => entry && typeof entry === 'object' && entry.id === contestant.model);
  if (matches.length === 0) {
    fail(`OpenRouter model ${contestant.model} is absent from the current exact catalog`);
  }
  if (matches.length !== 1) {
    fail(`OpenRouter model ${contestant.model} is ambiguous in the current exact catalog`);
  }
  return matches[0];
}

function boundedErrorText(value, apiKey) {
  if (value === null || value === undefined) return null;
  let text = String(value).replace(/[\r\n\t]+/g, ' ').trim();
  if (!text) return null;
  if (apiKey && text.includes(apiKey)) text = text.split(apiKey).join('[REDACTED_API_KEY]');
  for (const pattern of BLOCKED_OUTBOUND_PATTERNS) {
    if (pattern.test(text)) return '[REDACTED_SENSITIVE_ERROR]';
  }
  return text.length > 768 ? `${text.slice(0, 768)}…` : text;
}

async function openRouterHttpError(response, name, apiKey) {
  const parts = [`${name} returned HTTP ${response.status}`];
  try {
    const payload = await readResponseJsonBounded(response, MAX_ERROR_RESPONSE_BYTES, `${name} error`);
    const error = payload?.error;
    const code = error?.code;
    const message = boundedErrorText(error?.message, apiKey);
    if (code !== null && code !== undefined && ['string', 'number'].includes(typeof code)) {
      parts.push(`code=${boundedErrorText(code, apiKey)}`);
    }
    if (message) parts.push(`message=${message}`);
    const meta = payload?.openrouter_metadata;
    if (meta && typeof meta === 'object') {
      const strategy = boundedErrorText(meta.strategy, apiKey);
      if (strategy) parts.push(`strategy=${strategy}`);
      if (Number.isSafeInteger(meta.attempt)) parts.push(`attempt=${meta.attempt}`);
      if (Number.isSafeInteger(meta?.endpoints?.total)) parts.push(`endpoints_total=${meta.endpoints.total}`);
      const available = Array.isArray(meta?.endpoints?.available) ? meta.endpoints.available : [];
      const providers = available.slice(0, 8)
        .map((entry) => boundedErrorText(entry?.provider, apiKey))
        .filter(Boolean);
      if (providers.length > 0) parts.push(`providers=${providers.join(',')}`);
      const pipeline = Array.isArray(meta?.pipeline) ? meta.pipeline : [];
      const stages = pipeline.slice(0, 8)
        .map((entry) => boundedErrorText(entry?.name ?? entry?.stage ?? entry?.id, apiKey))
        .filter(Boolean);
      if (stages.length > 0) parts.push(`pipeline=${stages.join(',')}`);
    }
  } catch {
    // Preserve only the bounded HTTP status when an error body is absent/malformed/oversized.
  }
  const retryAfter = boundedErrorText(response.headers?.get?.('retry-after'), apiKey);
  if (retryAfter) parts.push(`retry_after=${retryAfter}`);
  return new Error(parts.join(' '));
}

async function sendChat(fetchImpl, apiKey, requestBody, timeoutMs) {
  const response = await fetchImpl(CHAT_URL, {
    method: 'POST',
    redirect: 'error',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'x-openrouter-metadata': 'enabled',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeoutMs),
  });
  assertExactResponseUrl(response, CHAT_URL, 'chat completion');
  if (response.status !== 200) throw await openRouterHttpError(response, 'OpenRouter chat completion', apiKey);
  return readResponseJsonBounded(response, MAX_CHAT_RESPONSE_BYTES, 'OpenRouter chat completion');
}

function validateChatResponse(response, contestant) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) fail('OpenRouter chat response is malformed');
  if (!Array.isArray(response.choices) || response.choices.length < 1) fail('OpenRouter chat response has no choices');
  const first = response.choices[0];
  const message = first?.message;
  if (!message || typeof message !== 'object') fail('OpenRouter chat response message is missing');
  if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) fail('OpenRouter contestant attempted a tool call; tools are not admitted');
  if (first.finish_reason !== 'stop') fail('OpenRouter contestant finish_reason must equal stop');
  if (typeof message.content !== 'string') fail('OpenRouter contestant returned non-text content');

  const executionModel = executionModelV1(contestant);
  if (response.model !== executionModel) {
    fail(`OpenRouter response model must equal concrete execution model ${executionModel}`);
  }
  const router = response.openrouter_metadata;
  if (!router || typeof router !== 'object' || Array.isArray(router)) {
    fail('OpenRouter successful response must include router metadata');
  }
  if (router.requested !== executionModel) {
    fail(`OpenRouter router metadata requested model must equal ${executionModel}`);
  }
  if (!Array.isArray(router?.endpoints?.available)) {
    fail('OpenRouter router metadata endpoints are missing');
  }
  const selected = router.endpoints.available.filter((entry) => entry?.selected === true);
  if (selected.length !== 1) fail('OpenRouter router metadata must identify exactly one selected endpoint');
  if (selected[0].model !== executionModel) {
    fail(`OpenRouter selected endpoint model must equal concrete execution model ${executionModel}`);
  }
  if (typeof selected[0].provider !== 'string' || selected[0].provider.length < 1 || selected[0].provider.length > 128) {
    fail('OpenRouter selected endpoint provider is invalid');
  }

  return {
    content: message.content,
    finish_reason: first.finish_reason,
    reported_model: response.model,
    response_id: typeof response.id === 'string' ? response.id : null,
    usage: response.usage && typeof response.usage === 'object' ? response.usage : null,
    router_requested_model: router.requested,
    router_selected_model: selected[0].model,
    router_selected_provider: selected[0].provider,
  };
}

function acceptedRecoveryKeyV1({ registrySha256, contestant, trialId, admissionId, promptSha256, maxTokens }) {
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

function parseInheritedExecutionClaimRootFdV1(raw) {
  const text = String(raw ?? '').trim();
  if (!/^[1-9][0-9]*$/.test(text)) {
    fail('VOID_OPENROUTER_EXECUTION_CLAIM_ROOT_FD must be an inherited positive integer fd');
  }
  const fd = Number(text);
  if (!Number.isSafeInteger(fd) || fd < 3 || fd > 1_048_575) {
    fail('VOID_OPENROUTER_EXECUTION_CLAIM_ROOT_FD is out of bounds');
  }
  return fd;
}

async function openExecutionClaimRootV1(rawFd) {
  const inheritedFd = parseInheritedExecutionClaimRootFdV1(rawFd);
  const fh = await open(`/proc/self/fd/${inheritedFd}`, FS.O_RDONLY | FS.O_DIRECTORY);
  try {
    const st = await fh.stat({ bigint: true });
    if (!st.isDirectory()) fail('OpenRouter execution claim root must be a directory');
    if ((Number(st.mode) & 0o777) !== 0o700) fail('OpenRouter execution claim root mode must be 0700');
    if (typeof process.getuid === 'function' && Number(st.uid) !== process.getuid()) {
      fail('OpenRouter execution claim root must be owned by the current uid');
    }
    const generation = sha256(Buffer.from(canonicalJson({
      dev: st.dev.toString(),
      ino: st.ino.toString(),
      uid: st.uid.toString(),
      mode: (Number(st.mode) & 0o777).toString(8),
    }), 'utf8'));
    return {
      fh,
      anchor: `/proc/self/fd/${fh.fd}`,
      generation,
    };
  } catch (error) {
    await fh.close().catch(() => {});
    throw error;
  }
}

function executionClaimPathV1(claimRootAnchor, recoveryKey) {
  return join(claimRootAnchor, `.void-openrouter-execution-claim-${recoveryKey}.json`);
}

function executionClaimValueV1({
  recoveryKey,
  registrySha256,
  contestant,
  trialId,
  admissionId,
  promptSha256,
  maxTokens,
  claimRootGeneration,
}) {
  return {
    marker: 'VOID_APOLLYON_OPENROUTER_EXECUTION_CLAIM_V1',
    accepted_recovery_key: recoveryKey,
    execution_claim_root_generation_sha256: claimRootGeneration,
    registry_sha256: registrySha256,
    model: contestant.model,
    execution_model: executionModelV1(contestant),
    canonical_slug: contestant.canonical_slug,
    trial_id: trialId,
    admission_id: admissionId,
    prompt_sha256: promptSha256,
    max_tokens: maxTokens,
    state: 'executing',
  };
}

async function acquireExecutionClaimV1(path, value, hooks = {}) {
  if (typeof hooks.beforeExecutionClaim === 'function') {
    await hooks.beforeExecutionClaim({ claimPath: path, claim: value });
  }

  let published;
  try {
    published = await publishJsonExactV1(path, value, {
      faultHook: hooks.executionClaimPublicationFaultHook,
    });
  } catch {
    fail('execution claim publication conflicted or failed; provider execution forbidden');
  }

  if (published?.created !== true) {
    fail('execution claim already exists; same-key provider execution is BUSY/HOLD');
  }

  return {
    semanticSha256: sha256(Buffer.from(canonicalJson(value), 'utf8')),
    fileSha256: sha256(Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8')),
  };
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
  const fetchImpl = hooks.fetchImpl ?? globalThis.fetch;
  const admitFn = hooks.admitFn ?? admitSanitizedInputs;
  if (typeof fetchImpl !== 'function') fail('fetch implementation is unavailable');
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
  if (canonicalJson(receiptRead.value) !== canonicalJson(receipt)) fail('published sanitization receipt differs from admitted receipt object');
  validateReceiptAndManifest(trialRead.value, manifestRead.value, receiptRead.value);
  validateContestantInputPolicy(manifestRead.value, runtime.contestant);
  const admitted = await collectAdmittedInputs(options.stagingRoot, manifestRead.value, receiptRead.value, hooks);

  const request = buildOpenRouterRequestV1(trialRead.value, admitted.items, runtime.maxTokens, runtime.contestant);
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

  const metadata = await fetchModelMetadata(fetchImpl, runtime.apiKey, runtime.metadataTimeoutMs, runtime.contestant);
  const model = validateZeroPriceModelV1(metadata, runtime.contestant);
  if (typeof hooks.afterFreePriceCheck === 'function') await hooks.afterFreePriceCheck({ model, contestant: runtime.contestant });

  const executionClaimRoot = await openExecutionClaimRootV1(
    hooks.executionClaimRootFd ?? env.VOID_OPENROUTER_EXECUTION_CLAIM_ROOT_FD,
  );
  try {
    const executionClaimPath = executionClaimPathV1(executionClaimRoot.anchor, recoveryKey);
    const executionClaim = executionClaimValueV1({
      recoveryKey,
      registrySha256: registryLoaded.sha256,
      contestant: runtime.contestant,
      trialId: trialRead.value.trial_id,
      admissionId: receiptRead.value.admission_id,
      promptSha256: request.promptSha256,
      maxTokens: runtime.maxTokens,
      claimRootGeneration: executionClaimRoot.generation,
    });
    const acquiredClaim = await acquireExecutionClaimV1(executionClaimPath, executionClaim, hooks);

    // Close the recovery-check -> claim race. A recovery generation that appears
    // after the initial check but before this durable claim never widens authority.
    await assertNoAutomaticRecoveryEvidenceV1(recoveryPath);

    if (typeof hooks.afterExecutionClaimPersisted === 'function') {
      await hooks.afterExecutionClaimPersisted({
        claimPath: executionClaimPath,
        claimSemanticSha256: acquiredClaim.semanticSha256,
        claimFileSha256: acquiredClaim.fileSha256,
        claimRootGenerationSha256: executionClaimRoot.generation,
        recoveryKey,
      });
    }

    const rawResponse = await sendChat(fetchImpl, runtime.apiKey, request.body, runtime.chatTimeoutMs);
    const accepted = validateChatResponse(rawResponse, runtime.contestant);
    if (typeof hooks.afterChatAccepted === 'function') {
      await hooks.afterChatAccepted({ accepted, recoveryKey, claimPath: executionClaimPath });
    }

    const result = {
      marker: RESULT_MARKER,
      accepted_recovery_key: recoveryKey,
      execution_claim_sha256: acquiredClaim.fileSha256,
      execution_claim_semantic_sha256: acquiredClaim.semanticSha256,
      execution_claim_root_generation_sha256: executionClaimRoot.generation,
      provider: PROVIDER,
      model_requested: runtime.contestant.model,
      model_execution_requested: request.executionModel,
      model_canonical_slug: model.canonical_slug,
      model_reported: accepted.reported_model,
      router_requested_model: accepted.router_requested_model,
      router_selected_model: accepted.router_selected_model,
      router_selected_provider: accepted.router_selected_provider,
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
      response_id: accepted.response_id,
      finish_reason: accepted.finish_reason,
      response_content: accepted.content,
      response_content_sha256: sha256(Buffer.from(accepted.content, 'utf8')),
      usage: accepted.usage,
      created_at_utc: new Date().toISOString(),
    };
    if (canonicalJson(result).includes(runtime.apiKey)) fail('API key unexpectedly entered result object');
    await publishAcceptedRecoveryV1(recoveryPath, result, hooks.resultRecoveryPublicationFaultHook);
    if (typeof hooks.afterAcceptedRecoveryPersisted === 'function') {
      await hooks.afterAcceptedRecoveryPersisted({ recoveryPath, recoveryKey });
    }
    await publishFinalResultFromAcceptedV1(options.outputPath, result, hooks.resultPublicationFaultHook);
    if (hooks.emitOutput !== false) {
      process.stdout.write(`${MARKER}_GREEN ${trialRead.value.trial_id} model=${runtime.contestant.model} admission=${receiptRead.value.admission_id} status=${runtime.contestant.status}\n`);
    }
    return result;
  } finally {
    await executionClaimRoot.fh.close().catch(() => {});
  }
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
