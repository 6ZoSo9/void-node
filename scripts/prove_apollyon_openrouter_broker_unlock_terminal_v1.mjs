#!/usr/bin/env node
import assert from 'node:assert/strict';
import { constants as FS } from 'node:fs';
import { lstat, mkdir, mkdtemp, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  acceptedResultDigestV1,
  publishAcceptedResultCapsuleV1,
  readAcceptedResultCapsuleV1,
  recoverAcceptedResultCapsuleCandidateV1,
} from './apollyon_accepted_result_capsule_v1.mjs';
import { prepareBrokerOperationV1 } from './apollyon_execution_broker_prepare_v1.mjs';
import { replayBrokerStateFromLedgerV1 } from './apollyon_execution_broker_replay_v1.mjs';
import { BROKER_STATE_V1 } from './apollyon_execution_broker_v1.mjs';
import { loadLedgerRecordsV1 } from './apollyon_execution_ledger_load_v1.mjs';
import { LEDGER_EVENT_V1 } from './apollyon_execution_ledger_record_v1.mjs';
import { buildOpenRouterBrokerBindingV1 } from './apollyon_openrouter_broker_binding_v1.mjs';
import { openOperationLedgerNamespaceV1 } from './apollyon_execution_ledger_namespace_v1.mjs';
import { openPinnedLedgerDirectoryV1 } from './apollyon_execution_ledger_publish_v1.mjs';
import {
  recoverBrokerProviderAcceptedResultV1,
  runBrokerProviderAttemptV1,
} from './apollyon_execution_provider_boundary_v1.mjs';

const root = await mkdtemp(join(tmpdir(), 'void-broker-unlock-terminal-v1-'));
const ledgerPath = join(root, 'ledger');
const acceptedPath = join(root, 'accepted');
await mkdir(ledgerPath, { mode: 0o700 });
await mkdir(acceptedPath, { mode: 0o700 });

const ledgerRoot = await open(ledgerPath, FS.O_RDONLY | FS.O_DIRECTORY | FS.O_NOFOLLOW);
const acceptedRoot = await openPinnedLedgerDirectoryV1(acceptedPath);
let ns = null;
let ns2 = null;
const recoveryNamespaces = [];

function capsulePaths(binding) {
  const prefix = 'apollyon_op_v1:';
  assert.equal(binding.operationId.startsWith(prefix), true);
  const hex = binding.operationId.slice(prefix.length);
  return {
    stage: join(acceptedPath, `.accepted-result-stage-v1-${hex}.json`),
    final: join(acceptedPath, `accepted-result-v1-${hex}.json`),
  };
}
async function lstatOrNull(path) {
  try { return await lstat(path, { bigint: true }); }
  catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
}
async function replaceStageWithDistinctForeign(stagePath, tag) {
  const foreignPath = `${stagePath}.${tag}.foreign`;
  await writeFile(foreignPath, `foreign-${tag}\n`, { mode: 0o600, flag: 'wx' });
  const original = await lstat(stagePath, { bigint: true });
  const foreign = await lstat(foreignPath, { bigint: true });
  assert.equal(original.dev, foreign.dev);
  assert.notEqual(original.ino, foreign.ino);
  await rename(foreignPath, stagePath);
  const visible = await lstat(stagePath, { bigint: true });
  assert.equal(visible.dev, foreign.dev);
  assert.equal(visible.ino, foreign.ino);
  return { original, foreign };
}

