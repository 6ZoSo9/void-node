#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { constants as FS } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  REGISTRY_PATH,
  RESULT_MARKER,
  acceptedRecoveryKeyV1,
  contestantRegistryDigestV1,
  executionModelV1,
  providerRequestPolicyV1,
  runOpenRouterContestantTrialV1,
  validateContestantRegistryV1,
} from './apollyon_openrouter_ox_alpha_adapter_v1.mjs';
import { publishReceiptExact as publishJsonExactV1 } from './apollyon_secret_sanitization_constitutional_admission_v1.mjs';

export const ARENA_MARKER = 'VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_V1';
const SUMMARY_MARKER = 'VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_SUMMARY_V1';
const MAX_REGISTRY_BYTES = 256 * 1024;
const MAX_RESULT_BYTES = 2 * 1024 * 1024;
const MAX_EXECUTION_CLAIM_BYTES = 256 * 1024;
const DEFAULT_DELAY_MS = 4_000;
const MAX_DELAY_MS = 60_000;
const MAX_MODELS = 16;

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

function executionClaimRootGenerationV1(st) {
  return sha256(Buffer.from(canonicalJson({
    dev: st.dev.toString(),
    ino: st.ino.toString(),
    uid: st.uid.toString(),
    mode: (Number(st.mode) & 0o777).toString(8),
  }), 'utf8'));
}

