// VOID_APOLLYON_ACCEPTED_RESULT_DURABLE_TRANSACTION_V1
// Broker-private crash-durability transaction for accepted-result evidence.
//
// Authority boundary: this module owns NO provider-send, retry, reclaim, ledger-transition,
// wallet, chain, validator, repository, or service authority. It serializes cooperating writers
// on the exact pinned accepted-result root, re-establishes and proves the canonical final dentry
// across a parent-directory fsync epoch, and only then permits an injected broker-owned witness
// callback to run. The callback is the sole ledger authority and is supplied by the provider
// boundary; accepted-result bytes alone never mint RESULT_WITNESSED or ACCEPTED.
//
// Linux-only. Advisory flock serializes every reviewed writer using this module. The independent
// directory/file generation stamps fail closed if a non-cooperating same-UID mutation occurs in
// the reviewed final-dentry durability epoch. Dedicated-UID deployment remains the stronger
// isolation boundary against arbitrary code that intentionally ignores advisory locks.
import { spawnSync } from 'node:child_process';
import { lstat as fsLstat } from 'node:fs/promises';

import {
  publishAcceptedResultCapsuleV1,
  recoverAcceptedResultCapsuleCandidateV1,
  validateAcceptedResultBindingV1,
} from './apollyon_accepted_result_capsule_v1.mjs';

