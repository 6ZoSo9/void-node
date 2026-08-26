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

  const recoveryFaults = [
    ['duringStageWrite', 'HOLD'],
    ['afterStageWrite', 'RECOVER'],
    ['afterStageSync', 'RECOVER'],
    ['afterStageDirSync', 'RECOVER'],
    ['afterFinalLink', 'RECOVER'],
    ['afterFinalDirSync', 'RECOVER'],
    ['beforeReadback', 'RECOVER'],
  ];
  let recoverySendCount = 0;
  let proofIndex = 0;
  for (const [faultAt, expected] of recoveryFaults) {
    proofIndex += 1;
    const rb = buildOpenRouterBrokerBindingV1({
      logicalOperationIntentDigest: proofIndex.toString(16).padStart(64, '0'),
      registrySha256: 'c'.repeat(64), requestBody: { proof: 'capsule-recovery', faultAt },
      contestant: { proof: 'synthetic' },
    });
    const first = await openOperationLedgerNamespaceV1(ledgerRoot, rb.operationId);
    await prepareBrokerOperationV1(first.directoryHandle, rb);
    const rv = Object.freeze({
      marker: 'VOID_APOLLYON_CAPSULE_RECOVERY_PROOF_RESULT_V1', faultAt,
      content: `exact accepted result for ${faultAt}`,
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
    await first.directoryHandle.handle.close();
    const reopened = await openOperationLedgerNamespaceV1(ledgerRoot, rb.operationId);
    recoveryNamespaces.push(reopened);
    if (expected === 'RECOVER') {
      const recoveredFault = await recoverBrokerProviderAcceptedResultV1(reopened.directoryHandle, acceptedRoot, rb);
      assert.ok(recoveredFault);
      assert.equal(recoveredFault.recoveredWithoutProviderSend, true);
      assert.equal(recoveredFault.resultDigest, rd);
      assert.deepEqual(recoveredFault.value, rv);
      const durable = await readAcceptedResultCapsuleV1(acceptedRoot, reopened.directoryHandle, rb);
      assert.equal(durable.resultDigest, rd);
      assert.deepEqual(durable.value, rv);
    } else {
      await assert.rejects(
        recoverBrokerProviderAcceptedResultV1(reopened.directoryHandle, acceptedRoot, rb),
        /not valid UTF-8 JSON|bytes are not exact canonical JSON|ended before declared size/,
      );
    }
    await assert.rejects(
      runBrokerProviderAttemptV1(
        reopened.directoryHandle, acceptedRoot,
        async () => { recoverySendCount += 1; return { resultDigest: rd, value: rv }; }, rb,
      ),
      /not RESERVED/,
    );
  }
  assert.equal(recoverySendCount, recoveryFaults.length);

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
    + 'capsule_staged_publication=true capsule_recovery_no_resend=true '
    + 'capsule_fault_matrix=7/7 partial_write_fault=true '
    + 'generation_substitution_matrix=3/3 stage_alias_retained=true '
    + `send_count=${sendCount} recovery_send_count=${recoverySendCount}`
  );
} finally {
  if (ns) await ns.directoryHandle.handle.close().catch(() => {});
  if (ns2) await ns2.directoryHandle.handle.close().catch(() => {});
  for (const item of recoveryNamespaces) await item.directoryHandle.handle.close().catch(() => {});
  await acceptedRoot.handle.close().catch(() => {});
  await ledgerRoot.close().catch(() => {});
  await rm(root, { recursive: true, force: true });
}
