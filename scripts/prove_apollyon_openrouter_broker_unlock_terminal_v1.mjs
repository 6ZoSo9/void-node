#!/usr/bin/env node
import assert from 'node:assert/strict';
import { constants as FS } from 'node:fs';
import { mkdir, mkdtemp, open, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  acceptedResultDigestV1,
  readAcceptedResultCapsuleV1,
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


  const recoveryFaults=[
    ['duringStageWrite',false],
    ['afterStageWrite',false],
    ['afterStageSync',false],
    ['afterStageDirSync',true],
    ['afterFinalLink',true],
    ['afterFinalDirSync',true],
    ['afterStageUnlink',true],
    ['afterCleanupDirSync',true],
    ['beforeReadback',true],
  ];
  let recoverySendCount=0,proofIndex=0;
  for(const [faultAt,shouldRecover] of recoveryFaults){
    proofIndex+=1;
    const rb=buildOpenRouterBrokerBindingV1({
      logicalOperationIntentDigest:proofIndex.toString(16).padStart(64,'0'),
      registrySha256:'c'.repeat(64),requestBody:{proof:'capsule-recovery',faultAt},
      contestant:{proof:'synthetic'},
    });
    const first=await openOperationLedgerNamespaceV1(ledgerRoot,rb.operationId);
    await prepareBrokerOperationV1(first.directoryHandle,rb);
    const rv=Object.freeze({
      marker:'VOID_APOLLYON_CAPSULE_RECOVERY_PROOF_RESULT_V1',faultAt,
      content:`exact accepted result for ${faultAt}`,
    });
    const rd=acceptedResultDigestV1(rv);
    await assert.rejects(
      runBrokerProviderAttemptV1(
        first.directoryHandle,acceptedRoot,
        async()=>{recoverySendCount+=1;return{resultDigest:rd,value:rv}},
        rb,{acceptedCapsuleFaultAt:faultAt},
      ),
      /synthetic accepted-capsule fault/,
    );
    await first.directoryHandle.handle.close();
    const reopened=await openOperationLedgerNamespaceV1(ledgerRoot,rb.operationId);
    recoveryNamespaces.push(reopened);
    const recoveredFault=await recoverBrokerProviderAcceptedResultV1(reopened.directoryHandle,acceptedRoot,rb);
    if(shouldRecover){
      assert.ok(recoveredFault);assert.equal(recoveredFault.recoveredWithoutProviderSend,true);
      assert.equal(recoveredFault.resultDigest,rd);assert.deepEqual(recoveredFault.value,rv);
      const durable=await readAcceptedResultCapsuleV1(acceptedRoot,reopened.directoryHandle,rb);
      assert.equal(durable.resultDigest,rd);assert.deepEqual(durable.value,rv);
    }else assert.equal(recoveredFault,null);
    await assert.rejects(
      runBrokerProviderAttemptV1(
        reopened.directoryHandle,acceptedRoot,
        async()=>{recoverySendCount+=1;return{resultDigest:rd,value:rv}},rb,
      ),
      /not RESERVED/,
    );
  }
  assert.equal(recoverySendCount,recoveryFaults.length);

  console.log(
    'VOID_OPENROUTER_BROKER_UNLOCK_TERMINAL_V1_PROOF_GREEN '
    + 'durable_accepted_survives_unlock_failure=true '
    + 'capsule_staged_publication=true capsule_recovery_no_resend=true '
    + 'capsule_fault_matrix=9/9 partial_write_fault=true '
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
