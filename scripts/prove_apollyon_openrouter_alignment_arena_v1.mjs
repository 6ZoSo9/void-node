#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { RESULT_MARKER } from './apollyon_openrouter_ox_alpha_adapter_v1.mjs';
import {
  ARENA_MARKER,
  runOpenRouterAlignmentArenaV1,
  selectArenaContestantsV1,
} from './apollyon_openrouter_alignment_arena_v1.mjs';

const PROOF_MARKER = 'VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_V1_PROOF_GREEN';
const TEST_KEY = 'openrouter-arena-test-key-not-secret-123456';

function fixtureRegistry() {
  return {
    marker: 'VOID_APOLLYON_OPENROUTER_CONTESTANT_REGISTRY_V1',
    version: 1,
    reviewed_at_utc: '2026-08-24T06:00:00.000Z',
    default_model: 'stealth/ox-alpha',
    contestants: [
      {
        model: 'stealth/ox-alpha', status: 'qualified', scored_trial_eligible: true,
        zero_price_required: true, min_context_length: 262144, max_tokens_cap: 32768,
        retention_class: 'retained-provider-preview',
        provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: null, zdr: false, only: [] },
      },
      {
        model: 'deepseek/deepseek-v4-flash:free', status: 'qualification_only', scored_trial_eligible: false,
        zero_price_required: true, min_context_length: 1048576, max_tokens_cap: 32768,
        retention_class: 'qualification-zdr-required',
        provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true, only: [] },
      },
      {
        model: 'deepseek/deepseek-chat:free', status: 'qualification_only', scored_trial_eligible: false,
        zero_price_required: true, min_context_length: 131072, max_tokens_cap: 32768,
        retention_class: 'qualification-zdr-required',
        provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true, only: [] },
      },
      {
        model: 'other/quarantined:free', status: 'quarantined', scored_trial_eligible: false,
        zero_price_required: true, min_context_length: 32768, max_tokens_cap: 4096,
        retention_class: 'quarantined',
        provider_policy: { allow_fallbacks: false, require_parameters: true, data_collection: null, zdr: false, only: [] },
      },
    ],
  };
}

function environment(overrides = {}) {
  return {
    VOID_OPENROUTER_ARENA_ENABLE: '1',
    VOID_OPENROUTER_ENABLE: '1',
    VOID_OPENROUTER_ACK_PROVIDER_POLICY: '1',
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
      const result = {
        marker: RESULT_MARKER,
        provider: 'openrouter',
        model_requested: model,
        model_reported: model,
        qualification_status: model === 'stealth/ox-alpha' ? 'qualified' : 'qualification_only',
        scored_trial_eligible: model === 'stealth/ox-alpha',
        retention_class: 'proof',
        provider_policy_acknowledged: true,
        pricing_verified_zero: true,
        provider_policy: { allow_fallbacks: false, require_parameters: true },
        tools_exposed: false,
        registry_sha256: 'a'.repeat(64),
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
      await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
      return result;
    };

    const arenaRoot = join(root, 'qualification');
    const summary = await runOpenRouterAlignmentArenaV1({
      trialPath: 'trial.json',
      stagingRoot: 'stage',
      manifestPath: 'manifest.json',
      outputRoot: arenaRoot,
      admissionAtUtc: '2026-08-24T06:00:00.000Z',
    }, {
      env: environment(),
      registry,
      runContestantFn: fakeRunner,
      sleepFn: async () => { throw new Error('delay should be zero in proof'); },
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

    const persistedSummary = JSON.parse(await readFile(join(arenaRoot, 'arena-summary.json'), 'utf8'));
    assert.equal(persistedSummary.marker, 'VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_SUMMARY_V1');
    assert.equal((await stat(join(arenaRoot, 'arena-summary.json'))).mode & 0o777, 0o600);
    assert.equal((await stat(join(arenaRoot, 'stealth_ox-alpha', 'contestant-result.json'))).mode & 0o777, 0o600);

    const scoredRoot = join(root, 'scored');
    const scoredCalls = [];
    const scoredSummary = await runOpenRouterAlignmentArenaV1({
      trialPath: 'trial.json',
      stagingRoot: 'stage',
      manifestPath: 'manifest.json',
      outputRoot: scoredRoot,
      admissionAtUtc: '2026-08-24T06:00:00.000Z',
    }, {
      env: environment({ VOID_OPENROUTER_ARENA_MODE: 'scored' }),
      registry,
      runContestantFn: async (options, hooks) => {
        scoredCalls.push(hooks.env.VOID_OPENROUTER_MODEL);
        const result = {
          marker: RESULT_MARKER,
          model_requested: hooks.env.VOID_OPENROUTER_MODEL,
          trial_id: `voidat1_${'1'.repeat(64)}`,
          admission_id: `voidaa1_${'2'.repeat(64)}`,
          response_content_sha256: '3'.repeat(64),
        };
        await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
        return result;
      },
      sleepFn: async () => {},
      emitOutput: false,
    });
    assert.deepEqual(scoredCalls, ['stealth/ox-alpha']);
    assert.equal(scoredSummary.requested_contestants, 1);
    assert.equal(scoredSummary.green_contestants, 1);

    await expectReject(
      runOpenRouterAlignmentArenaV1({
        trialPath: 'trial.json', stagingRoot: 'stage', manifestPath: 'manifest.json',
        outputRoot: join(root, 'disabled'), admissionAtUtc: '2026-08-24T06:00:00.000Z',
      }, {
        env: environment({ VOID_OPENROUTER_ARENA_ENABLE: '0' }),
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
  console.log('api_key_redacted_from_hold_summary=true');
  console.log('automatic_registry_promotion=false');
  console.log('automatic_authority_grant=false');
  console.log('live_provider_call=false');
}

await main();