const MODULE_ID = 'VOID_APOLLYON_ACCEPTED_RESULT_DURABLE_TRANSACTION_V1';
const FLOCK_PATH = '/usr/bin/flock';
const HELPER_TIMEOUT_MS = 5000;
const HELPER_MAX_STDERR_BYTES = 8 * 1024;
const HELPER_ENV = Object.freeze({ PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' });
const OPERATION_ID = /^apollyon_op_v1:([0-9a-f]{64})$/;
const LOCALLY_HELD_ROOT_HANDLES = new WeakSet();

function fail(message) { throw new Error(`${MODULE_ID}: ${message}`); }
function requireLinuxV1() { if (process.platform !== 'linux') fail('Linux is required'); }
function currentEffectiveUidV1() {
  if (typeof process.geteuid !== 'function') fail('process.geteuid is required');
  const uid = process.geteuid();
  if (!Number.isSafeInteger(uid) || uid < 0) fail('process.geteuid returned an invalid effective UID');
  return uid;
}

async function revalidatePinnedRootV1(root) {
  requireLinuxV1();
  if (root === null || typeof root !== 'object' || Array.isArray(root)) {
    fail('accepted-result root must be a pinned directory object');
  }
  const handle = root.handle;
  if (!handle || !Number.isSafeInteger(handle.fd) || handle.fd < 0
      || typeof handle.stat !== 'function' || typeof handle.sync !== 'function') {
    fail('accepted-result root pinned FileHandle is missing');
  }
  const st = await handle.stat({ bigint: true });
  if (!st.isDirectory()) fail('accepted-result root is not a directory');
  if (st.dev !== root.dev || st.ino !== root.ino) fail('accepted-result root dev/ino drifted');
  if ((Number(st.mode) & 0o7777) !== 0o700 || root.mode !== 0o700) {
    fail('accepted-result root mode is not exactly 0700');
  }
  if (Number(st.uid) !== currentEffectiveUidV1()) fail('accepted-result root owner drifted');
  return handle;
}

function runFlockHelperV1(flockArgs, handle) {
  return spawnSync(
    FLOCK_PATH,
    flockArgs,
    {
      stdio: ['ignore', 'ignore', 'pipe', handle.fd],
      env: HELPER_ENV,
      shell: false,
      windowsHide: true,
      timeout: HELPER_TIMEOUT_MS,
      maxBuffer: HELPER_MAX_STDERR_BYTES,
      encoding: 'utf8',
    },
  );
}

function acquireRootFlockV1(handle) {
  const result = runFlockHelperV1(['--exclusive', '--nonblock', '3'], handle);
  if (result.error) fail(`accepted-result root flock acquire helper failed: ${String(result.error.code ?? 'unknown_error')}`);
  if (result.signal !== null) fail(`accepted-result root flock acquire helper killed by ${String(result.signal)}`);
  if (result.status === 1) fail('accepted-result root flock already held; BUSY/HOLD');
  if (result.status !== 0) {
    const stderr = String(result.stderr ?? '').trim().slice(0, 256);
    fail(`accepted-result root flock acquire failed: status=${String(result.status)}${stderr ? ` stderr=${stderr}` : ''}`);
  }
}

function releaseRootFlockV1(handle) {
  const result = runFlockHelperV1(['--unlock', '3'], handle);
  if (result.error || result.signal !== null || result.status !== 0) {
    fail(`accepted-result root flock unlock failed: status=${String(result.status)} error=${String(result.error?.code ?? 'none')} signal=${String(result.signal)}`);
  }
}

async function withRootFlockV1(root, callback) {
  const handle = await revalidatePinnedRootV1(root);
  if (LOCALLY_HELD_ROOT_HANDLES.has(handle)) fail('this exact accepted-result root FileHandle is already locally held');
  LOCALLY_HELD_ROOT_HANDLES.add(handle);
  let acquired = false;
  let result = null;
  let pendingError = null;
  try {
    acquireRootFlockV1(handle);
    acquired = true;
    result = await callback(handle);
  } catch (error) {
    pendingError = error;
  } finally {
    if (acquired) {
      try {
        releaseRootFlockV1(handle);
        LOCALLY_HELD_ROOT_HANDLES.delete(handle);
      } catch (unlockError) {
        if (!pendingError) pendingError = unlockError;
      }
    } else {
      LOCALLY_HELD_ROOT_HANDLES.delete(handle);
    }
  }
  if (pendingError) throw pendingError;
  return result;
}

function operationHexV1(operationId) {
  const match = OPERATION_ID.exec(operationId);
  if (!match) fail('operationId is invalid for final leaf derivation');
  return match[1];
}
function finalLeafV1(operationId) { return `accepted-result-v1-${operationHexV1(operationId)}.json`; }
function finalPathV1(handle, operationId) { return `/proc/self/fd/${handle.fd}/${finalLeafV1(operationId)}`; }

function assertPrivateFinalStatV1(st, label) {
  if (!st.isFile()) fail(`${label} is not a regular file`);
  if (Number(st.uid) !== currentEffectiveUidV1()) fail(`${label} owner is not the effective UID`);
  if ((Number(st.mode) & 0o7777) !== 0o600) fail(`${label} mode is not exactly 0600`);
  if (st.nlink !== 1n && st.nlink !== 2n) fail(`${label} link count ${String(st.nlink)} is not reviewed`);
}

function directoryEpochStampV1(st) {
  return [st.dev, st.ino, st.uid, st.mode, st.size, st.mtimeNs, st.ctimeNs];
}
function finalGenerationStampV1(st) {
  return [st.dev, st.ino, st.uid, st.mode, st.size, st.mtimeNs, st.ctimeNs, st.nlink];
}
function sameStampV1(a, b) { return a.every((value, index) => value === b[index]); }

function parseProofHooksV1(raw) {
  if (raw === null || raw === undefined) {
    return Object.freeze({ capsuleProofHooks: null, beforeDurabilitySync: null, afterDurabilitySync: null });
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('transaction proof hooks must be a plain object');
  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) fail('transaction proof hooks must be a plain object');
  const allowed = new Set(['capsuleProofHooks','beforeDurabilitySync','afterDurabilitySync']);
  for (const key of Object.keys(raw)) if (!allowed.has(key)) fail(`unsupported transaction proof hook ${key}`);
  for (const key of ['beforeDurabilitySync','afterDurabilitySync']) {
    if (raw[key] !== undefined && raw[key] !== null && typeof raw[key] !== 'function') {
      fail(`${key} must be a function or null`);
    }
  }
  return Object.freeze({
    capsuleProofHooks: raw.capsuleProofHooks ?? null,
    beforeDurabilitySync: raw.beforeDurabilitySync ?? null,
    afterDurabilitySync: raw.afterDurabilitySync ?? null,
  });
}

async function proveFinalDentryDurabilityEpochV1(root, handle, binding, hooks) {
  await revalidatePinnedRootV1(root);
  const finalPath = finalPathV1(handle, binding.operationId);
  const finalBefore = await fsLstat(finalPath, { bigint: true });
  assertPrivateFinalStatV1(finalBefore, 'accepted-result final before durability epoch');
  const rootBefore = await handle.stat({ bigint: true });

  const context = Object.freeze({
    phase: 'accepted_result_final_dentry_durability_epoch',
    finalPath,
    finalDev: finalBefore.dev,
    finalIno: finalBefore.ino,
  });
  if (hooks.beforeDurabilitySync) await hooks.beforeDurabilitySync(context);
  await handle.sync();
  if (hooks.afterDurabilitySync) await hooks.afterDurabilitySync(context);

  const finalAfter = await fsLstat(finalPath, { bigint: true });
  assertPrivateFinalStatV1(finalAfter, 'accepted-result final after durability epoch');
  const rootAfter = await handle.stat({ bigint: true });
  if (!sameStampV1(directoryEpochStampV1(rootBefore), directoryEpochStampV1(rootAfter))) {
    fail('accepted-result root directory generation changed across final-dentry durability fsync epoch');
  }
  if (!sameStampV1(finalGenerationStampV1(finalBefore), finalGenerationStampV1(finalAfter))) {
    fail('accepted-result final generation changed across final-dentry durability fsync epoch');
  }
  await revalidatePinnedRootV1(root);
  return Object.freeze({ rootAfter, finalAfter });
}

// The final capsule is fully created, validated, and then re-fsynced under one accepted-root
// exclusion epoch BEFORE the broker is allowed to durably publish RESULT_WITNESSED. Thus every
// newly-created durable witness has already-recoverable exact bytes. The witness callback receives
// descriptive evidence only; it remains the caller's responsibility to enforce ledger authority.
export async function publishAcceptedResultCapsuleDurableThenWitnessV1(
  root,
  rawBinding,
  resultDigest,
  rawValue,
  commitDurableWitness,
  proofHooks = null,
) {
  if (typeof commitDurableWitness !== 'function') fail('commitDurableWitness must be a function');
  const binding = validateAcceptedResultBindingV1(rawBinding);
  const hooks = parseProofHooksV1(proofHooks);
  return withRootFlockV1(root, async (handle) => {
    const capsule = await publishAcceptedResultCapsuleV1(
      root,
      binding,
      resultDigest,
      rawValue,
      hooks.capsuleProofHooks,
    );
    const durable = await proveFinalDentryDurabilityEpochV1(root, handle, binding, hooks);
    const witnessReceipt = await commitDurableWitness(Object.freeze({
      operationId: binding.operationId,
      resultDigest: capsule.resultDigest,
      finalDev: durable.finalAfter.dev,
      finalIno: durable.finalAfter.ino,
      finalSize: durable.finalAfter.size,
    }));

    // The reviewed writers all obey the same accepted-root flock. Re-prove that the exact final
    // generation and root namespace stayed fixed while the independent ledger witness committed.
    const finalAfterWitness = await fsLstat(finalPathV1(handle, binding.operationId), { bigint: true });
    assertPrivateFinalStatV1(finalAfterWitness, 'accepted-result final after witness commit');
    const rootAfterWitness = await handle.stat({ bigint: true });
    if (!sameStampV1(finalGenerationStampV1(durable.finalAfter), finalGenerationStampV1(finalAfterWitness))) {
      fail('accepted-result final generation changed while durable witness committed');
    }
    if (!sameStampV1(directoryEpochStampV1(durable.rootAfter), directoryEpochStampV1(rootAfterWitness))) {
      fail('accepted-result root directory generation changed while durable witness committed');
    }
    return Object.freeze({ resultDigest: capsule.resultDigest, value: capsule.value, witnessReceipt });
  });
}

// Zero-send recovery wrapper. The legacy capsule primitive may create/reuse the exact final dentry;
// this wrapper then re-establishes that final generation under a fresh accepted-root flock + guarded
// parent-fsync epoch before the provider boundary is allowed to append PROVIDER_RESULT/ACCEPTED.
export async function recoverAcceptedResultCapsuleDurablyV1(
  root,
  rawBinding,
  proofHooks = null,
) {
  const binding = validateAcceptedResultBindingV1(rawBinding);
  const hooks = parseProofHooksV1(proofHooks);
  return withRootFlockV1(root, async (handle) => {
    const recovered = await recoverAcceptedResultCapsuleCandidateV1(
      root,
      binding,
      hooks.capsuleProofHooks,
    );
    if (recovered === null) return null;
    await proveFinalDentryDurabilityEpochV1(root, handle, binding, hooks);
    return recovered;
  });
}
