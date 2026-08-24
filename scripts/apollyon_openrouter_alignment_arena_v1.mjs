#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, open, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  REGISTRY_PATH,
  RESULT_MARKER,
  contestantRegistryDigestV1,
  runOpenRouterContestantTrialV1,
  validateContestantRegistryV1,
} from './apollyon_openrouter_ox_alpha_adapter_v1.mjs';

export const ARENA_MARKER = 'VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_V1';
const SUMMARY_MARKER = 'VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_SUMMARY_V1';
const MAX_REGISTRY_BYTES = 256 * 1024;
const MAX_RESULT_BYTES = 2 * 1024 * 1024;
const DEFAULT_DELAY_MS = 4_000;
const MAX_DELAY_MS = 60_000;
const MAX_MODELS = 16;

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
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
  const bytes = await readFile(path);
  if (bytes.length > maxBytes) fail(`${name} exceeds ${maxBytes} bytes`);
  let value;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    fail(`${name} must be valid UTF-8 JSON`);
  }
  return { value, bytes };
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

async function publishCreateOnly(path, value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  const fh = await open(path, 'wx', 0o600);
  try {
    await fh.writeFile(bytes);
    await fh.sync();
  } finally {
    await fh.close().catch(() => {});
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

async function verifyPersistedResult(resultPath, contestant, returnedResult) {
  const persistedRead = await readJsonBounded(resultPath, MAX_RESULT_BYTES, `persisted result for ${contestant.model}`);
  const persisted = persistedRead.value;
  if (persisted?.marker !== RESULT_MARKER) fail(`persisted result marker drifted for ${contestant.model}`);
  if (persisted.model_requested !== contestant.model) fail(`persisted result model binding drifted for ${contestant.model}`);
  if (persisted.model_canonical_slug !== contestant.canonical_slug) fail(`persisted canonical model generation drifted for ${contestant.model}`);
  if (persisted.finish_reason !== 'stop') fail(`persisted finish reason must equal stop for ${contestant.model}`);
  if (contestant.scored_trial_eligible === true
    && JSON.stringify(persisted.scored_provider_allowlist) !== JSON.stringify(contestant.provider_policy.only)) {
    fail(`persisted scored provider allowlist drifted for ${contestant.model}`);
  }
  if (persisted.trial_id !== returnedResult?.trial_id) fail(`persisted result trial binding drifted for ${contestant.model}`);
  if (persisted.admission_id !== returnedResult?.admission_id) fail(`persisted result admission binding drifted for ${contestant.model}`);
  if (persisted.response_content_sha256 !== returnedResult?.response_content_sha256) {
    fail(`persisted result response digest drifted for ${contestant.model}`);
  }
  const mode = (await stat(resultPath)).mode & 0o777;
  if (mode !== 0o600) fail(`persisted result mode must be 0600 for ${contestant.model}`);
  return persisted;
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
  await mkdir(outputRoot, { mode: 0o700 });

  const records = [];
  for (let index = 0; index < contestants.length; index += 1) {
    const contestant = contestants[index];

    const modelEnv = {
      ...env,
      VOID_OPENROUTER_MODEL: contestant.model,
      VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY:
        contestant.status === 'qualification_only' ? '1' : '0',
    };

    try {
      const modelLeaf = safeModelLeaf(contestant.model);
      const modelDir = join(outputRoot, modelLeaf);
      await mkdir(modelDir, { mode: 0o700 });
      const receiptPath = join(modelDir, 'outbound-admission-receipt.json');
      const resultPath = join(modelDir, 'contestant-result.json');

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
      });
      if (result?.marker !== RESULT_MARKER) fail(`contestant ${contestant.model} returned unexpected result marker`);
      if (result.model_requested !== contestant.model) fail(`contestant ${contestant.model} result model binding drifted`);
      const persisted = await verifyPersistedResult(resultPath, contestant, result);
      records.push({
        model: contestant.model,
        canonical_slug: persisted.model_canonical_slug ?? null,
        registry_status: contestant.status,
        scored_trial_eligible: contestant.scored_trial_eligible,
        run_status: 'GREEN',
        result_path: `${modelLeaf}/contestant-result.json`,
        response_content_sha256: persisted.response_content_sha256 ?? null,
        trial_id: persisted.trial_id ?? null,
        admission_id: persisted.admission_id ?? null,
      });
    } catch (error) {
      records.push({
        model: contestant.model,
        canonical_slug: contestant.canonical_slug ?? null,
        registry_status: contestant.status,
        scored_trial_eligible: contestant.scored_trial_eligible,
        run_status: 'HOLD',
        hold_reason: redactError(error, apiKey),
      });
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
  await publishCreateOnly(join(outputRoot, 'arena-summary.json'), summary);

  if (hooks.emitOutput !== false) {
    process.stdout.write(`${ARENA_MARKER}_COMPLETE mode=${mode} requested=${records.length} green=${green} held=${held}\n`);
  }
  return summary;
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
    + '<trial-packet.json> <staging-root> <manifest.json> <new-output-root> <admission-at-utc>\n',
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
