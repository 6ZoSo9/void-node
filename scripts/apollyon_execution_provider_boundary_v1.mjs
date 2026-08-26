// VOID_OX_ALPHA_PROVIDER_BOUNDARY_V8_3 - provider-neutral durable send boundary (source-only).
// Linux-only. This module contains NO network, fetch, HTTP, DNS, or provider credential code:
// the injected sendProviderOnce callback exists solely so ordering/durability/crash behavior can
// be exercised deterministically. Ordering invariant: durable PROVIDER_ADMITTED publication and
// every post-admission proof precede EXACTLY ONE injected send callback invocation, all inside
// ONE kernel flock on the pinned ledger directory. A thrown/ambiguous send leaves the durable
// broker state UNCERTAIN forever: no result, reconciliation, retry, TTL, reclaim, or recovery
// event is ever appended here, and process death can never restore RESERVED. Receipts returned
// are audit/output evidence only and are NEVER reusable send capabilities or admission tokens.
import { spawnSync } from 'node:child_process';
import {
  acceptedResultDigestV1,
  assertAcceptedResultCapsuleAbsentV1,
  publishAcceptedResultCapsuleV1,
  validateAcceptedResultBindingV1,
} from './apollyon_accepted_result_capsule_v1.mjs';
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

const MODULE_ID = 'VOID_OX_ALPHA_PROVIDER_BOUNDARY_V8_3';
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

// Exclusive nonblocking flock on the pinned directory inode through the exact already-open
// FileHandle's open file description (duplicated into the helper as inherited fd 3). When the
// helper exits successfully the lock REMAINS HELD by the parent's still-open FileHandle.
// Status 1 is BUSY/HOLD; any other failure fails closed. Never retried, never waited on.
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

// Explicit release on the SAME FileHandle/open-file description via a second short-lived helper.
// Any failure is fail-closed: the caller RETAINS the local-held marker instead of claiming release.
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

