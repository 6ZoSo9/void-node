// VOID_OX_ALPHA_BROKER_AUTHORIZED_APPEND_V8_2 - broker authorization plus durable append as ONE
// indivisible critical section under a single inode flock on the exact pinned ledger directory.
// Scope: source-only, Linux-only. No provider send exists here; this module never grants,
// restores, or implies provider-execution authority. BIND_INTENT is bootstrap identity binding
// evidence ONLY: it is never fed to the V5.3 broker reducer and never creates execution
// authority. Every later durable event must be a real V5.3 reducer transition; reducer no-ops
// fail closed. Load, authorize, prove, publish, and re-prove all occur while ONE kernel flock
// (proven V7.2 design: /usr/bin/flock --exclusive --nonblock on fd 3 duplicated from the pinned
// FileHandle, --unlock release, spawnSync only, fixed bounded env, <=5s helper timeout, no
// retry/wait/reclaim) is held. Same-UID hostile-code isolation stays deployment work (dedicated
// UID remains required). Receipts are audit evidence only, NEVER a reusable send capability.
import { spawnSync } from 'node:child_process';
import {
  encodeLedgerRecordBytesV1,
  decodeLedgerRecordBytesV1,
  loadLedgerRecordsV1,
} from './apollyon_execution_ledger_load_v1.mjs';
import { publishRecordBytesDurableV1 } from './apollyon_execution_ledger_publish_v1.mjs';
import { replayBrokerStateFromLedgerV1 } from './apollyon_execution_broker_replay_v1.mjs';
import { BROKER_STATE_V1, reduceBrokerStateV1 } from './apollyon_execution_broker_v1.mjs';
import { LEDGER_EVENT_V1, verifyLedgerChainV1 } from './apollyon_execution_ledger_record_v1.mjs';

