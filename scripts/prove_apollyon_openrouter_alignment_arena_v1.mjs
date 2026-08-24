#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { constants as FS } from 'node:fs';
import { mkdir, mkdtemp, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { RESULT_MARKER, contestantRegistryDigestV1, executionModelV1, providerRequestPolicyV1 } from './apollyon_openrouter_ox_alpha_adapter_v1.mjs';
import {
  ARENA_MARKER,
  runOpenRouterAlignmentArenaV1,
  selectArenaContestantsV1,
} from './apollyon_openrouter_alignment_arena_v1.mjs';

const PROOF_MARKER = 'VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_V1_PROOF_GREEN';
const TEST_KEY = 'openrouter-arena-test-key-not-secret-123456';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('non-finite proof JSON number');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== 'object') throw new Error('non-JSON proof value');
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function syntheticRecoveryKeyV1(contestant) {
  return sha256(Buffer.from(`arena-proof-recovery:${contestant.model}:${contestant.canonical_slug}`, 'utf8'));
}

function executionClaimRootGenerationV1(st) {
  return sha256(Buffer.from(canonicalJson({
    dev: st.dev.toString(),
    ino: st.ino.toString(),
    uid: st.uid.toString(),
    mode: (Number(st.mode) & 0o777).toString(8),
  }), 'utf8'));
}

async function persistSyntheticExecutionClaimV1(result, hooks) {
  const rawFd = Number(hooks.executionClaimRootFd);
  assert.equal(Number.isSafeInteger(rawFd) && rawFd >= 3, true, 'synthetic runner missing execution claim root fd');
  const claimRoot = await open(`/proc/self/fd/${rawFd}`, FS.O_RDONLY | FS.O_DIRECTORY);
  try {
    const st = await claimRoot.stat({ bigint: true });
    assert.equal(st.isDirectory(), true);
    assert.equal(Number(st.mode) & 0o777, 0o700);

    result.prompt_sha256 ??= sha256(Buffer.from(`arena-proof-prompt:${result.model_requested}`, 'utf8'));
    result.max_tokens ??= 1024;

    const rootGeneration = executionClaimRootGenerationV1(st);
    const claim = {
      marker: 'VOID_APOLLYON_OPENROUTER_EXECUTION_CLAIM_V1',
      accepted_recovery_key: result.accepted_recovery_key,
      execution_claim_root_generation_sha256: rootGeneration,
      registry_sha256: result.registry_sha256,
      model: result.model_requested,
      execution_model: result.model_execution_requested,
      canonical_slug: result.model_canonical_slug,
      trial_id: result.trial_id,
      admission_id: result.admission_id,
      prompt_sha256: result.prompt_sha256,
      max_tokens: result.max_tokens,
      state: 'executing',
    };
    const serialized = `${JSON.stringify(claim, null, 2)}\n`;
    result.execution_claim_root_generation_sha256 = rootGeneration;
    result.execution_claim_semantic_sha256 =
      sha256(Buffer.from(canonicalJson(claim), 'utf8'));
    result.execution_claim_sha256 =
      sha256(Buffer.from(serialized, 'utf8'));

    const claimPath = join(
      `/proc/self/fd/${claimRoot.fd}`,
      `.void-openrouter-execution-claim-${result.accepted_recovery_key}.json`,
    );
    await writeFile(claimPath, serialized, { mode: 0o600, flag: 'wx' });
    return { claimPath, claim };
  } finally {
    await claimRoot.close().catch(() => {});
  }
}

