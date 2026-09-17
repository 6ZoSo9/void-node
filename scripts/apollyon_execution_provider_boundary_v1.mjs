// VOID_OX_ALPHA_PROVIDER_BOUNDARY_V8_5 - provider-neutral durable send boundary (source-only).
// Linux-only. This module contains NO network, fetch, HTTP, DNS, or provider credential code:
// the injected sendProviderOnce callback exists solely so ordering/durability/crash behavior can
// be exercised deterministically. Ordering invariant: durable PROVIDER_ADMITTED publication and
// every post-admission proof precede EXACTLY ONE injected send callback invocation, all inside
// ONE kernel flock on the pinned ledger directory. A thrown/ambiguous send leaves the durable
// broker state UNCERTAIN forever: no result witness, retry, TTL, reclaim, or provider resend can
// be synthesized later. A validated returned result must first become exact crash-durable private
// accepted-result bytes; only then may the broker publish RESULT_WITNESSED, and only a capsule
// matching that independent ledger witness may later become PROVIDER_RESULT.
// Receipts returned are audit/output evidence only and are NEVER reusable send capabilities.
import { spawnSync } from 'node:child_process';
import {
  acceptedResultDigestV1,
  assertAcceptedResultCapsuleAbsentV1,
  validateAcceptedResultBindingV1,
} from './apollyon_accepted_result_capsule_v1.mjs';
import {
  publishAcceptedResultCapsuleDurableThenWitnessV1,
  recoverAcceptedResultCapsuleDurablyV1,
} from './apollyon_accepted_result_durable_transaction_v1.mjs';
import {
  encodeLedgerRecordBytesV1,
  loadLedgerRecordsV1,
} from './apollyon_execution_ledger_load_v1.mjs';
import { publishRecordBytesDurableV1 } from './apollyon_execution_ledger_publish_v1.mjs';
import { replayBrokerStateFromLedgerV1 } from './apollyon_execution_broker_replay_v1.mjs';
import { BROKER_STATE_V1, reduceBrokerStateV1 } from './apollyon_execution_broker_v1.mjs';
import {
  LEDGER_EVENT_V1,
  makeLedgerRecordV1,
  verifyLedgerChainV1,
} from './apollyon_execution_ledger_record_v1.mjs';