const MODULE_ID = 'VOID_OX_ALPHA_BROKER_AUTHORIZED_APPEND_V8_2';
const FLOCK_PATH = '/usr/bin/flock'; // exact helper path; no PATH resolution drift
const HELPER_TIMEOUT_MS = 5000; // fixed bounded budget; never extended
const HELPER_MAX_STDERR_BYTES = 8 * 1024;
const HELPER_ENV = Object.freeze({ PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' });

// Module-local ownership keyed by the EXACT FileHandle object: two concurrent calls sharing one
// FileHandle cannot both treat the idempotent same-open-description flock reacquire as fresh;
// independently opened handles contend in the kernel instead.
const LOCALLY_HELD_FILE_HANDLES = new WeakSet();

function fail(message) { throw new Error(`${MODULE_ID}: ${message}`); }
function requireLinuxV1() { if (process.platform !== 'linux') fail('authorized append supports Linux only'); }

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
// FileHandle's open file description (duplicated into the helper as inherited fd 3). flock binds
// to the open-file description, so when the helper exits successfully the lock REMAINS HELD by
// the parent's still-open FileHandle. Status 1 is BUSY/HOLD; any other failure fails closed.
// Never retried, never waited on; never alters durable ledger authority.
function acquireDirectoryFlockExclusiveNonblockingV1(handle) {
  const result = runFlockHelperV1(['--exclusive', '--nonblock', '3'], handle);
  if (result.error) fail(`flock acquire helper failed to run: ${String(result.error.code ?? 'unknown_error')}`);
  if (result.signal !== null) fail(`flock acquire helper killed by signal ${String(result.signal)}`);
  if (result.status === 1) fail('ledger directory flock already held; authorized append is BUSY/HOLD');
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

// Ledger record -> exactly one closed-vocabulary broker event; no extra fields; unknown fails.
function translateReducerEventV1(r) {
  switch (r.type) {
    case LEDGER_EVENT_V1.RESERVE:
      return { type: 'RESERVE', operationId: r.operationId };
    case LEDGER_EVENT_V1.PROVIDER_ADMITTED:
      return { type: 'PROVIDER_ADMITTED', operationId: r.operationId };
    case LEDGER_EVENT_V1.PROVIDER_RESULT:
      return { type: 'PROVIDER_RESULT', operationId: r.operationId, resultDigest: r.resultDigest };
    case LEDGER_EVENT_V1.RECONCILE_BLOCKED:
      return { type: 'RECONCILE_BLOCKED', operationId: r.operationId };
    default:
      return fail('untranslatable ledger event type: ' + String(r.type));
  }
}

function sameStateFieldsV1(a, b) {
  return a.phase === b.phase && a.operationId === b.operationId && a.acceptedDigest === b.acceptedDigest;
}

// ONE indivisible critical section: kernel flock acquisition precedes loading durable history;
// authorization (V5.3 reducer) and durable publication both occur while the flock is held; the
// unlock runs in finally and ONLY a proven successful unlock clears the local-held marker.
export async function appendBrokerAuthorizedRecordV1(directoryHandle, record) {
  // Snapshot BEFORE the first await: canonical bytes plus frozen eight-field record; later caller
  // mutation of `record` is irrelevant from this point on.
  const encodedBytes = encodeLedgerRecordBytesV1(record);
  const bytes = Buffer.from(encodedBytes); // private copy of the exact bytes to publish
  const stableRecord = decodeLedgerRecordBytesV1(bytes);

  requireLinuxV1();
  const handle = assertPinnedDirectoryObjectV1(directoryHandle);
  if (LOCALLY_HELD_FILE_HANDLES.has(handle)) {
    fail('this exact FileHandle is already locally held by a concurrent authorized append');
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
    const currentState = replayBrokerStateFromLedgerV1(current);
    const fromPhase = currentState.phase;
    let candidate;
    let expectedPost;

    if (current.length === 0) {
      // Bootstrap: the ONLY allowed record is BIND_INTENT at sequence 0. Identity binding evidence
      // ONLY - never fed to reduceBrokerStateV1, never claimed as execution authority.
      if (stableRecord.type !== LEDGER_EVENT_V1.BIND_INTENT) {
        fail('an empty ledger admits only a BIND_INTENT record at sequence 0');
      }
      if (stableRecord.sequence !== 0) fail('bootstrap BIND_INTENT must sit at sequence 0');
      candidate = [stableRecord];
      verifyLedgerChainV1(candidate);
      expectedPost = replayBrokerStateFromLedgerV1(candidate);
      if (expectedPost.phase !== BROKER_STATE_V1.ABSENT) {
        fail('bootstrap BIND_INTENT must replay to the exact ABSENT state');
      }
    } else {
      // Normal authorized transition: BIND_INTENT forbidden; the record must extend the durable
      // head binding and yield a REAL V5.3 reducer transition (a no-op fails closed).
      if (stableRecord.type === LEDGER_EVENT_V1.BIND_INTENT) {
        fail('BIND_INTENT is forbidden once the ledger is non-empty');
      }
      if (stableRecord.sequence !== current.length) {
        fail(`sequence ${stableRecord.sequence} does not match current ledger length ${current.length}; HOLD`);
      }
      if (stableRecord.operationId !== current[0].operationId) {
        fail('record operationId does not exactly equal the durable head binding operationId');
      }
      const event = translateReducerEventV1(stableRecord);
      const nextState = reduceBrokerStateV1(currentState, event);
      if (sameStateFieldsV1(nextState, currentState)) {
        fail('reducer produced a no-op; this append is not an authorized transition');
      }
      candidate = [...current, stableRecord];
      verifyLedgerChainV1(candidate);
      const replayedCandidate = replayBrokerStateFromLedgerV1(candidate);
      if (!sameStateFieldsV1(replayedCandidate, nextState)) {
        fail('candidate replay disagrees with reducer authorization; refusing to publish');
      }
      expectedPost = nextState;
    }

    // Ownership assertion: the exact FileHandle captured at entry is still the pinned handle and
    // still carries this module's local-held marker immediately before any publication.
    if (directoryHandle.handle !== handle || !LOCALLY_HELD_FILE_HANDLES.has(handle)) {
      fail('local flock ownership changed before publication');
    }

    // Still locked: publish through the proven publication primitive only.
    await publishRecordBytesDurableV1(directoryHandle, stableRecord.sequence, bytes);

    // Still locked: reload durable state and prove the append landed intact and replays identically.
    const post = await loadLedgerRecordsV1(directoryHandle);
    if (post.length !== candidate.length) {
      fail(`post-publication ledger length ${post.length} != expected ${candidate.length}; HOLD`);
    }
    const tail = post[post.length - 1];
    if (!tail || tail.recordSha256 !== stableRecord.recordSha256) {
      fail('post-publication tail does not match the appended record; HOLD');
    }
    if (!sameStateFieldsV1(replayBrokerStateFromLedgerV1(post), expectedPost)) {
      fail('post-publication replay state does not match the authorized expectation; HOLD');
    }

    // NON-AUTHORITY receipt: descriptive audit evidence only; never a reusable send capability.
    receipt = Object.freeze({
      sequence: stableRecord.sequence,
      recordSha256: stableRecord.recordSha256,
      eventType: stableRecord.type,
      fromPhase,
      toPhase: expectedPost.phase,
      ledgerLength: post.length,
    });
  } catch (error) {
    pendingError = error;
  } finally {
    if (acquired) {
      try {
        releaseDirectoryFlockV1(handle);
        LOCALLY_HELD_FILE_HANDLES.delete(handle); // ONLY after a proven successful unlock
      } catch (unlockError) {
        // Fail closed: retain the local-held marker (availability loss beats a false release).
        if (!pendingError) pendingError = unlockError;
      }
    } else {
      LOCALLY_HELD_FILE_HANDLES.delete(handle); // acquisition never succeeded: nothing was held
    }
  }
  if (pendingError) throw pendingError;
  return receipt;
}