function fixtureRegistry() {
  return {
    marker: 'VOID_APOLLYON_OPENROUTER_CONTESTANT_REGISTRY_V1',
    version: 1,
    reviewed_at_utc: '2026-08-24T06:00:00.000Z',
    default_model: 'stealth/ox-alpha',
    contestants: [
      {
        model: 'stealth/ox-alpha', canonical_slug: 'stealth/ox-alpha', status: 'qualified', scored_trial_eligible: true,
        zero_price_required: true, min_context_length: 262144, max_tokens_cap: 32768,
        retention_class: 'retained-provider-preview', privacy_class: 'retained_public_only',
        provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: null, zdr: false, only: ['ProofProvider'] },
      },
      {
        model: 'deepseek/deepseek-v4-flash:free', canonical_slug: 'deepseek/proof-v4-flash', status: 'qualification_only', scored_trial_eligible: false,
        zero_price_required: true, min_context_length: 1048576, max_tokens_cap: 32768,
        retention_class: 'qualification-zdr-required', privacy_class: 'zdr_public_or_sanitized',
        provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true, only: [] },
      },
      {
        model: 'deepseek/deepseek-chat:free', canonical_slug: 'deepseek/proof-chat', status: 'qualification_only', scored_trial_eligible: false,
        zero_price_required: true, min_context_length: 131072, max_tokens_cap: 32768,
        retention_class: 'public-source-retained', privacy_class: 'retained_public_only',
        provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: 'allow', zdr: false, only: [] },
      },
      {
        model: 'other/quarantined:free', canonical_slug: null, status: 'quarantined', scored_trial_eligible: false,
        zero_price_required: true, min_context_length: 32768, max_tokens_cap: 4096,
        retention_class: 'quarantined', privacy_class: 'zdr_public_or_sanitized',
        provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: null, zdr: false, only: [] },
      },
    ],
  };
}

function environment(registry, overrides = {}) {
  return {
    VOID_OPENROUTER_ARENA_ENABLE: '1',
    VOID_OPENROUTER_ENABLE: '1',
    VOID_OPENROUTER_ACK_PROVIDER_POLICY: '1',
    VOID_OPENROUTER_ACK_PUBLIC_RETENTION: '1',
    VOID_OPENROUTER_ACK_REGISTRY_SHA256: contestantRegistryDigestV1(registry),
    VOID_OPENROUTER_ARENA_MODE: 'qualification',
    VOID_OPENROUTER_ARENA_DELAY_MS: '0',
    OPENROUTER_API_KEY: TEST_KEY,
    ...overrides,
  };
}

async function expectReject(promise, contains, label) {
  try {
    await promise;
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!message.includes(contains)) throw new Error(`${label} rejected for wrong reason: ${message}`);
    return;
  }
  throw new Error(`${label} did not reject`);
}

async function runArenaWithRootV1(options, hooks) {
  await mkdir(options.outputRoot, { mode: 0o700 });
  const claimRootPath = `${options.outputRoot}.execution-claims`;
  await mkdir(claimRootPath, { mode: 0o700 });
  const callerRoot = await open(
    options.outputRoot,
    FS.O_RDONLY | FS.O_DIRECTORY | FS.O_NOFOLLOW,
  );
  const callerClaimRoot = await open(
    claimRootPath,
    FS.O_RDONLY | FS.O_DIRECTORY | FS.O_NOFOLLOW,
  );
  try {
    return await runOpenRouterAlignmentArenaV1(options, {
      ...hooks,
      outputRootFd: callerRoot.fd,
      executionClaimRootFd: callerClaimRoot.fd,
    });
  } finally {
    await callerClaimRoot.close().catch(() => {});
    await callerRoot.close().catch(() => {});
  }
}

function executionEvidenceV1(contestant) {
  const executionModel = executionModelV1(contestant);
  return {
    model_execution_requested: executionModel,
    model_reported: executionModel,
    router_requested_model: executionModel,
    router_selected_model: executionModel,
    router_selected_provider: 'ProofProvider',
    accepted_recovery_key: syntheticRecoveryKeyV1(contestant),
  };
}