// ONE indivisible critical section: kernel flock precedes loading durable history; durable
// PROVIDER_ADMITTED publication, the single injected send, PROVIDER_RESULT publication, and all
// post-publication proofs occur while the SAME flock is held; unlock runs in finally and ONLY a
// proven successful unlock clears the local-held marker.
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
  if (proofHooks !== null && proofHooks !== undefined) {
    if (typeof proofHooks !== 'object' || Array.isArray(proofHooks)) {
      fail('proofHooks must be null or a plain object');
    }
    const proto = Object.getPrototypeOf(proofHooks);
    if (proto !== Object.prototype && proto !== null) fail('proofHooks must be a plain object');
    const hookKeys = Object.keys(proofHooks);
    if (hookKeys.length !== 1 || hookKeys[0] !== 'beforeUnlock') {
      fail('proofHooks may contain exactly beforeUnlock');
    }
    if (typeof proofHooks.beforeUnlock !== 'function') fail('proofHooks.beforeUnlock must be a function');
    beforeUnlock = proofHooks.beforeUnlock;
  }
  const acceptedResultBinding = validateAcceptedResultBindingV1(rawAcceptedResultBinding);
  const handle = assertPinnedDirectoryObjectV1(directoryHandle);
  if (LOCALLY_HELD_FILE_HANDLES.has(handle)) {
    fail('this exact FileHandle is already locally held by a concurrent provider attempt');
  }
  let acquired = false;
  let pendingError = null;
  let receipt = null;
  LOCALLY_HELD_FILE_HANDLES.add(handle); // mark local-held BEFORE acquiring, per protocol order
  try {
    acquireDirectoryFlockExclusiveNonblockingV1(handle);
    acquired = true;

    // Locked window begins: durable history is loaded ONLY after the kernel lock is ours.
    const current = await loadLedgerRecordsV1(directoryHandle);
    if (current.length === 0) fail('empty ledger: a provider attempt requires a prior durable RESERVE');
    const currentState = replayBrokerStateFromLedgerV1(current);
    const head = current[0];
    const tail = current[current.length - 1];
    // Gate: exactly RESERVED bound to the durable head; ABSENT/UNCERTAIN/ACCEPTED/blocked/
    // CONFLICT or corrupt/no-op history rejects HERE, before any send, so crash ambiguity
    // after a prior admission can never reach sendProviderOnce again on a later invocation.
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
    // A preexisting fixed capsule leaf is poison, not evidence. Detect it BEFORE provider
    // admission so an external same-UID collision cannot consume a send and then fail at publish.
    await assertAcceptedResultCapsuleAbsentV1(acceptedResultRoot, acceptedResultBinding);

    // Admission record derived internally; the caller supplies NO record and NO admission receipt.
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
    const admittedBytes = Buffer.from(encodeLedgerRecordBytesV1(admitted)); // private byte snapshot
    await publishRecordBytesDurableV1(directoryHandle, admitted.sequence, admittedBytes);
    const postAdmission = await loadLedgerRecordsV1(directoryHandle);
    if (postAdmission.length !== candidate.length) fail('post-admission ledger length mismatch; HOLD');
    if (postAdmission[postAdmission.length - 1].recordSha256 !== admitted.recordSha256) {
      fail('post-admission tail does not match the published admission record; HOLD');
    }
    if (!sameStateFieldsV1(replayBrokerStateFromLedgerV1(postAdmission), uncertainState)) {
      fail('post-admission replay is not exact UNCERTAIN; HOLD');
    }
    // Ownership assertion immediately before the send boundary.
    if (directoryHandle.handle !== handle || !LOCALLY_HELD_FILE_HANDLES.has(handle)) {
      fail('local flock ownership changed before the send boundary');
    }
    // THE ONLY send call site in this module: zero arguments (no receipt/capability token is ever
    // passed), executed at most once per call of this function; there is no loop and no retry.
    const outcome = await sendProviderOnce();
    // Throwing/malformed sends land in the catch below: durable state stays UNCERTAIN, NOTHING is
    // appended, and sendProviderOnce is never invoked again by this module.
    if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) {
      fail('sendProviderOnce must return an exact plain object with keys resultDigest and value only');
    }
    const proto = Object.getPrototypeOf(outcome);
    if (proto !== Object.prototype && proto !== null) {
      fail('sendProviderOnce result must be a plain object');
    }
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

    // F1 repair: publish and fsync the complete accepted result capsule BEFORE PROVIDER_RESULT.
    // The capsule alone grants no authority: if the process dies here, durable ledger state
    // remains UNCERTAIN and later reads refuse capsule replay or provider resend.
    const acceptedCapsule = await publishAcceptedResultCapsuleV1(
      acceptedResultRoot,
      acceptedResultBinding,
      resultDigest,
      value,
    );

    // Result record derived internally from the SAME durable binding; caller supplies no record.
    const resultRecord = makeLedgerRecordV1({
      type: LEDGER_EVENT_V1.PROVIDER_RESULT,
      operationId: head.operationId,
      logicalOperationIntentDigest: head.logicalOperationIntentDigest,
      logicalWorkDigest: head.logicalWorkDigest,
      sequence: postAdmission.length,
      previousRecordSha256: postAdmission[postAdmission.length - 1].recordSha256,
      resultDigest,
    });
    const resultEvent = { type: 'PROVIDER_RESULT', operationId: head.operationId, resultDigest };
    const acceptedState = reduceBrokerStateV1(uncertainState, resultEvent);
    if (acceptedState.phase !== BROKER_STATE_V1.ACCEPTED ||
        acceptedState.acceptedDigest !== resultDigest ||
        acceptedState.operationId !== head.operationId) {
      fail('reducer did not yield exact ACCEPTED for the validated result digest');
    }
    const resultCandidate = [...postAdmission, resultRecord];
    verifyLedgerChainV1(resultCandidate);
    if (!sameStateFieldsV1(replayBrokerStateFromLedgerV1(resultCandidate), acceptedState)) {
      fail('result candidate replay disagrees with reducer authorization; refusing publication');
    }
    const resultBytes = Buffer.from(encodeLedgerRecordBytesV1(resultRecord));
    await publishRecordBytesDurableV1(directoryHandle, resultRecord.sequence, resultBytes);
    const final = await loadLedgerRecordsV1(directoryHandle);
    if (final.length !== resultCandidate.length) fail('post-result ledger length mismatch; HOLD');
    if (final[final.length - 1].recordSha256 !== resultRecord.recordSha256) {
      fail('post-result tail does not match the published result record; HOLD');
    }
    if (!sameStateFieldsV1(replayBrokerStateFromLedgerV1(final), acceptedState)) {
      fail('post-result replay is not exact ACCEPTED with the sent digest; HOLD');
    }
    // NON-AUTHORITY receipt: descriptive evidence/output only; never a reusable send capability.
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
        if (beforeUnlock) {
          await beforeUnlock(Object.freeze({ acceptedTerminalCommitted: receipt !== null }));
        }
        releaseDirectoryFlockV1(handle);
        LOCALLY_HELD_FILE_HANDLES.delete(handle); // ONLY after a proven successful unlock
      } catch (unlockError) {
        // Resource-terminal truth is independent from operation-terminal truth.
        // Once durable ACCEPTED is proven, cleanup uncertainty may block later new
        // work but cannot retroactively revoke or hide the committed result.
        if (receipt === null && !pendingError) pendingError = unlockError;
      }
    } else {
      LOCALLY_HELD_FILE_HANDLES.delete(handle); // acquisition never succeeded: nothing was held
    }
  }
  if (pendingError) throw pendingError;
  return receipt;
}