function parseBoundedInt(raw, fallback, min, max, name) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const text = String(raw).trim();
  if (!/^(0|[1-9][0-9]*)$/.test(text)) fail(`${name} must be an exact non-negative integer`);
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${name} must be within ${min}..${max}`);
  return value;
}

function safeModelLeaf(model) {
  const leaf = model.replace(/[^A-Za-z0-9._-]/g, '_');
  if (!leaf || leaf.length > 180) fail(`model ${model} cannot be represented as a safe output leaf`);
  return leaf;
}

async function readJsonBounded(path, maxBytes, name) {
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
    for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) {
      if (pre[key].toString() !== post[key].toString()) fail(`${name} generation changed during bounded read`);
    }
    const bytes = Buffer.concat(chunks, total);
    let value;
    try {
      value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      fail(`${name} must be valid UTF-8 JSON`);
    }
    return { value, bytes };
  } finally {
    await fh.close().catch(() => {});
  }
}

async function readRegistry(path) {
  const read = await readJsonBounded(path, MAX_REGISTRY_BYTES, 'OpenRouter contestant registry');
  validateContestantRegistryV1(read.value);
  return { registry: read.value, sha256: contestantRegistryDigestV1(read.value) };
}

export function selectArenaContestantsV1(registry, mode) {
  validateContestantRegistryV1(registry);
  if (!['qualification', 'scored'].includes(mode)) fail('VOID_OPENROUTER_ARENA_MODE must be qualification or scored');
  const selected = registry.contestants.filter((entry) => {
    if (entry.status === 'quarantined') return false;
    if (mode === 'scored') return entry.status === 'qualified' && entry.scored_trial_eligible === true;
    return entry.status === 'qualified' || entry.status === 'qualification_only';
  });
  if (selected.length < 1) fail(`no contestants are eligible for arena mode ${mode}`);
  if (selected.length > MAX_MODELS) fail(`arena selection exceeds ${MAX_MODELS} models`);
  return selected;
}

function parseInheritedDirectoryFdV1(raw) {
  const text = String(raw ?? '').trim();
  if (!/^[1-9][0-9]*$/.test(text)) fail('VOID_OPENROUTER_ARENA_OUTPUT_ROOT_FD must be an inherited positive integer fd');
  const fd = Number(text);
  if (!Number.isSafeInteger(fd) || fd < 3 || fd > 1_048_575) {
    fail('VOID_OPENROUTER_ARENA_OUTPUT_ROOT_FD is out of bounds');
  }
  return fd;
}

async function openInheritedDirectoryGenerationV1(rawFd, visiblePath, name) {
  const inheritedFd = parseInheritedDirectoryFdV1(rawFd);
  const fh = await open(`/proc/self/fd/${inheritedFd}`, FS.O_RDONLY | FS.O_DIRECTORY);
  try {
    const st = await fh.stat({ bigint: true });
    if (!st.isDirectory()) fail(`${name} must be a real directory`);
    if ((Number(st.mode) & 0o777) !== 0o700) fail(`${name} mode must be 0700`);
    if (typeof process.getuid === 'function' && Number(st.uid) !== process.getuid()) {
      fail(`${name} must be owned by the current uid`);
    }
    await assertVisibleDirectoryGenerationV1(fh, visiblePath, name);
    return fh;
  } catch (error) {
    await fh.close().catch(() => {});
    throw error;
  }
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
    return {
      fh,
      anchor: `/proc/self/fd/${fh.fd}`,
      generation: executionClaimRootGenerationV1(st),
    };
  } catch (error) {
    await fh.close().catch(() => {});
    throw error;
  }
}

async function assertExecutionClaimRootGenerationV1(root) {
  const st = await root.fh.stat({ bigint: true });
  if (!st.isDirectory()) fail('OpenRouter execution claim root generation is no longer a directory');
  if ((Number(st.mode) & 0o777) !== 0o700) fail('OpenRouter execution claim root mode changed');
  if (typeof process.getuid === 'function' && Number(st.uid) !== process.getuid()) {
    fail('OpenRouter execution claim root ownership changed');
  }
  if (executionClaimRootGenerationV1(st) !== root.generation) {
    fail('OpenRouter execution claim root generation changed');
  }
}

function fdDirectoryPath(fh) {
  return `/proc/self/fd/${fh.fd}`;
}

async function assertVisibleDirectoryGenerationV1(fh, visiblePath, name) {
  const retained = await fh.stat({ bigint: true });
  let visible;
  try {
    visible = await stat(visiblePath, { bigint: true });
  } catch {
    fail(`${name} visible generation changed`);
  }
  if (!visible.isDirectory()
    || retained.dev.toString() !== visible.dev.toString()
    || retained.ino.toString() !== visible.ino.toString()) {
    fail(`${name} visible generation changed`);
  }
}

async function publishSummaryExactV1(path, value, faultHook) {
  try {
    return await publishJsonExactV1(path, value, { faultHook });
  } catch (error) {
    if (typeof faultHook !== 'function') throw error;
    return publishJsonExactV1(path, value);
  }
}

function redactError(error, apiKey) {
  let message = String(error?.message ?? error ?? 'unknown error');
  if (apiKey && message.includes(apiKey)) message = message.split(apiKey).join('[REDACTED_API_KEY]');
  if (message.length > 2_048) message = `${message.slice(0, 2_048)}…`;
  return message;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function openJsonBoundedGenerationV1(path, maxBytes, name) {
  const fh = await open(path, FS.O_RDONLY | FS.O_NOFOLLOW | FS.O_NONBLOCK);
  try {
    const pre = await fh.stat({ bigint: true });
    if (!pre.isFile()) fail(`${name} must be a regular non-symlink file`);
    if ((Number(pre.mode) & 0o777) !== 0o600) fail(`${name} mode must be 0600`);
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
    for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) {
      if (pre[key].toString() !== post[key].toString()) fail(`${name} generation changed during bounded read`);
    }
    const bytes = Buffer.concat(chunks, total);
    let value;
    try {
      value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      fail(`${name} must be valid UTF-8 JSON`);
    }
    return { fh, stat: post, bytes, value };
  } catch (error) {
    await fh.close().catch(() => {});
    throw error;
  }
}

async function assertVisibleFileGenerationV1(fh, visiblePath, name) {
  const retained = await fh.stat({ bigint: true });
  let visible;
  try {
    visible = await stat(visiblePath, { bigint: true });
  } catch {
    fail(`${name} visible generation changed`);
  }
  if (!visible.isFile()
    || retained.dev.toString() !== visible.dev.toString()
    || retained.ino.toString() !== visible.ino.toString()) {
    fail(`${name} visible generation changed`);
  }
}

async function verifyExecutionClaimEvidenceV1(
  claimRoot,
  contestant,
  persisted,
  registryLoaded,
  hooks = {},
) {
  await assertExecutionClaimRootGenerationV1(claimRoot);

  const persistedRecoveryKey = String(persisted?.accepted_recovery_key ?? '');
  if (!/^[0-9a-f]{64}$/.test(persistedRecoveryKey)) {
    fail(`persisted accepted recovery identity is invalid for ${contestant.model}`);
  }
  if (!/^[0-9a-f]{64}$/.test(String(persisted?.prompt_sha256 ?? ''))) {
    fail(`persisted prompt digest is invalid for ${contestant.model}`);
  }
  if (!Number.isSafeInteger(persisted?.max_tokens)
    || persisted.max_tokens < 1
    || persisted.max_tokens > contestant.max_tokens_cap) {
    fail(`persisted max token ceiling is invalid for ${contestant.model}`);
  }

  const recoveryKey = acceptedRecoveryKeyV1({
    registrySha256: registryLoaded.sha256,
    contestant,
    trialId: persisted.trial_id,
    admissionId: persisted.admission_id,
    promptSha256: persisted.prompt_sha256,
    maxTokens: persisted.max_tokens,
  });
  if (persistedRecoveryKey !== recoveryKey) {
    fail(`persisted accepted recovery identity is not canonical for ${contestant.model}`);
  }

  const claimPath = join(
    claimRoot.anchor,
    `.void-openrouter-execution-claim-${recoveryKey}.json`,
  );
  const generation = await openJsonBoundedGenerationV1(
    claimPath,
    MAX_EXECUTION_CLAIM_BYTES,
    `execution claim for ${contestant.model}`,
  );

  try {
    const claim = generation.value;
    exactKeys(
      claim,
      [
        'marker',
        'accepted_recovery_key',
        'execution_claim_root_generation_sha256',
        'registry_sha256',
        'model',
        'execution_model',
        'canonical_slug',
        'trial_id',
        'admission_id',
        'prompt_sha256',
        'max_tokens',
        'state',
      ],
      `execution claim for ${contestant.model}`,
    );

    const executionModel = executionModelV1(contestant);
    if (claim.marker !== 'VOID_APOLLYON_OPENROUTER_EXECUTION_CLAIM_V1') {
      fail(`execution claim marker drifted for ${contestant.model}`);
    }
    if (claim.accepted_recovery_key !== recoveryKey) {
      fail(`execution claim recovery identity drifted for ${contestant.model}`);
    }
    if (claim.execution_claim_root_generation_sha256 !== claimRoot.generation) {
      fail(`execution claim root generation drifted for ${contestant.model}`);
    }
    if (persisted.execution_claim_root_generation_sha256 !== claimRoot.generation) {
      fail(`persisted execution claim root generation drifted for ${contestant.model}`);
    }
    if (claim.registry_sha256 !== registryLoaded.sha256) {
      fail(`execution claim registry generation drifted for ${contestant.model}`);
    }
    if (claim.model !== contestant.model) {
      fail(`execution claim model binding drifted for ${contestant.model}`);
    }
    if (claim.execution_model !== executionModel) {
      fail(`execution claim execution-model binding drifted for ${contestant.model}`);
    }
    if (claim.canonical_slug !== contestant.canonical_slug) {
      fail(`execution claim canonical generation drifted for ${contestant.model}`);
    }
    if (claim.trial_id !== persisted.trial_id) {
      fail(`execution claim trial binding drifted for ${contestant.model}`);
    }
    if (claim.admission_id !== persisted.admission_id) {
      fail(`execution claim admission binding drifted for ${contestant.model}`);
    }
    if (claim.prompt_sha256 !== persisted.prompt_sha256) {
      fail(`execution claim prompt binding drifted for ${contestant.model}`);
    }
    if (claim.max_tokens !== persisted.max_tokens) {
      fail(`execution claim token ceiling drifted for ${contestant.model}`);
    }
    if (claim.state !== 'executing') {
      fail(`execution claim state drifted for ${contestant.model}`);
    }

    const fileSha256 = sha256(generation.bytes);
    const semanticSha256 = sha256(Buffer.from(canonicalJson(claim), 'utf8'));
    if (persisted.execution_claim_sha256 !== fileSha256) {
      fail(`execution claim exact file digest drifted for ${contestant.model}`);
    }
    if (persisted.execution_claim_semantic_sha256 !== semanticSha256) {
      fail(`execution claim semantic digest drifted for ${contestant.model}`);
    }

    if (typeof hooks.afterExecutionClaimSemanticValidation === 'function') {
      await hooks.afterExecutionClaimSemanticValidation({
        contestant,
        claimPath,
        claim,
        persisted,
      });
    }

    await assertVisibleFileGenerationV1(
      generation.fh,
      claimPath,
      `execution claim for ${contestant.model}`,
    );

    return {
      fh: generation.fh,
      claimPath,
      fileSha256,
      semanticSha256,
      rootGenerationSha256: claimRoot.generation,
    };
  } catch (error) {
    await generation.fh.close().catch(() => {});
    throw error;
  }
}

async function verifyPersistedResult(
  resultPath,
  visibleResultPath,
  contestant,
  returnedResult,
  registryLoaded,
  hooks = {},
) {
  const generation = await openJsonBoundedGenerationV1(
    resultPath,
    MAX_RESULT_BYTES,
    `persisted result for ${contestant.model}`,
  );
  try {
    const persisted = generation.value;
    const executionModel = executionModelV1(contestant);
    if (persisted?.marker !== RESULT_MARKER) fail(`persisted result marker drifted for ${contestant.model}`);
    if (persisted.model_requested !== contestant.model) fail(`persisted result model binding drifted for ${contestant.model}`);
    if (persisted.model_execution_requested !== executionModel) fail(`persisted execution model binding drifted for ${contestant.model}`);
    if (persisted.model_canonical_slug !== contestant.canonical_slug) fail(`persisted canonical model generation drifted for ${contestant.model}`);
    if (persisted.model_reported !== executionModel) fail(`persisted reported execution model drifted for ${contestant.model}`);
    if (persisted.router_requested_model !== executionModel) fail(`persisted router requested model drifted for ${contestant.model}`);
    if (persisted.router_selected_model !== executionModel) fail(`persisted router selected model drifted for ${contestant.model}`);
    if (typeof persisted.router_selected_provider !== 'string'
      || persisted.router_selected_provider.length < 1
      || persisted.router_selected_provider.length > 128) {
      fail(`persisted router selected provider is invalid for ${contestant.model}`);
    }
    if (contestant.scored_trial_eligible === true) {
      const reviewedProvider = contestant.provider_policy.only[0];
      if (persisted.router_selected_provider !== reviewedProvider) {
        fail(`persisted router selected provider must equal reviewed scored provider ${reviewedProvider} for ${contestant.model}`);
      }
    }
    if (persisted.finish_reason !== 'stop') fail(`persisted finish reason must equal stop for ${contestant.model}`);
    if (persisted.registry_sha256 !== registryLoaded.sha256) fail(`persisted registry generation drifted for ${contestant.model}`);
    if (persisted.registry_policy_generation_acknowledged !== registryLoaded.sha256) {
      fail(`persisted registry policy acknowledgement drifted for ${contestant.model}`);
    }
    if (persisted.qualification_status !== contestant.status) fail(`persisted qualification status drifted for ${contestant.model}`);
    if (persisted.scored_trial_eligible !== contestant.scored_trial_eligible) fail(`persisted scored eligibility drifted for ${contestant.model}`);
    if (persisted.privacy_class !== contestant.privacy_class) fail(`persisted privacy class drifted for ${contestant.model}`);
    if (persisted.retention_class !== contestant.retention_class) fail(`persisted retention class drifted for ${contestant.model}`);
    if (JSON.stringify(persisted.provider_policy) !== JSON.stringify(providerRequestPolicyV1(contestant))) {
      fail(`persisted provider policy drifted for ${contestant.model}`);
    }
    if (JSON.stringify(persisted.scored_provider_allowlist) !== JSON.stringify(contestant.provider_policy.only)) {
      fail(`persisted scored provider allowlist drifted for ${contestant.model}`);
    }
    if (persisted.trial_id !== returnedResult?.trial_id) fail(`persisted result trial binding drifted for ${contestant.model}`);
    if (persisted.admission_id !== returnedResult?.admission_id) fail(`persisted result admission binding drifted for ${contestant.model}`);
    if (persisted.response_content_sha256 !== returnedResult?.response_content_sha256) {
      fail(`persisted result response digest drifted for ${contestant.model}`);
    }
    if (persisted.accepted_recovery_key !== returnedResult?.accepted_recovery_key) {
      fail(`persisted accepted recovery identity drifted for ${contestant.model}`);
    }

    if (typeof hooks.afterPersistedResultSemanticValidation === 'function') {
      await hooks.afterPersistedResultSemanticValidation({
        contestant,
        visibleResultPath,
        persisted,
      });
    }

    await assertVisibleFileGenerationV1(
      generation.fh,
      visibleResultPath,
      `persisted result for ${contestant.model}`,
    );

    return {
      persisted,
      fh: generation.fh,
      fileSha256: sha256(generation.bytes),
    };
  } catch (error) {
    await generation.fh.close().catch(() => {});
    throw error;
  }
}

export async function runOpenRouterAlignmentArenaV1(options, hooks = {}) {
  const env = hooks.env ?? process.env;
  if (env.VOID_OPENROUTER_ARENA_ENABLE !== '1') fail('VOID_OPENROUTER_ARENA_ENABLE=1 is required');
  if (env.VOID_OPENROUTER_ENABLE !== '1') fail('VOID_OPENROUTER_ENABLE=1 is required');
  const policyAck = env.VOID_OPENROUTER_ACK_PROVIDER_POLICY === '1'
    || env.VOID_OPENROUTER_ACK_PROVIDER_RETENTION === '1';
  if (!policyAck) fail('VOID_OPENROUTER_ACK_PROVIDER_POLICY=1 is required');
  const apiKey = String(env.OPENROUTER_API_KEY ?? '');
  if (apiKey.length < 8 || apiKey.length > 512 || /\s/.test(apiKey)) fail('OPENROUTER_API_KEY is missing or malformed');

  const mode = String(env.VOID_OPENROUTER_ARENA_MODE ?? 'qualification').trim();
  const delayMs = parseBoundedInt(
    env.VOID_OPENROUTER_ARENA_DELAY_MS,
    DEFAULT_DELAY_MS,
    0,
    MAX_DELAY_MS,
    'VOID_OPENROUTER_ARENA_DELAY_MS',
  );
  const registryLoaded = hooks.registry
    ? {
        registry: validateContestantRegistryV1(hooks.registry),
        sha256: contestantRegistryDigestV1(hooks.registry),
      }
    : await readRegistry(hooks.registryPath ?? REGISTRY_PATH);
  const registryAck = String(env.VOID_OPENROUTER_ACK_REGISTRY_SHA256 ?? '').trim();
  if (registryAck !== registryLoaded.sha256) {
    fail('VOID_OPENROUTER_ACK_REGISTRY_SHA256 must equal the loaded registry generation');
  }
  const contestants = selectArenaContestantsV1(registryLoaded.registry, mode);
  const runContestant = hooks.runContestantFn ?? runOpenRouterContestantTrialV1;
  const sleepFn = hooks.sleepFn ?? sleep;
  if (typeof runContestant !== 'function') fail('contestant runner is unavailable');
  if (typeof sleepFn !== 'function') fail('arena sleep function is unavailable');

  const outputRoot = resolve(options.outputRoot);
  const outputRootHandle = await openInheritedDirectoryGenerationV1(
    hooks.outputRootFd ?? env.VOID_OPENROUTER_ARENA_OUTPUT_ROOT_FD,
    outputRoot,
    'arena output root',
  );
  const outputRootAnchor = fdDirectoryPath(outputRootHandle);
  const executionClaimRootFd =
    hooks.executionClaimRootFd ?? env.VOID_OPENROUTER_EXECUTION_CLAIM_ROOT_FD;
  let executionClaimRoot;
  try {
    executionClaimRoot = await openExecutionClaimRootV1(executionClaimRootFd);
  } catch (error) {
    await outputRootHandle.close().catch(() => {});
    throw error;
  }

  const records = [];
  const greenResultHandles = [];
  const greenClaimHandles = [];
  for (let index = 0; index < contestants.length; index += 1) {
    const contestant = contestants[index];

    const modelEnv = {
      ...env,
      VOID_OPENROUTER_MODEL: contestant.model,
      VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY:
        contestant.status === 'qualification_only' ? '1' : '0',
    };

    let verifiedResultHandle = null;
    let verifiedClaimHandle = null;
    try {
      const modelLeaf = safeModelLeaf(contestant.model);
      const receiptLeaf = `${modelLeaf}.outbound-admission-receipt.json`;
      const resultLeaf = `${modelLeaf}.contestant-result.json`;
      const receiptPath = join(outputRootAnchor, receiptLeaf);
      const resultPath = join(outputRootAnchor, resultLeaf);
      const visibleResultPath = join(outputRoot, resultLeaf);

      const result = await runContestant({
        trialPath: options.trialPath,
        stagingRoot: options.stagingRoot,
        manifestPath: options.manifestPath,
        receiptPath,
        outputPath: resultPath,
        admissionAtUtc: options.admissionAtUtc,
      }, {
        env: modelEnv,
        registry: registryLoaded.registry,
        emitOutput: false,
        ...(hooks.contestantHooks ?? {}),
        executionClaimRootFd,
      });
      if (result?.marker !== RESULT_MARKER) fail(`contestant ${contestant.model} returned unexpected result marker`);
      if (result.model_requested !== contestant.model) fail(`contestant ${contestant.model} result model binding drifted`);

      const verified = await verifyPersistedResult(
        resultPath,
        visibleResultPath,
        contestant,
        result,
        registryLoaded,
        hooks,
      );
      verifiedResultHandle = verified.fh;
      const verifiedClaim = await verifyExecutionClaimEvidenceV1(
        executionClaimRoot,
        contestant,
        verified.persisted,
        registryLoaded,
        hooks,
      );
      verifiedClaimHandle = verifiedClaim.fh;
      await assertVisibleDirectoryGenerationV1(outputRootHandle, outputRoot, 'arena output root');

      const greenRecord = {
        model: contestant.model,
        execution_model: executionModelV1(contestant),
        canonical_slug: verified.persisted.model_canonical_slug ?? null,
        registry_status: contestant.status,
        scored_trial_eligible: contestant.scored_trial_eligible,
        run_status: 'GREEN',
        result_path: resultLeaf,
        result_file_sha256: verified.fileSha256,
        accepted_recovery_key: verified.persisted.accepted_recovery_key,
        execution_claim_sha256: verifiedClaim.fileSha256,
        execution_claim_semantic_sha256: verifiedClaim.semanticSha256,
        execution_claim_root_generation_sha256: verifiedClaim.rootGenerationSha256,
        response_content_sha256: verified.persisted.response_content_sha256 ?? null,
        trial_id: verified.persisted.trial_id ?? null,
        admission_id: verified.persisted.admission_id ?? null,
      };

      await assertVisibleFileGenerationV1(
        verifiedResultHandle,
        visibleResultPath,
        `persisted result for ${contestant.model}`,
      );
      greenResultHandles.push({
        fh: verifiedResultHandle,
        visiblePath: visibleResultPath,
        name: `persisted result for ${contestant.model}`,
      });
      await assertVisibleFileGenerationV1(
        verifiedClaimHandle,
        verifiedClaim.claimPath,
        `execution claim for ${contestant.model}`,
      );
      greenClaimHandles.push({
        fh: verifiedClaimHandle,
        visiblePath: verifiedClaim.claimPath,
        name: `execution claim for ${contestant.model}`,
      });
      verifiedResultHandle = null;
      verifiedClaimHandle = null;
      records.push(greenRecord);
    } catch (error) {
      records.push({
        model: contestant.model,
        execution_model: contestant.canonical_slug === null ? null : executionModelV1(contestant),
        canonical_slug: contestant.canonical_slug ?? null,
        registry_status: contestant.status,
        scored_trial_eligible: contestant.scored_trial_eligible,
        run_status: 'HOLD',
        hold_reason: redactError(error, apiKey),
      });
    } finally {
      if (verifiedResultHandle) await verifiedResultHandle.close().catch(() => {});
      if (verifiedClaimHandle) await verifiedClaimHandle.close().catch(() => {});
    }

    if (index + 1 < contestants.length && delayMs > 0) await sleepFn(delayMs);
  }

  const green = records.filter((record) => record.run_status === 'GREEN').length;
  const held = records.length - green;
  const summary = {
    marker: SUMMARY_MARKER,
    arena_mode: mode,
    registry_sha256: registryLoaded.sha256,
    registry_reviewed_at_utc: registryLoaded.registry.reviewed_at_utc,
    requested_contestants: records.length,
    green_contestants: green,
    held_contestants: held,
    automatic_registry_promotion: false,
    automatic_authority_grant: false,
    outputs_are_untrusted_evidence: true,
    records,
    created_at_utc: new Date().toISOString(),
  };
  const serialized = JSON.stringify(summary);
  if (serialized.includes(apiKey)) fail('API key unexpectedly entered arena summary');
  try {
    await assertVisibleDirectoryGenerationV1(outputRootHandle, outputRoot, 'arena output root');
    for (const retained of greenResultHandles) {
      await assertVisibleFileGenerationV1(retained.fh, retained.visiblePath, retained.name);
    }
    await assertExecutionClaimRootGenerationV1(executionClaimRoot);
    for (const retained of greenClaimHandles) {
      await assertVisibleFileGenerationV1(retained.fh, retained.visiblePath, retained.name);
    }
    await publishSummaryExactV1(join(outputRootAnchor, 'arena-summary.json'), summary, hooks.summaryPublicationFaultHook);
    if (hooks.emitOutput !== false) {
      process.stdout.write(`${ARENA_MARKER}_COMPLETE mode=${mode} requested=${records.length} green=${green} held=${held}\n`);
    }
    return summary;
  } finally {
    for (const retained of greenResultHandles) await retained.fh.close().catch(() => {});
    for (const retained of greenClaimHandles) await retained.fh.close().catch(() => {});
    await executionClaimRoot.fh.close().catch(() => {});
    await outputRootHandle.close().catch(() => {});
  }
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (command === 'run' && args.length === 5) {
    return runOpenRouterAlignmentArenaV1({
      trialPath: args[0],
      stagingRoot: args[1],
      manifestPath: args[2],
      outputRoot: args[3],
      admissionAtUtc: args[4],
    });
  }
  process.stderr.write(
    'usage: apollyon_openrouter_alignment_arena_v1.mjs run '
    + '<trial-packet.json> <staging-root> <manifest.json> <output-root-visible-path> <admission-at-utc>\n'
    + 'requires inherited VOID_OPENROUTER_ARENA_OUTPUT_ROOT_FD for that exact mode-0700 directory generation\n',
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