async function main() {
  const registry = fixtureRegistry();
  assert.deepEqual(
    selectArenaContestantsV1(registry, 'qualification').map((x) => x.model),
    ['stealth/ox-alpha', 'deepseek/deepseek-v4-flash:free', 'deepseek/deepseek-chat:free'],
  );
  assert.deepEqual(
    selectArenaContestantsV1(registry, 'scored').map((x) => x.model),
    ['stealth/ox-alpha'],
  );
  assert.throws(() => selectArenaContestantsV1(registry, 'bogus'), /qualification or scored/);

  const root = await mkdtemp(join(tmpdir(), 'void-openrouter-arena-proof-'));
  try {
    const calls = [];
    const fakeRunner = async (options, hooks) => {
      const model = hooks.env.VOID_OPENROUTER_MODEL;
      calls.push({
        model,
        qualificationGate: hooks.env.VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY,
      });
      if (model === 'deepseek/deepseek-chat:free') {
        throw new Error(`synthetic provider hold ${TEST_KEY}`);
      }
      const contestant = registry.contestants.find((entry) => entry.model === model);
      const result = {
        marker: RESULT_MARKER,
        provider: 'openrouter',
        model_requested: model,
        ...executionEvidenceV1(contestant),
        model_canonical_slug: contestant.canonical_slug,
        model_reported: executionModelV1(contestant),
        qualification_status: model === 'stealth/ox-alpha' ? 'qualified' : 'qualification_only',
        scored_trial_eligible: model === 'stealth/ox-alpha',
        retention_class: contestant.retention_class,
        privacy_class: contestant.privacy_class,
        scored_provider_allowlist: contestant.provider_policy.only,
        provider_policy_acknowledged: true,
        registry_policy_generation_acknowledged: contestantRegistryDigestV1(registry),
        pricing_verified_zero: true,
        request_time_max_price_zero: true,
        provider_policy: providerRequestPolicyV1(contestant),
        tools_exposed: false,
        registry_sha256: contestantRegistryDigestV1(registry),
        registry_reviewed_at_utc: registry.reviewed_at_utc,
        trial_id: `voidat1_${'b'.repeat(64)}`,
        admission_id: `voidaa1_${'c'.repeat(64)}`,
        prompt_sha256: 'd'.repeat(64),
        prompt_bytes: 100,
        max_tokens: 1024,
        response_id: `proof-${model}`,
        finish_reason: 'stop',
        response_content: 'Synthetic aligned evidence only.',
        response_content_sha256: 'e'.repeat(64),
        usage: null,
        created_at_utc: '2026-08-24T06:00:00.000Z',
      };
      await persistSyntheticExecutionClaimV1(result, hooks);
      await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
      return result;
    };

    const arenaRoot = join(root, 'qualification');
    const summary = await runArenaWithRootV1({
      trialPath: 'trial.json',
      stagingRoot: 'stage',
      manifestPath: 'manifest.json',
      outputRoot: arenaRoot,
      admissionAtUtc: '2026-08-24T06:00:00.000Z',
    }, {
      env: environment(registry),
      registry,
      runContestantFn: fakeRunner,
      sleepFn: async () => { throw new Error('delay should be zero in proof'); },
      summaryPublicationFaultHook: (() => {
        let fired = false;
        return async (phase) => {
          if (phase === 'after_stage_sync' && !fired) {
            fired = true;
            throw new Error('synthetic summary publication fault');
          }
        };
      })(),
      emitOutput: false,
    });

    assert.equal(summary.requested_contestants, 3);
    assert.equal(summary.green_contestants, 2);
    assert.equal(summary.held_contestants, 1);
    assert.equal(summary.automatic_registry_promotion, false);
    assert.equal(summary.automatic_authority_grant, false);
    assert.equal(summary.outputs_are_untrusted_evidence, true);
    assert.equal(JSON.stringify(summary).includes(TEST_KEY), false);
    assert.match(summary.records.find((x) => x.model === 'deepseek/deepseek-chat:free').hold_reason, /\[REDACTED_API_KEY\]/);
    assert.equal(summary.records.some((x) => x.model === 'other/quarantined:free'), false);
    assert.deepEqual(calls, [
      { model: 'stealth/ox-alpha', qualificationGate: '0' },
      { model: 'deepseek/deepseek-v4-flash:free', qualificationGate: '1' },
      { model: 'deepseek/deepseek-chat:free', qualificationGate: '1' },
    ]);

    const oxGreen = summary.records.find((x) => x.model === 'stealth/ox-alpha');
    assert.equal(oxGreen.run_status, 'GREEN');
    assert.match(oxGreen.accepted_recovery_key, /^[0-9a-f]{64}$/);
    assert.match(oxGreen.execution_claim_sha256, /^[0-9a-f]{64}$/);
    assert.match(oxGreen.execution_claim_semantic_sha256, /^[0-9a-f]{64}$/);
    assert.match(oxGreen.execution_claim_root_generation_sha256, /^[0-9a-f]{64}$/);

    const registryMismatchRoot = join(root, 'registry-mismatch');
    const registryB = structuredClone(registry);
    registryB.reviewed_at_utc = '2026-08-24T06:00:01.000Z';
    const registryBDigest = contestantRegistryDigestV1(registryB);
    assert.notEqual(registryBDigest, contestantRegistryDigestV1(registry));
    const mismatchSummary = await runArenaWithRootV1({
      trialPath: 'trial.json', stagingRoot: 'stage', manifestPath: 'manifest.json',
      outputRoot: registryMismatchRoot, admissionAtUtc: '2026-08-24T06:00:00.000Z',
    }, {
      env: environment(registry), registry,
      runContestantFn: async (options, hooks) => {
        const contestant = registry.contestants.find((entry) => entry.model === hooks.env.VOID_OPENROUTER_MODEL);
        const result = {
          marker: RESULT_MARKER, model_requested: contestant.model, ...executionEvidenceV1(contestant), model_canonical_slug: contestant.canonical_slug,
          qualification_status: contestant.status, scored_trial_eligible: contestant.scored_trial_eligible,
          retention_class: contestant.retention_class, privacy_class: contestant.privacy_class,
          scored_provider_allowlist: contestant.provider_policy.only, registry_policy_generation_acknowledged: registryBDigest,
          provider_policy: providerRequestPolicyV1(contestant), registry_sha256: registryBDigest, finish_reason: 'stop',
          trial_id: `voidat1_${'7'.repeat(64)}`, admission_id: `voidaa1_${'8'.repeat(64)}`, response_content_sha256: '9'.repeat(64),
        };
        await persistSyntheticExecutionClaimV1(result, hooks);
        await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
        return result;
      }, sleepFn: async () => {}, emitOutput: false,
    });
    assert.equal(mismatchSummary.green_contestants, 0);
    assert.equal(mismatchSummary.held_contestants, 3);
    for (const record of mismatchSummary.records) assert.match(record.hold_reason, /registry generation drifted/);

    const persistedSummary = JSON.parse(await readFile(join(arenaRoot, 'arena-summary.json'), 'utf8'));
    assert.equal(persistedSummary.marker, 'VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_SUMMARY_V1');
    assert.equal((await stat(join(arenaRoot, 'arena-summary.json'))).mode & 0o777, 0o600);
    assert.equal((await stat(join(arenaRoot, 'stealth_ox-alpha.contestant-result.json'))).mode & 0o777, 0o600);

    const scoredRoot = join(root, 'scored');
    const scoredCalls = [];
    const scoredSummary = await runArenaWithRootV1({
      trialPath: 'trial.json',
      stagingRoot: 'stage',
      manifestPath: 'manifest.json',
      outputRoot: scoredRoot,
      admissionAtUtc: '2026-08-24T06:00:00.000Z',
    }, {
      env: environment(registry, { VOID_OPENROUTER_ARENA_MODE: 'scored' }),
      registry,
      runContestantFn: async (options, hooks) => {
        scoredCalls.push(hooks.env.VOID_OPENROUTER_MODEL);
        const scoredContestant = registry.contestants.find((entry) => entry.model === hooks.env.VOID_OPENROUTER_MODEL);
        const result = {
          marker: RESULT_MARKER,
          model_requested: hooks.env.VOID_OPENROUTER_MODEL,
          ...executionEvidenceV1(scoredContestant),
          model_canonical_slug: scoredContestant.canonical_slug,
          qualification_status: scoredContestant.status,
          scored_trial_eligible: scoredContestant.scored_trial_eligible,
          retention_class: scoredContestant.retention_class,
          privacy_class: scoredContestant.privacy_class,
          scored_provider_allowlist: scoredContestant.provider_policy.only,
          registry_policy_generation_acknowledged: contestantRegistryDigestV1(registry),
          provider_policy: providerRequestPolicyV1(scoredContestant),
          registry_sha256: contestantRegistryDigestV1(registry),
          finish_reason: 'stop',
          trial_id: `voidat1_${'1'.repeat(64)}`,
          admission_id: `voidaa1_${'2'.repeat(64)}`,
          response_content_sha256: '3'.repeat(64),
        };
        await persistSyntheticExecutionClaimV1(result, hooks);
        await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
        return result;
      },
      sleepFn: async () => {},
      emitOutput: false,
    });
    assert.deepEqual(scoredCalls, ['stealth/ox-alpha']);
    assert.equal(scoredSummary.requested_contestants, 1);
    assert.equal(scoredSummary.green_contestants, 1);

    const collisionRegistry = {
      marker: 'VOID_APOLLYON_OPENROUTER_CONTESTANT_REGISTRY_V1',
      version: 1,
      reviewed_at_utc: '2026-08-24T06:00:00.000Z',
      default_model: 'a_b/c',
      contestants: [
        {
          model: 'a_b/c', canonical_slug: 'a_b/c-v1', status: 'qualified', scored_trial_eligible: true,
          zero_price_required: true, min_context_length: 32768, max_tokens_cap: 4096,
          retention_class: 'proof-zdr', privacy_class: 'zdr_public_or_sanitized',
          provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true, only: ['ProofProvider'] },
        },
        {
          model: 'a/b_c', canonical_slug: 'a/b_c-v1', status: 'qualification_only', scored_trial_eligible: false,
          zero_price_required: true, min_context_length: 32768, max_tokens_cap: 4096,
          retention_class: 'proof-zdr', privacy_class: 'zdr_public_or_sanitized',
          provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true, only: [] },
        },
      ],
    };
    const collisionRoot = join(root, 'collision');
    const collisionSummary = await runArenaWithRootV1({
      trialPath: 'trial.json',
      stagingRoot: 'stage',
      manifestPath: 'manifest.json',
      outputRoot: collisionRoot,
      admissionAtUtc: '2026-08-24T06:00:00.000Z',
    }, {
      env: environment(collisionRegistry),
      registry: collisionRegistry,
      runContestantFn: async (options, hooks) => {
        const collisionContestant = collisionRegistry.contestants.find((entry) => entry.model === hooks.env.VOID_OPENROUTER_MODEL);
        const result = {
          marker: RESULT_MARKER,
          model_requested: hooks.env.VOID_OPENROUTER_MODEL,
          ...executionEvidenceV1(collisionContestant),
          model_canonical_slug: collisionContestant.canonical_slug,
          qualification_status: collisionContestant.status,
          scored_trial_eligible: collisionContestant.scored_trial_eligible,
          retention_class: collisionContestant.retention_class,
          privacy_class: collisionContestant.privacy_class,
          scored_provider_allowlist: collisionContestant.provider_policy.only,
          registry_policy_generation_acknowledged: contestantRegistryDigestV1(collisionRegistry),
          provider_policy: providerRequestPolicyV1(collisionContestant),
          registry_sha256: contestantRegistryDigestV1(collisionRegistry),
          finish_reason: 'stop',
          trial_id: `voidat1_${'4'.repeat(64)}`,
          admission_id: `voidaa1_${'5'.repeat(64)}`,
          response_content_sha256: '6'.repeat(64),
        };
        await persistSyntheticExecutionClaimV1(result, hooks);
        await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
        return result;
      },
      sleepFn: async () => {},
      emitOutput: false,
    });
    assert.equal(collisionSummary.requested_contestants, 2);
    assert.equal(collisionSummary.green_contestants, 1);
    assert.equal(collisionSummary.held_contestants, 1);
    assert.match(collisionSummary.records.find((x) => x.model === 'a/b_c').hold_reason, /EEXIST/);
    assert.equal((await stat(join(collisionRoot, 'arena-summary.json'))).mode & 0o777, 0o600);

    const arenaRegistryFifo = join(root, 'arena-registry-fifo');
    assert.equal(spawnSync('mkfifo', [arenaRegistryFifo], { encoding: 'utf8' }).status, 0);
    const arenaRegistryFifoOutcome = await Promise.race([
      runArenaWithRootV1({
        trialPath: 'trial.json', stagingRoot: 'stage', manifestPath: 'manifest.json',
        outputRoot: join(root, 'arena-registry-fifo-out'), admissionAtUtc: '2026-08-24T06:00:00.000Z',
      }, {
        env: environment(registry, { VOID_OPENROUTER_ACK_REGISTRY_SHA256: '0'.repeat(64) }),
        registryPath: arenaRegistryFifo,
        runContestantFn: fakeRunner,
        emitOutput: false,
      }).then(() => ({ ok: true }), (error) => ({ ok: false, message: String(error?.message ?? error) })),
      new Promise((resolvePromise) => setTimeout(() => resolvePromise({ timeout: true }), 1000)),
    ]);
    assert.equal(arenaRegistryFifoOutcome.timeout, undefined, 'arena registry FIFO blocked');
    assert.equal(arenaRegistryFifoOutcome.ok, false);
    assert.match(arenaRegistryFifoOutcome.message, /regular non-symlink file/);

    const terminalRegistry = {
      marker: 'VOID_APOLLYON_OPENROUTER_CONTESTANT_REGISTRY_V1',
      version: 1,
      reviewed_at_utc: '2026-08-24T06:02:00.000Z',
      default_model: 'proof/model',
      contestants: [{
        model: 'proof/model', canonical_slug: 'proof/model-v1',
        status: 'qualified', scored_trial_eligible: false,
        zero_price_required: true, min_context_length: 32768, max_tokens_cap: 4096,
        retention_class: 'proof-generation', privacy_class: 'zdr_public_or_sanitized',
        provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true, only: [] },
      }],
    };

    // Root authority is an inherited fd capability. If the visible pathname is
    // replaced after the caller acquired that capability, the arena rejects
    // before any contestant execution and never adopts the foreign root.
    const rootCapabilityPath = join(root, 'root-capability');
    await mkdir(rootCapabilityPath, { mode: 0o700 });
    const callerRoot = await open(
      rootCapabilityPath,
      FS.O_RDONLY | FS.O_DIRECTORY | FS.O_NOFOLLOW,
    );
    const movedRoot = `${rootCapabilityPath}.caller-generation`;
    await rename(rootCapabilityPath, movedRoot);
    await mkdir(rootCapabilityPath, { mode: 0o700 });
    await writeFile(join(rootCapabilityPath, 'foreign.txt'), 'foreign-root-generation\n', { mode: 0o600, flag: 'wx' });
    let rootSubstitutionRunnerCalls = 0;
    try {
      await expectReject(
        runOpenRouterAlignmentArenaV1({
          trialPath: 'trial.json', stagingRoot: 'stage', manifestPath: 'manifest.json',
          outputRoot: rootCapabilityPath, admissionAtUtc: '2026-08-24T06:00:00.000Z',
        }, {
          env: environment(terminalRegistry),
          registry: terminalRegistry,
          outputRootFd: callerRoot.fd,
          runContestantFn: async () => { rootSubstitutionRunnerCalls += 1; throw new Error('must not run'); },
          emitOutput: false,
        }),
        'visible generation changed',
        'foreign output-root substitution',
      );
    } finally {
      await callerRoot.close().catch(() => {});
    }
    assert.equal(rootSubstitutionRunnerCalls, 0);
    assert.equal(await readFile(join(rootCapabilityPath, 'foreign.txt'), 'utf8'), 'foreign-root-generation\n');

    // The exact result leaf remains open across semantic checks and GREEN record
    // construction. A same-UID replacement after semantic validation must HOLD.
    const leafRoot = join(root, 'result-leaf-generation');
    const leafSummary = await runArenaWithRootV1({
      trialPath: 'trial.json', stagingRoot: 'stage', manifestPath: 'manifest.json',
      outputRoot: leafRoot, admissionAtUtc: '2026-08-24T06:00:00.000Z',
    }, {
      env: environment(terminalRegistry),
      registry: terminalRegistry,
      afterPersistedResultSemanticValidation: async ({ visibleResultPath }) => {
        const moved = `${visibleResultPath}.verified-generation`;
        await rename(visibleResultPath, moved);
        await writeFile(visibleResultPath, '{"foreign":true}\n', { mode: 0o600, flag: 'wx' });
      },
      runContestantFn: async (options, hooks) => {
        const contestant = terminalRegistry.contestants[0];
        const digest = contestantRegistryDigestV1(terminalRegistry);
        const result = {
          marker: RESULT_MARKER,
          model_requested: contestant.model,
          ...executionEvidenceV1(contestant),
          model_canonical_slug: contestant.canonical_slug,
          qualification_status: contestant.status,
          scored_trial_eligible: contestant.scored_trial_eligible,
          retention_class: contestant.retention_class,
          privacy_class: contestant.privacy_class,
          scored_provider_allowlist: contestant.provider_policy.only,
          registry_policy_generation_acknowledged: digest,
          provider_policy: providerRequestPolicyV1(contestant),
          registry_sha256: digest,
          finish_reason: 'stop',
          trial_id: `voidat1_${'4'.repeat(64)}`,
          admission_id: `voidaa1_${'5'.repeat(64)}`,
          response_content_sha256: '6'.repeat(64),
        };
        await persistSyntheticExecutionClaimV1(result, hooks);
        await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
        return result;
      },
      sleepFn: async () => {},
      emitOutput: false,
    });
    assert.equal(leafSummary.green_contestants, 0);
    assert.equal(leafSummary.held_contestants, 1);
    assert.match(leafSummary.records[0].hold_reason, /visible generation changed/);
    assert.equal(
      await readFile(join(leafRoot, 'proof_model.contestant-result.json'), 'utf8'),
      '{"foreign":true}\n',
    );

    // The exact execution-claim leaf is separate authority evidence. The arena
    // independently opens it from the retained shared claim-root generation,
    // checks exact file + semantic digests, and retains that inode through the
    // GREEN terminal. A same-UID replacement after claim semantic validation
    // must HOLD and preserve the foreign replacement.
    const claimLeafRoot = join(root, 'execution-claim-leaf-generation');
    const claimLeafSummary = await runArenaWithRootV1({
      trialPath: 'trial.json', stagingRoot: 'stage', manifestPath: 'manifest.json',
      outputRoot: claimLeafRoot, admissionAtUtc: '2026-08-24T06:00:00.000Z',
    }, {
      env: environment(terminalRegistry),
      registry: terminalRegistry,
      afterExecutionClaimSemanticValidation: async ({ claimPath }) => {
        const moved = `${claimPath}.verified-generation`;
        await rename(claimPath, moved);
        await writeFile(claimPath, '{"foreign":true}\n', { mode: 0o600, flag: 'wx' });
      },
      runContestantFn: async (options, hooks) => {
        const contestant = terminalRegistry.contestants[0];
        const digest = contestantRegistryDigestV1(terminalRegistry);
        const result = {
          marker: RESULT_MARKER,
          model_requested: contestant.model,
          ...executionEvidenceV1(contestant),
          model_canonical_slug: contestant.canonical_slug,
          qualification_status: contestant.status,
          scored_trial_eligible: contestant.scored_trial_eligible,
          retention_class: contestant.retention_class,
          privacy_class: contestant.privacy_class,
          scored_provider_allowlist: contestant.provider_policy.only,
          registry_policy_generation_acknowledged: digest,
          provider_policy: providerRequestPolicyV1(contestant),
          registry_sha256: digest,
          finish_reason: 'stop',
          trial_id: `voidat1_${'a'.repeat(64)}`,
          admission_id: `voidaa1_${'b'.repeat(64)}`,
          response_content_sha256: 'c'.repeat(64),
        };
        await persistSyntheticExecutionClaimV1(result, hooks);
        await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
        return result;
      },
      sleepFn: async () => {},
      emitOutput: false,
    });
    assert.equal(claimLeafSummary.green_contestants, 0);
    assert.equal(claimLeafSummary.held_contestants, 1);
    assert.match(claimLeafSummary.records[0].hold_reason, /visible generation changed/);
    const claimLeafKey = syntheticRecoveryKeyV1(terminalRegistry.contestants[0]);
    assert.equal(
      await readFile(
        join(
          `${claimLeafRoot}.execution-claims`,
          `.void-openrouter-execution-claim-${claimLeafKey}.json`,
        ),
        'utf8',
      ),
      '{"foreign":true}\n',
    );

    // A result cannot self-assert execution-claim authority by lying about the
    // claim file digest. The arena recomputes that digest from the exact claim
    // leaf it independently opened.
    const claimDigestRoot = join(root, 'execution-claim-digest-drift');
    const claimDigestSummary = await runArenaWithRootV1({
      trialPath: 'trial.json', stagingRoot: 'stage', manifestPath: 'manifest.json',
      outputRoot: claimDigestRoot, admissionAtUtc: '2026-08-24T06:00:00.000Z',
    }, {
      env: environment(terminalRegistry),
      registry: terminalRegistry,
      runContestantFn: async (options, hooks) => {
        const contestant = terminalRegistry.contestants[0];
        const digest = contestantRegistryDigestV1(terminalRegistry);
        const result = {
          marker: RESULT_MARKER,
          model_requested: contestant.model,
          ...executionEvidenceV1(contestant),
          model_canonical_slug: contestant.canonical_slug,
          qualification_status: contestant.status,
          scored_trial_eligible: contestant.scored_trial_eligible,
          retention_class: contestant.retention_class,
          privacy_class: contestant.privacy_class,
          scored_provider_allowlist: contestant.provider_policy.only,
          registry_policy_generation_acknowledged: digest,
          provider_policy: providerRequestPolicyV1(contestant),
          registry_sha256: digest,
          finish_reason: 'stop',
          trial_id: `voidat1_${'d'.repeat(64)}`,
          admission_id: `voidaa1_${'e'.repeat(64)}`,
          response_content_sha256: 'f'.repeat(64),
        };
        await persistSyntheticExecutionClaimV1(result, hooks);
        result.execution_claim_sha256 = '0'.repeat(64);
        await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
        return result;
      },
      sleepFn: async () => {},
      emitOutput: false,
    });
    assert.equal(claimDigestSummary.green_contestants, 0);
    assert.equal(claimDigestSummary.held_contestants, 1);
    assert.match(
      claimDigestSummary.records[0].hold_reason,
      /execution claim exact file digest drifted/,
    );


    await expectReject(
      runArenaWithRootV1({
        trialPath: 'trial.json', stagingRoot: 'stage', manifestPath: 'manifest.json',
        outputRoot: join(root, 'disabled'), admissionAtUtc: '2026-08-24T06:00:00.000Z',
      }, {
        env: environment(registry, { VOID_OPENROUTER_ARENA_ENABLE: '0' }),
        registry,
        runContestantFn: fakeRunner,
        emitOutput: false,
      }),
      'ARENA_ENABLE=1',
      'arena enable gate',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  console.log(PROOF_MARKER);
  console.log(`arena_marker=${ARENA_MARKER}`);
  console.log('qualification_mode_includes_qualified_and_qualification_only=true');
  console.log('scored_mode_includes_qualified_only=true');
  console.log('quarantined_excluded=true');
  console.log('qualification_gate_per_model=true');
  console.log('sequential_no_retry_or_parallel_fanout=true');
  console.log('persisted_result_binding=true');
  console.log('green_result_registry_generation_bound=true');
  console.log('green_result_capability_fields_bound=true');
  console.log('nominal_fake_reported_model_matches_execution_generation=true');
  console.log('output_root_inherited_fd_capability_bound=true');
  console.log('output_root_foreign_generation_not_adopted=true');
  console.log('per_model_directory_create_open_surface_removed=true');
  console.log('result_leaf_generation_retained_through_green_terminal=true');
  console.log('result_leaf_replacement_generation_holds=true');
  console.log('result_file_sha256_bound=true');
  console.log('execution_claim_root_inherited_fd_capability_bound=true');
  console.log('execution_claim_evidence_independently_verified=true');
  console.log('execution_claim_exact_file_sha256_bound=true');
  console.log('execution_claim_semantic_sha256_bound=true');
  console.log('execution_claim_leaf_generation_retained_through_green_terminal=true');
  console.log('execution_claim_leaf_replacement_generation_holds=true');
  console.log('foreign_execution_claim_leaf_preserved=true');
  console.log('execution_claim_result_self_assertion_rejected=true');
  console.log('foreign_result_leaf_preserved=true');
  console.log('summary_publication_failure_atomic_recoverable=true');
  console.log('arena_registry_nonregular_leaf_nonblocking=true');
  console.log('canonical_model_generation_persisted=true');
  console.log('registry_policy_ack_generation_bound=true');
  console.log('per_contestant_setup_failure_contained=true');
  console.log('api_key_redacted_from_hold_summary=true');
  console.log('automatic_registry_promotion=false');
  console.log('automatic_authority_grant=false');
  console.log('live_provider_call=false');
}

await main();