try {
  const binding = buildOpenRouterBrokerBindingV1({
    logicalOperationIntentDigest: 'a'.repeat(64),
    registrySha256: 'b'.repeat(64),
    requestBody: { proof: 'unlock-terminal' },
    contestant: { proof: 'synthetic' },
  });
  ns = await openOperationLedgerNamespaceV1(ledgerRoot, binding.operationId);
  await prepareBrokerOperationV1(ns.directoryHandle, binding);

  const value = Object.freeze({
    marker: 'VOID_APOLLYON_UNLOCK_TERMINAL_PROOF_RESULT_V1',
    content: 'durably accepted despite synthetic unlock failure',
  });
  const resultDigest = acceptedResultDigestV1(value);
  let sendCount = 0;

  const receipt = await runBrokerProviderAttemptV1(
    ns.directoryHandle,
    acceptedRoot,
    async () => {
      sendCount += 1;
      return { resultDigest, value };
    },
    binding,
    {
      beforeUnlock: ({ acceptedTerminalCommitted }) => {
        assert.equal(acceptedTerminalCommitted, true);
        throw new Error('synthetic post-commit unlock failure');
      },
    },
  );

  assert.equal(sendCount, 1);
  assert.equal(receipt.resultDigest, resultDigest);
  assert.deepEqual(receipt.value, value);
  const acceptedRecords = await loadLedgerRecordsV1(ns.directoryHandle);
  assert.equal(acceptedRecords.length, 5);
  assert.equal(acceptedRecords[3].type, LEDGER_EVENT_V1.RESULT_WITNESSED);
  assert.equal(acceptedRecords[3].resultDigest, resultDigest);
  assert.equal(acceptedRecords[4].type, LEDGER_EVENT_V1.PROVIDER_RESULT);
  assert.equal(acceptedRecords[4].resultDigest, resultDigest);
  const acceptedState = replayBrokerStateFromLedgerV1(acceptedRecords);
  assert.equal(acceptedState.phase, BROKER_STATE_V1.ACCEPTED);
  assert.equal(acceptedState.acceptedDigest, resultDigest);

  const basePaths = capsulePaths(binding);
  const baseStageStat = await lstat(basePaths.stage, { bigint: true });
  const baseFinalStat = await lstat(basePaths.final, { bigint: true });
  assert.equal(baseStageStat.dev, baseFinalStat.dev);
  assert.equal(baseStageStat.ino, baseFinalStat.ino);
  assert.equal(baseFinalStat.nlink, 2n);

  const recoveredSameHandle = await readAcceptedResultCapsuleV1(
    acceptedRoot,
    ns.directoryHandle,
    binding,
  );
  assert.equal(recoveredSameHandle.resultDigest, resultDigest);
  assert.deepEqual(recoveredSameHandle.value, value);

  await assert.rejects(
    runBrokerProviderAttemptV1(
      ns.directoryHandle,
      acceptedRoot,
      async () => {
        sendCount += 1;
        return { resultDigest, value };
      },
      binding,
    ),
    /already locally held/,
  );
  assert.equal(sendCount, 1);

  await ns.directoryHandle.handle.close();
  ns = null;
  ns2 = await openOperationLedgerNamespaceV1(ledgerRoot, binding.operationId);

  const recovered = await readAcceptedResultCapsuleV1(
    acceptedRoot,
    ns2.directoryHandle,
    binding,
  );
  assert.equal(recovered.resultDigest, resultDigest);
  assert.deepEqual(recovered.value, value);

  await assert.rejects(
    runBrokerProviderAttemptV1(
      ns2.directoryHandle,
      acceptedRoot,
      async () => {
        sendCount += 1;
        return { resultDigest, value };
      },
      binding,
    ),
    /not RESERVED/,
  );
  assert.equal(sendCount, 1);

  // Every accepted-capsule publication fault now precedes RESULT_WITNESSED. The provider has
  // executed exactly once and durable state is UNCERTAIN, but no witness may claim recoverable
  // bytes. This deliberately trades liveness before witness for a strict invariant: once witness
  // exists, the exact accepted bytes already exist durably.
  const preWitnessFaults = [
    'duringStageWrite',
    'afterStageWrite',
    'afterStageSync',
    'afterStageDirSync',
    'afterFinalLink',
    'afterFinalDirSync',
    'beforeReadback',
  ];
  let recoverySendCount = 0;
  let proofIndex = 0;
  for (const faultAt of preWitnessFaults) {
    proofIndex += 1;
    const rb = buildOpenRouterBrokerBindingV1({
      logicalOperationIntentDigest: proofIndex.toString(16).padStart(64, '0'),
      registrySha256: 'c'.repeat(64), requestBody: { proof: 'capsule-pre-witness-fault', faultAt },
      contestant: { proof: 'synthetic' },
    });
    const first = await openOperationLedgerNamespaceV1(ledgerRoot, rb.operationId);
    await prepareBrokerOperationV1(first.directoryHandle, rb);
    const rv = Object.freeze({
      marker: 'VOID_APOLLYON_CAPSULE_PRE_WITNESS_FAULT_RESULT_V1', faultAt,
      content: `exact provider result for ${faultAt}`,
    });
    const rd = acceptedResultDigestV1(rv);
    await assert.rejects(
      runBrokerProviderAttemptV1(
        first.directoryHandle, acceptedRoot,
        async () => { recoverySendCount += 1; return { resultDigest: rd, value: rv }; },
        rb, { acceptedCapsuleFaultAt: faultAt },
      ),
      /synthetic accepted-capsule fault/,
    );
    const records = await loadLedgerRecordsV1(first.directoryHandle);
    const state = replayBrokerStateFromLedgerV1(records);
    assert.equal(state.phase, BROKER_STATE_V1.UNCERTAIN);
    assert.equal(state.acceptedDigest, null);
    assert.equal(records[records.length - 1].type, LEDGER_EVENT_V1.PROVIDER_ADMITTED);
    assert.equal(records.some((r) => r.type === LEDGER_EVENT_V1.RESULT_WITNESSED), false);
    assert.equal(records.some((r) => r.type === LEDGER_EVENT_V1.PROVIDER_RESULT), false);
    await first.directoryHandle.handle.close();
    const reopened = await openOperationLedgerNamespaceV1(ledgerRoot, rb.operationId);
    recoveryNamespaces.push(reopened);
    const refused = await recoverBrokerProviderAcceptedResultV1(reopened.directoryHandle, acceptedRoot, rb);
    assert.equal(refused, null);
    await assert.rejects(
      runBrokerProviderAttemptV1(
        reopened.directoryHandle, acceptedRoot,
        async () => { recoverySendCount += 1; return { resultDigest: rd, value: rv }; }, rb,
      ),
      /not RESERVED/,
    );
  }
  assert.equal(recoverySendCount, preWitnessFaults.length);

  // Once RESULT_WITNESSED exists, exact final bytes have already passed the guarded durability
  // transaction. A crash immediately after witness but before PROVIDER_RESULT must therefore
  // converge to those exact bytes with zero second provider execution.
  const postWitnessBinding = buildOpenRouterBrokerBindingV1({
    logicalOperationIntentDigest: '6'.repeat(64),
    registrySha256: 'c'.repeat(64), requestBody: { proof: 'post-witness-recovery' },
    contestant: { proof: 'synthetic' },
  });
  const postWitnessNs = await openOperationLedgerNamespaceV1(ledgerRoot, postWitnessBinding.operationId);
  await prepareBrokerOperationV1(postWitnessNs.directoryHandle, postWitnessBinding);
  const postWitnessValue = Object.freeze({ marker: 'VOID_POST_WITNESS_RECOVERY_V1', exact: true });
  const postWitnessDigest = acceptedResultDigestV1(postWitnessValue);
  let postWitnessSendCount = 0;
  await assert.rejects(
    runBrokerProviderAttemptV1(
      postWitnessNs.directoryHandle,
      acceptedRoot,
      async () => {
        postWitnessSendCount += 1;
        return { resultDigest: postWitnessDigest, value: postWitnessValue };
      },
      postWitnessBinding,
      { afterWitness: () => { throw new Error('synthetic crash after durable result witness'); } },
    ),
    /synthetic crash after durable result witness/,
  );
  assert.equal(postWitnessSendCount, 1);
  const postWitnessRecords = await loadLedgerRecordsV1(postWitnessNs.directoryHandle);
  const postWitnessState = replayBrokerStateFromLedgerV1(postWitnessRecords);
  assert.equal(postWitnessState.phase, BROKER_STATE_V1.RESULT_WITNESSED);
  assert.equal(postWitnessState.acceptedDigest, postWitnessDigest);
  assert.equal(postWitnessRecords[postWitnessRecords.length - 1].type, LEDGER_EVENT_V1.RESULT_WITNESSED);
  await postWitnessNs.directoryHandle.handle.close();
  const postWitnessReopened = await openOperationLedgerNamespaceV1(ledgerRoot, postWitnessBinding.operationId);
  recoveryNamespaces.push(postWitnessReopened);
  const postWitnessRecovered = await recoverBrokerProviderAcceptedResultV1(
    postWitnessReopened.directoryHandle,
    acceptedRoot,
    postWitnessBinding,
  );
  assert.ok(postWitnessRecovered);
  assert.equal(postWitnessRecovered.recoveredWithoutProviderSend, true);
  assert.equal(postWitnessRecovered.resultDigest, postWitnessDigest);
  assert.deepEqual(postWitnessRecovered.value, postWitnessValue);
  assert.equal(postWitnessSendCount, 1);
  const postWitnessDurable = await readAcceptedResultCapsuleV1(
    acceptedRoot,
    postWitnessReopened.directoryHandle,
    postWitnessBinding,
  );
  assert.equal(postWitnessDurable.resultDigest, postWitnessDigest);
  assert.deepEqual(postWitnessDurable.value, postWitnessValue);

  // Exact A->B->A final-dentry fsync adversary. The inner capsule publisher has already returned A.
  // During the durability transaction's authoritative second parent fsync, B occupies the canonical
  // final name. A is restored only after that fsync. Endpoint pathname checks would see A before/after;
  // the accepted-root directory generation epoch must detect the hidden mutation and refuse witness.
  const epochBinding = buildOpenRouterBrokerBindingV1({
    logicalOperationIntentDigest: '5'.repeat(64),
    registrySha256: 'c'.repeat(64), requestBody: { proof: 'final-dentry-fsync-epoch-adversary' },
    contestant: { proof: 'synthetic' },
  });
  const epochNs = await openOperationLedgerNamespaceV1(ledgerRoot, epochBinding.operationId);
  recoveryNamespaces.push(epochNs);
  await prepareBrokerOperationV1(epochNs.directoryHandle, epochBinding);
  const epochValue = Object.freeze({ marker: 'VOID_FINAL_DENTRY_FSYNC_EPOCH_A_V1', exact: true });
  const epochDigest = acceptedResultDigestV1(epochValue);
  const epochPaths = capsulePaths(epochBinding);
  const savedA = `${epochPaths.final}.epoch-a.saved`;
  const foreignSource = `${epochPaths.final}.epoch-b.source`;
  const savedB = `${epochPaths.final}.epoch-b.preserved`;
  let epochA = null;
  let epochB = null;
  let epochSendCount = 0;
  await assert.rejects(
    runBrokerProviderAttemptV1(
      epochNs.directoryHandle,
      acceptedRoot,
      async () => {
        epochSendCount += 1;
        return { resultDigest: epochDigest, value: epochValue };
      },
      epochBinding,
      {
        acceptedCapsuleBeforeDurabilitySync: async ({ finalPath, finalDev, finalIno }) => {
          assert.equal(finalPath.endsWith(epochPaths.final.split('/').pop()), true);
          await writeFile(foreignSource, 'foreign-final-epoch-b\n', { mode: 0o600, flag: 'wx' });
          epochA = await lstat(epochPaths.final, { bigint: true });
          epochB = await lstat(foreignSource, { bigint: true });
          assert.equal(epochA.dev, finalDev);
          assert.equal(epochA.ino, finalIno);
          assert.notEqual(epochA.ino, epochB.ino);
          await rename(epochPaths.final, savedA);
          await rename(foreignSource, epochPaths.final);
          const during = await lstat(epochPaths.final, { bigint: true });
          assert.equal(during.ino, epochB.ino);
        },
        acceptedCapsuleAfterDurabilitySync: async () => {
          const during = await lstat(epochPaths.final, { bigint: true });
          assert.equal(during.ino, epochB.ino);
          await rename(epochPaths.final, savedB);
          await rename(savedA, epochPaths.final);
        },
      },
    ),
    /root directory generation changed across final-dentry durability fsync epoch/,
  );
  assert.equal(epochSendCount, 1);
  const epochFinal = await lstat(epochPaths.final, { bigint: true });
  const epochForeign = await lstat(savedB, { bigint: true });
  assert.equal(epochFinal.ino, epochA.ino);
  assert.equal(epochForeign.ino, epochB.ino);
  assert.equal(String(await readFile(savedB)), 'foreign-final-epoch-b\n');
  const epochRecords = await loadLedgerRecordsV1(epochNs.directoryHandle);
  const epochState = replayBrokerStateFromLedgerV1(epochRecords);
  assert.equal(epochState.phase, BROKER_STATE_V1.UNCERTAIN);
  assert.equal(epochState.acceptedDigest, null);
  assert.equal(epochRecords.some((r) => r.type === LEDGER_EVENT_V1.RESULT_WITNESSED), false);
  assert.equal(epochRecords.some((r) => r.type === LEDGER_EVENT_V1.PROVIDER_RESULT), false);
  await assert.rejects(
    runBrokerProviderAttemptV1(
      epochNs.directoryHandle,
      acceptedRoot,
      async () => { epochSendCount += 1; return { resultDigest: epochDigest, value: epochValue }; },
      epochBinding,
    ),
    /not RESERVED/,
  );
  assert.equal(epochSendCount, 1);

  // A fully canonical capsule is consumer evidence, not post-send authority. Establish durable
  // UNCERTAIN via an ambiguous synthetic send with no returned result/witness, then inject a
  // self-consistent capsule. Recovery must append zero PROVIDER_RESULT and restore zero send authority.
  const unwitnessedBinding = buildOpenRouterBrokerBindingV1({
    logicalOperationIntentDigest: '7'.repeat(64),
    registrySha256: 'e'.repeat(64), requestBody: { proof: 'unwitnessed-foreign-capsule' },
    contestant: { proof: 'synthetic' },
  });
  const unwitnessedNs = await openOperationLedgerNamespaceV1(ledgerRoot, unwitnessedBinding.operationId);
  recoveryNamespaces.push(unwitnessedNs);
  await prepareBrokerOperationV1(unwitnessedNs.directoryHandle, unwitnessedBinding);
  const unwitnessedValue = Object.freeze({ marker: 'VOID_UNWITNESSED_FOREIGN_CAPSULE_V1', exact: true });
  const unwitnessedDigest = acceptedResultDigestV1(unwitnessedValue);
  let ambiguousSendCount = 0;
  await assert.rejects(
    runBrokerProviderAttemptV1(
      unwitnessedNs.directoryHandle, acceptedRoot,
      async () => { ambiguousSendCount += 1; throw new Error('synthetic ambiguous provider outcome'); },
      unwitnessedBinding,
    ),
    /synthetic ambiguous provider outcome/,
  );
  assert.equal(ambiguousSendCount, 1);
  const preForeignRecords = await loadLedgerRecordsV1(unwitnessedNs.directoryHandle);
  const preForeignState = replayBrokerStateFromLedgerV1(preForeignRecords);
  assert.equal(preForeignState.phase, BROKER_STATE_V1.UNCERTAIN);
  assert.equal(preForeignState.acceptedDigest, null);
  assert.equal(preForeignRecords[preForeignRecords.length - 1].type, LEDGER_EVENT_V1.PROVIDER_ADMITTED);
  assert.equal(preForeignRecords.some((r) => r.type === LEDGER_EVENT_V1.RESULT_WITNESSED), false);
  assert.equal(preForeignRecords.some((r) => r.type === LEDGER_EVENT_V1.PROVIDER_RESULT), false);

  await publishAcceptedResultCapsuleV1(
    acceptedRoot, unwitnessedBinding, unwitnessedDigest, unwitnessedValue,
  );
  const unwitnessedPaths = capsulePaths(unwitnessedBinding);
  const unwitnessedBefore = await lstat(unwitnessedPaths.final, { bigint: true });
  const refusedForeign = await recoverBrokerProviderAcceptedResultV1(
    unwitnessedNs.directoryHandle, acceptedRoot, unwitnessedBinding,
  );
  assert.equal(refusedForeign, null);
  const postForeignRecords = await loadLedgerRecordsV1(unwitnessedNs.directoryHandle);
  const postForeignState = replayBrokerStateFromLedgerV1(postForeignRecords);
  assert.equal(postForeignRecords.length, preForeignRecords.length);
  assert.equal(postForeignState.phase, BROKER_STATE_V1.UNCERTAIN);
  assert.equal(postForeignState.acceptedDigest, null);
  assert.equal(postForeignRecords.some((r) => r.type === LEDGER_EVENT_V1.RESULT_WITNESSED), false);
  assert.equal(postForeignRecords.some((r) => r.type === LEDGER_EVENT_V1.PROVIDER_RESULT), false);
  const unwitnessedAfter = await lstat(unwitnessedPaths.final, { bigint: true });
  assert.equal(unwitnessedAfter.dev, unwitnessedBefore.dev);
  assert.equal(unwitnessedAfter.ino, unwitnessedBefore.ino);
  await assert.rejects(
    runBrokerProviderAttemptV1(
      unwitnessedNs.directoryHandle, acceptedRoot,
      async () => { ambiguousSendCount += 1; return { resultDigest: unwitnessedDigest, value: unwitnessedValue }; },
      unwitnessedBinding,
    ),
    /not RESERVED/,
  );
  assert.equal(ambiguousSendCount, 1);

  // Deterministic generation substitution 1/3: publisher validates A through its retained fd,
  // then B atomically replaces stagePath. B must never become final and must be preserved.
  const publisherRaceBinding = buildOpenRouterBrokerBindingV1({
    logicalOperationIntentDigest: '8'.padStart(64, '0'),
    registrySha256: 'd'.repeat(64), requestBody: { proof: 'publisher-generation-substitution' },
    contestant: { proof: 'synthetic' },
  });
  const publisherRaceValue = Object.freeze({ marker: 'V44_PUBLISHER_GENERATION_A', exact: true });
  const publisherRaceDigest = acceptedResultDigestV1(publisherRaceValue);
  const publisherRacePaths = capsulePaths(publisherRaceBinding);
  let publisherForeign = null;
  await assert.rejects(
    publishAcceptedResultCapsuleV1(
      acceptedRoot, publisherRaceBinding, publisherRaceDigest, publisherRaceValue,
      {
        beforeFinalLink: async ({ stagePath, stageDev, stageIno }) => {
          const swap = await replaceStageWithDistinctForeign(stagePath, 'publisher');
          assert.equal(swap.original.dev, stageDev);
          assert.equal(swap.original.ino, stageIno);
          publisherForeign = swap.foreign;
        },
      },
    ),
    /retained accepted result stage before final publication link count 0 is not reviewed/,
  );
  assert.equal(await lstatOrNull(publisherRacePaths.final), null);
  const publisherVisible = await lstat(publisherRacePaths.stage, { bigint: true });
  assert.equal(publisherVisible.dev, publisherForeign.dev);
  assert.equal(publisherVisible.ino, publisherForeign.ino);

  // Deterministic generation substitution 2/3: recovery retains A's read fd while B replaces
  // stagePath. The exact same failure mode must HOLD before any final publication.
  const recoveryRaceBinding = buildOpenRouterBrokerBindingV1({
    logicalOperationIntentDigest: '9'.padStart(64, '0'),
    registrySha256: 'd'.repeat(64), requestBody: { proof: 'recovery-generation-substitution' },
    contestant: { proof: 'synthetic' },
  });
  const recoveryRaceValue = Object.freeze({ marker: 'V44_RECOVERY_GENERATION_A', exact: true });
  const recoveryRaceDigest = acceptedResultDigestV1(recoveryRaceValue);
  const recoveryRacePaths = capsulePaths(recoveryRaceBinding);
  await assert.rejects(
    publishAcceptedResultCapsuleV1(
      acceptedRoot, recoveryRaceBinding, recoveryRaceDigest, recoveryRaceValue,
      { faultAt: 'afterStageDirSync' },
    ),
    /synthetic accepted-capsule fault at afterStageDirSync/,
  );
  let recoveryForeign = null;
  await assert.rejects(
    recoverAcceptedResultCapsuleCandidateV1(
      acceptedRoot, recoveryRaceBinding,
      {
        beforeFinalLink: async ({ stagePath, stageDev, stageIno }) => {
          const swap = await replaceStageWithDistinctForeign(stagePath, 'recovery');
          assert.equal(swap.original.dev, stageDev);
          assert.equal(swap.original.ino, stageIno);
          recoveryForeign = swap.foreign;
        },
      },
    ),
    /retained recovered stage before final publication link count 0 is not reviewed/,
  );
  assert.equal(await lstatOrNull(recoveryRacePaths.final), null);
  const recoveryVisible = await lstat(recoveryRacePaths.stage, { bigint: true });
  assert.equal(recoveryVisible.dev, recoveryForeign.dev);
  assert.equal(recoveryVisible.ino, recoveryForeign.ino);

  // Deterministic generation substitution 3/3: B replaces the stage name after exact A is
  // already linked to final. Publication succeeds on A and B survives because cleanup never
  // unlinks a mutable pathname.
  const cleanupRaceBinding = buildOpenRouterBrokerBindingV1({
    logicalOperationIntentDigest: 'a'.padStart(64, '0'),
    registrySha256: 'd'.repeat(64), requestBody: { proof: 'cleanup-generation-substitution' },
    contestant: { proof: 'synthetic' },
  });
  const cleanupRaceValue = Object.freeze({ marker: 'V44_CLEANUP_GENERATION_A', exact: true });
  const cleanupRaceDigest = acceptedResultDigestV1(cleanupRaceValue);
  const cleanupRacePaths = capsulePaths(cleanupRaceBinding);
  let cleanupOwnedIno = null;
  let cleanupForeign = null;
  const cleanupPublished = await publishAcceptedResultCapsuleV1(
    acceptedRoot, cleanupRaceBinding, cleanupRaceDigest, cleanupRaceValue,
    {
      afterFinalLink: async ({ stagePath, stageDev, stageIno }) => {
        cleanupOwnedIno = stageIno;
        const swap = await replaceStageWithDistinctForeign(stagePath, 'cleanup');
        assert.equal(swap.original.dev, stageDev);
        assert.equal(swap.original.ino, stageIno);
        cleanupForeign = swap.foreign;
      },
    },
  );
  assert.equal(cleanupPublished.resultDigest, cleanupRaceDigest);
  assert.deepEqual(cleanupPublished.value, cleanupRaceValue);
  const cleanupFinal = await lstat(cleanupRacePaths.final, { bigint: true });
  const cleanupStage = await lstat(cleanupRacePaths.stage, { bigint: true });
  assert.equal(cleanupFinal.ino, cleanupOwnedIno);
  assert.equal(cleanupStage.ino, cleanupForeign.ino);
  assert.notEqual(cleanupStage.ino, cleanupFinal.ino);
  assert.equal(String(await readFile(cleanupRacePaths.stage)), 'foreign-cleanup\n');

  console.log(
    'VOID_OPENROUTER_BROKER_UNLOCK_TERMINAL_V1_PROOF_GREEN '
    + 'durable_accepted_survives_unlock_failure=true '
    + 'capsule_durable_before_result_witness=true unwitnessed_capsule_no_accept=true '
    + 'pre_witness_fault_matrix=7/7 post_witness_recovery_no_resend=true '
    + 'final_dentry_fsync_epoch_bound=true dentry_epoch_adversary_blocked=true '
    + 'generation_substitution_matrix=3/3 stage_alias_retained=true '
    + `send_count=${sendCount} pre_witness_send_count=${recoverySendCount} post_witness_send_count=${postWitnessSendCount}`
  );
} finally {
  if (ns) await ns.directoryHandle.handle.close().catch(() => {});
  if (ns2) await ns2.directoryHandle.handle.close().catch(() => {});
  for (const item of recoveryNamespaces) await item.directoryHandle.handle.close().catch(() => {});
  await acceptedRoot.handle.close().catch(() => {});
  await ledgerRoot.close().catch(() => {});
  await rm(root, { recursive: true, force: true });
}