const MODULE_ID = 'VOID_OX_ALPHA_PROVIDER_BOUNDARY_V8_5';
const FLOCK_PATH = '/usr/bin/flock'; // exact helper path; no PATH resolution drift
const HELPER_TIMEOUT_MS = 5000; // fixed bounded budget; never extended
const HELPER_MAX_STDERR_BYTES = 8 * 1024;
const HELPER_ENV = Object.freeze({ PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' });
const HEX64 = /^[0-9a-f]{64}$/;

// Module-local ownership keyed by the EXACT FileHandle object (V7.2/V8.2 design): two concurrent
// calls sharing one FileHandle cannot both treat the idempotent same-open-description flock
// reacquire as fresh; independently opened handles contend in the kernel instead.
const LOCALLY_HELD_FILE_HANDLES = new WeakSet();

function fail(message) { throw new Error(`${MODULE_ID}: ${message}`); }
function requireLinuxV1() { if (process.platform !== 'linux') fail('provider boundary supports Linux only'); }

function assertPinnedDirectoryObjectV1(directoryHandle) {
  if (directoryHandle === null || typeof directoryHandle !== 'object' || Array.isArray(directoryHandle)) {
    fail('directoryHandle must be the opaque pinned object from openPinnedLedgerDirectoryV1');
  }
  const handle = directoryHandle.handle;
  if (!handle || typeof handle !== 'object' ||
      !Number.isSafeInteger(handle.fd) || handle.fd < 0 ||
      typeof handle.stat !== 'function' || typeof handle.sync !== 'function') {
    fail('pinned FileHandle with numeric fd is missing or unsuitable');
  }
  return handle; // the ONLY fd authority; any separately supplied fd field is ignored entirely
}

function runFlockHelperV1(flockArgs, handle) {
  return spawnSync(
    FLOCK_PATH,
    flockArgs,
    {
      stdio: ['ignore', 'ignore', 'pipe', handle.fd], // fd slot 3 IS the pinned FileHandle's fd
      env: HELPER_ENV,
      shell: false,
      windowsHide: true,
      timeout: HELPER_TIMEOUT_MS,
      maxBuffer: HELPER_MAX_STDERR_BYTES,
      encoding: 'utf8',
    },
  );
}

function acquireDirectoryFlockExclusiveNonblockingV1(handle) {
  const result = runFlockHelperV1(['--exclusive', '--nonblock', '3'], handle);
  if (result.error) fail(`flock acquire helper failed to run: ${String(result.error.code ?? 'unknown_error')}`);
  if (result.signal !== null) fail(`flock acquire helper killed by signal ${String(result.signal)}`);
  if (result.status === 1) fail('ledger directory flock already held; provider attempt is BUSY/HOLD');
  if (result.status !== 0) {
    const stderr = String(result.stderr ?? '').trim().slice(0, 256);
    fail(`flock acquire helper failed: status=${String(result.status)}${stderr ? ` stderr=${stderr}` : ''}`);
  }
}

function releaseDirectoryFlockV1(handle) {
  const result = runFlockHelperV1(['--unlock', '3'], handle);
  if (result.error || result.signal !== null || result.status !== 0) {
    fail(`flock unlock failed: status=${String(result.status)} error=${String(result.error?.code ?? 'none')} `
      + `signal=${String(result.signal)}; local-held marker retained`);
  }
}

function sameStateFieldsV1(a, b) {
  return a.phase === b.phase && a.operationId === b.operationId && a.acceptedDigest === b.acceptedDigest;
}

// ONE indivisible provider-attempt critical section: ledger flock precedes history load;
// PROVIDER_ADMITTED and the single injected send happen first. After a validated provider result,
// the accepted-result transaction holds its own pinned-root flock while it publishes + re-fsyncs
// exact final bytes and only then invokes the broker-owned RESULT_WITNESSED commit callback.
// PROVIDER_RESULT follows only after both byte durability and witness durability are proven.
export async function runBrokerProviderAttemptV1(
  directoryHandle,
  acceptedResultRoot,
  sendProviderOnce,
  rawAcceptedResultBinding,
  proofHooks = null,
) {
  requireLinuxV1();
  if (typeof sendProviderOnce !== 'function') fail('sendProviderOnce must be a function');
  let beforeUnlock = null;
  let afterWitness = null;
  let acceptedCapsuleFaultAt = null;
  let acceptedCapsuleBeforeDurabilitySync = null;
  let acceptedCapsuleAfterDurabilitySync = null;
  if (proofHooks !== null && proofHooks !== undefined) {
    if (typeof proofHooks !== 'object' || Array.isArray(proofHooks)) fail('proofHooks must be null or a plain object');
    const proto = Object.getPrototypeOf(proofHooks);
    if (proto !== Object.prototype && proto !== null) fail('proofHooks must be a plain object');
    const allowed = new Set([
      'beforeUnlock','afterWitness','acceptedCapsuleFaultAt',
      'acceptedCapsuleBeforeDurabilitySync','acceptedCapsuleAfterDurabilitySync',
    ]);
    for (const key of Object.keys(proofHooks)) if (!allowed.has(key)) fail(`unsupported proof hook ${key}`);
    if (proofHooks.beforeUnlock !== undefined) {
      if (typeof proofHooks.beforeUnlock !== 'function') fail('proofHooks.beforeUnlock must be a function');
      beforeUnlock = proofHooks.beforeUnlock;
    }
    if (proofHooks.afterWitness !== undefined) {
      if (typeof proofHooks.afterWitness !== 'function') fail('proofHooks.afterWitness must be a function');
      afterWitness = proofHooks.afterWitness;
    }
    if (proofHooks.acceptedCapsuleFaultAt !== undefined) {
      if (typeof proofHooks.acceptedCapsuleFaultAt !== 'string') fail('acceptedCapsuleFaultAt must be a string');
      acceptedCapsuleFaultAt = proofHooks.acceptedCapsuleFaultAt;
    }
    for (const key of ['acceptedCapsuleBeforeDurabilitySync','acceptedCapsuleAfterDurabilitySync']) {
      if (proofHooks[key] !== undefined && typeof proofHooks[key] !== 'function') {
        fail(`proofHooks.${key} must be a function`);
      }
    }
    acceptedCapsuleBeforeDurabilitySync = proofHooks.acceptedCapsuleBeforeDurabilitySync ?? null;
    acceptedCapsuleAfterDurabilitySync = proofHooks.acceptedCapsuleAfterDurabilitySync ?? null;
  }
  const acceptedResultBinding = validateAcceptedResultBindingV1(rawAcceptedResultBinding);
  const handle = assertPinnedDirectoryObjectV1(directoryHandle);
  if (LOCALLY_HELD_FILE_HANDLES.has(handle)) {
    fail('this exact FileHandle is already locally held by a concurrent provider attempt');
  }
  let acquired = false;
  let pendingError = null;
  let receipt = null;
  LOCALLY_HELD_FILE_HANDLES.add(handle);
  try {
    acquireDirectoryFlockExclusiveNonblockingV1(handle);
    acquired = true;

    const current = await loadLedgerRecordsV1(directoryHandle);
    if (current.length === 0) fail('empty ledger: a provider attempt requires a prior durable RESERVE');
    const currentState = replayBrokerStateFromLedgerV1(current);
    const head = current[0];
    const tail = current[current.length - 1];
    if (currentState.phase !== BROKER_STATE_V1.RESERVED ||
        currentState.operationId !== head.operationId ||
        currentState.acceptedDigest !== null) {
      fail(`broker state ${currentState.phase} is not RESERVED bound to the durable head; refusing send`);
    }
    if (acceptedResultBinding.operationId !== head.operationId
        || acceptedResultBinding.logicalOperationIntentDigest !== head.logicalOperationIntentDigest
        || acceptedResultBinding.logicalWorkDigest !== head.logicalWorkDigest) {
      fail('accepted-result binding does not match the durable RESERVED head');
    }
    await assertAcceptedResultCapsuleAbsentV1(acceptedResultRoot, acceptedResultBinding);

    const admitted = makeLedgerRecordV1({
      type: LEDGER_EVENT_V1.PROVIDER_ADMITTED,
      operationId: head.operationId,
      logicalOperationIntentDigest: head.logicalOperationIntentDigest,
      logicalWorkDigest: head.logicalWorkDigest,
      sequence: current.length,
      previousRecordSha256: tail.recordSha256,
      resultDigest: null,
    });
    const admittedEvent = { type: 'PROVIDER_ADMITTED', operationId: currentState.operationId };
    const uncertainState = reduceBrokerStateV1(currentState, admittedEvent);
    if (uncertainState.phase !== BROKER_STATE_V1.UNCERTAIN ||
        uncertainState.operationId !== currentState.operationId ||
        uncertainState.acceptedDigest !== null) {
      fail('reducer did not yield exact UNCERTAIN for the admission event');
    }
    const candidate = [...current, admitted];
    verifyLedgerChainV1(candidate);
    if (!sameStateFieldsV1(replayBrokerStateFromLedgerV1(candidate), uncertainState)) {
      fail('candidate replay disagrees with reducer authorization; refusing admission');
    }
    await publishRecordBytesDurableV1(
      directoryHandle,
      admitted.sequence,
      Buffer.from(encodeLedgerRecordBytesV1(admitted)),
    );
    const postAdmission = await loadLedgerRecordsV1(directoryHandle);
    if (postAdmission.length !== candidate.length) fail('post-admission ledger length mismatch; HOLD');
    if (postAdmission[postAdmission.length - 1].recordSha256 !== admitted.recordSha256) {
      fail('post-admission tail does not match the published admission record; HOLD');
    }
    if (!sameStateFieldsV1(replayBrokerStateFromLedgerV1(postAdmission), uncertainState)) {
      fail('post-admission replay is not exact UNCERTAIN; HOLD');
    }
    if (directoryHandle.handle !== handle || !LOCALLY_HELD_FILE_HANDLES.has(handle)) {
      fail('local flock ownership changed before the send boundary');
    }

    const outcome = await sendProviderOnce();
    if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) {
      fail('sendProviderOnce must return an exact plain object with keys resultDigest and value only');
    }
    const proto = Object.getPrototypeOf(outcome);
    if (proto !== Object.prototype && proto !== null) fail('sendProviderOnce result must be a plain object');
    const keys = Object.keys(outcome);
    if (keys.length !== 2 || !keys.includes('resultDigest') || !keys.includes('value')) {
      fail('sendProviderOnce result keys must be exactly resultDigest and value');
    }
    const { resultDigest, value } = outcome;
    if (typeof resultDigest !== 'string' || !HEX64.test(resultDigest)) {
      fail('sendProviderOnce resultDigest must be lowercase sha256 hex');
    }
    if (acceptedResultDigestV1(value) !== resultDigest) {
      fail('sendProviderOnce resultDigest does not bind the exact accepted result payload');
    }

    const witnessedRecord = makeLedgerRecordV1({
      type: LEDGER_EVENT_V1.RESULT_WITNESSED,
      operationId: head.operationId,
      logicalOperationIntentDigest: head.logicalOperationIntentDigest,
      logicalWorkDigest: head.logicalWorkDigest,
      sequence: postAdmission.length,
      previousRecordSha256: postAdmission[postAdmission.length - 1].recordSha256,
      resultDigest,
    });
    const witnessedState = reduceBrokerStateV1(uncertainState, {
      type: 'RESULT_WITNESSED', operationId: head.operationId, resultDigest,
    });
    if (witnessedState.phase !== BROKER_STATE_V1.RESULT_WITNESSED
        || witnessedState.operationId !== head.operationId
        || witnessedState.acceptedDigest !== resultDigest) {
      fail('reducer did not yield exact RESULT_WITNESSED for the validated provider result');
    }
    const witnessedCandidate = [...postAdmission, witnessedRecord];
    verifyLedgerChainV1(witnessedCandidate);
    if (!sameStateFieldsV1(replayBrokerStateFromLedgerV1(witnessedCandidate), witnessedState)) {
      fail('witness candidate replay disagrees with reducer authorization; refusing publication');
    }

    // Byte durability precedes witness authority. The transaction publishes and validates the
    // exact final capsule, then performs a second root-directory fsync under an accepted-root flock.
    // Only after that durability epoch succeeds does this callback publish RESULT_WITNESSED.
    let postWitness = null;
    const acceptedCapsule = await publishAcceptedResultCapsuleDurableThenWitnessV1(
      acceptedResultRoot,
      acceptedResultBinding,
      resultDigest,
      value,
      async (durableEvidence) => {
        if (durableEvidence.operationId !== head.operationId
            || durableEvidence.resultDigest !== resultDigest) {
          fail('durable accepted-result evidence does not match the witness candidate binding');
        }
        await publishRecordBytesDurableV1(
          directoryHandle,
          witnessedRecord.sequence,
          Buffer.from(encodeLedgerRecordBytesV1(witnessedRecord)),
        );
        postWitness = await loadLedgerRecordsV1(directoryHandle);
        if (postWitness.length !== witnessedCandidate.length) fail('post-witness ledger length mismatch; HOLD');
        if (postWitness[postWitness.length - 1].recordSha256 !== witnessedRecord.recordSha256) {
          fail('post-witness tail does not match the published result witness; HOLD');
        }
        if (!sameStateFieldsV1(replayBrokerStateFromLedgerV1(postWitness), witnessedState)) {
          fail('post-witness replay is not exact RESULT_WITNESSED; HOLD');
        }
        return Object.freeze({ recordSha256: witnessedRecord.recordSha256 });
      },
      {
        capsuleProofHooks: acceptedCapsuleFaultAt === null ? null : { faultAt: acceptedCapsuleFaultAt },
        beforeDurabilitySync: acceptedCapsuleBeforeDurabilitySync,
        afterDurabilitySync: acceptedCapsuleAfterDurabilitySync,
      },
    );
    if (postWitness === null) fail('durable accepted-result transaction returned without a witness commit');
    if (afterWitness) {
      await afterWitness(Object.freeze({ resultDigest, acceptedCapsuleDurable: true }));
    }

    const resultRecord = makeLedgerRecordV1({
      type: LEDGER_EVENT_V1.PROVIDER_RESULT,
      operationId: head.operationId,
      logicalOperationIntentDigest: head.logicalOperationIntentDigest,
      logicalWorkDigest: head.logicalWorkDigest,
      sequence: postWitness.length,
      previousRecordSha256: postWitness[postWitness.length - 1].recordSha256,
      resultDigest,
    });
    const resultEvent = { type: 'PROVIDER_RESULT', operationId: head.operationId, resultDigest };
    const acceptedState = reduceBrokerStateV1(witnessedState, resultEvent);
    if (acceptedState.phase !== BROKER_STATE_V1.ACCEPTED ||
        acceptedState.acceptedDigest !== resultDigest ||
        acceptedState.operationId !== head.operationId) {
      fail('reducer did not yield exact ACCEPTED for the witnessed result digest');
    }
    const resultCandidate = [...postWitness, resultRecord];
    verifyLedgerChainV1(resultCandidate);
    if (!sameStateFieldsV1(replayBrokerStateFromLedgerV1(resultCandidate), acceptedState)) {
      fail('result candidate replay disagrees with reducer authorization; refusing publication');
    }
    await publishRecordBytesDurableV1(
      directoryHandle,
      resultRecord.sequence,
      Buffer.from(encodeLedgerRecordBytesV1(resultRecord)),
    );
    const final = await loadLedgerRecordsV1(directoryHandle);
    if (final.length !== resultCandidate.length) fail('post-result ledger length mismatch; HOLD');
    if (final[final.length - 1].recordSha256 !== resultRecord.recordSha256) {
      fail('post-result tail does not match the published result record; HOLD');
    }
    if (!sameStateFieldsV1(replayBrokerStateFromLedgerV1(final), acceptedState)) {
      fail('post-result replay is not exact ACCEPTED with the witnessed digest; HOLD');
    }
    receipt = Object.freeze({
      resultDigest,
      value: acceptedCapsule.value,
      admittedRecordSha256: admitted.recordSha256,
      resultRecordSha256: resultRecord.recordSha256,
      ledgerLength: final.length,
    });
  } catch (error) {
    pendingError = error;
  } finally {
    if (acquired) {
      try {
        if (beforeUnlock) await beforeUnlock(Object.freeze({ acceptedTerminalCommitted: receipt !== null }));
        releaseDirectoryFlockV1(handle);
        LOCALLY_HELD_FILE_HANDLES.delete(handle);
      } catch (unlockError) {
        if (receipt === null && !pendingError) pendingError = unlockError;
      }
    } else {
      LOCALLY_HELD_FILE_HANDLES.delete(handle);
    }
  }
  if (pendingError) throw pendingError;
  return receipt;
}

// No-send recovery is admitted only from durable RESULT_WITNESSED. Before PROVIDER_RESULT can be
// appended, the exact matching capsule is revalidated and its final dentry is re-fsynced under the
// same accepted-root exclusion + generation epoch used by fresh publication.
export async function recoverBrokerProviderAcceptedResultV1(
  directoryHandle, acceptedResultRoot, rawAcceptedResultBinding,
) {
  requireLinuxV1();
  const acceptedResultBinding = validateAcceptedResultBindingV1(rawAcceptedResultBinding);
  const handle = assertPinnedDirectoryObjectV1(directoryHandle);
  if (LOCALLY_HELD_FILE_HANDLES.has(handle)) fail('this exact FileHandle is already locally held by another provider/recovery attempt');
  let acquired=false,pendingError=null,receipt=null;
  LOCALLY_HELD_FILE_HANDLES.add(handle);
  try {
    acquireDirectoryFlockExclusiveNonblockingV1(handle); acquired=true;
    const current=await loadLedgerRecordsV1(directoryHandle);
    if(current.length===0)return null;
    const state=replayBrokerStateFromLedgerV1(current),head=current[0],tail=current[current.length-1];
    if(state.phase!==BROKER_STATE_V1.RESULT_WITNESSED||state.operationId!==head.operationId
        ||typeof state.acceptedDigest!=='string'||!HEX64.test(state.acceptedDigest))return null;
    if(tail.type!==LEDGER_EVENT_V1.RESULT_WITNESSED||tail.resultDigest!==state.acceptedDigest){
      fail('durable RESULT_WITNESSED phase is not bound to the exact tail witness digest');
    }
    if(acceptedResultBinding.operationId!==head.operationId
        ||acceptedResultBinding.logicalOperationIntentDigest!==head.logicalOperationIntentDigest
        ||acceptedResultBinding.logicalWorkDigest!==head.logicalWorkDigest)fail('recovery binding does not match durable RESULT_WITNESSED head');
    const recovered=await recoverAcceptedResultCapsuleDurablyV1(acceptedResultRoot,acceptedResultBinding);
    if(recovered===null)return null;
    if(recovered.resultDigest!==state.acceptedDigest){
      fail('recovered capsule digest does not match independent durable result witness');
    }
    const resultRecord=makeLedgerRecordV1({
      type:LEDGER_EVENT_V1.PROVIDER_RESULT,operationId:head.operationId,
      logicalOperationIntentDigest:head.logicalOperationIntentDigest,
      logicalWorkDigest:head.logicalWorkDigest,sequence:current.length,
      previousRecordSha256:tail.recordSha256,resultDigest:recovered.resultDigest,
    });
    const acceptedState=reduceBrokerStateV1(state,{type:'PROVIDER_RESULT',operationId:head.operationId,resultDigest:recovered.resultDigest});
    if(acceptedState.phase!==BROKER_STATE_V1.ACCEPTED||acceptedState.acceptedDigest!==recovered.resultDigest)fail('recovered result did not reduce RESULT_WITNESSED to exact ACCEPTED');
    const candidate=[...current,resultRecord];verifyLedgerChainV1(candidate);
    if(!sameStateFieldsV1(replayBrokerStateFromLedgerV1(candidate),acceptedState))fail('recovery candidate replay disagrees with reducer');
    await publishRecordBytesDurableV1(directoryHandle,resultRecord.sequence,Buffer.from(encodeLedgerRecordBytesV1(resultRecord)));
    const final=await loadLedgerRecordsV1(directoryHandle);
    if(final.length!==candidate.length||final[final.length-1].recordSha256!==resultRecord.recordSha256
        ||!sameStateFieldsV1(replayBrokerStateFromLedgerV1(final),acceptedState))fail('recovered PROVIDER_RESULT did not become exact durable ACCEPTED');
    const admittedRecord=current[current.length-2];
    if(!admittedRecord||admittedRecord.type!==LEDGER_EVENT_V1.PROVIDER_ADMITTED){
      fail('RESULT_WITNESSED recovery history lacks exact preceding PROVIDER_ADMITTED record');
    }
    receipt=Object.freeze({
      resultDigest:recovered.resultDigest,value:recovered.value,admittedRecordSha256:admittedRecord.recordSha256,
      resultRecordSha256:resultRecord.recordSha256,ledgerLength:final.length,recoveredWithoutProviderSend:true,
    });
  } catch(error){pendingError=error}
  finally {
    if(acquired){
      try{releaseDirectoryFlockV1(handle);LOCALLY_HELD_FILE_HANDLES.delete(handle)}
      catch(unlockError){if(receipt===null&&!pendingError)pendingError=unlockError}
    } else LOCALLY_HELD_FILE_HANDLES.delete(handle);
  }
  if(pendingError)throw pendingError;
  return receipt;
}
