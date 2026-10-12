#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import {
  createHash,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  blockHeaderBytes,
  computeRoots,
  nodeIdFromPubPEM,
} from "../src/chain/block.js";
import {
  VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1,
  VoidAlBlockCommitRuntimeHeldErrorV1,
} from "../src/security/void_alignment_layer_block_commit_runtime_v1.js";
import {
  VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1,
  VOID_AL_DURABLE_SAFE_MODE_CHILD_LATCHED_V1,
  VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1,
  VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
  getVoidAlignmentLayerBlockCommitDurableRuntimeStatusV1,
  installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1,
} from "../src/security/void_alignment_layer_block_commit_durable_runtime_v1.js";
import {
  VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
  VOID_AL_DURABLE_SAFE_MODE_LATCH_V1,
  VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1,
  VOID_AL_DURABLE_SAFE_MODE_STATE_FILE_V1,
  VoidAlDurableSafeModeLatchErrorV1,
  admitDurableRootPathnameV1,
  closePinnedDurableRootV1,
  initializeVoidAlDurableSafeModeLatchV1,
  latchVoidAlDurableSafeModeV1,
  latchWithinHeldAuthorityV1,
  pinDurableRootGenerationV1,
  readVoidAlDurableSafeModeLatchV1,
  readVoidAlDurableSafeModeStateSnapshotV1,
  readVoidAlDurableSafeModeStateWhileHeldV1,
  withHeldAuthorityV1,
} from "../src/security/void_al_durable_safe_mode_latch_v1.js";

const MARKER = "VOID_AL_DURABLE_SAFE_MODE_LATCH_V1_PROOF_GREEN";
const ZERO = "0".repeat(64);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function privateRoot(parent: string, name: string): string {
  const root = path.join(parent, name);
  fs.mkdirSync(root, { recursive: false, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  return root;
}

function expectLatchError(fn: () => unknown, code: string): void {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
    assert.equal(error.code, code);
    return true;
  });
}

function expectHeld(
  fn: () => unknown,
  code: string,
): VoidAlBlockCommitRuntimeHeldErrorV1 {
  let captured: VoidAlBlockCommitRuntimeHeldErrorV1 | null = null;
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof VoidAlBlockCommitRuntimeHeldErrorV1);
    assert.equal(error.code, code);
    assert.equal(error.disposition, "safe_mode");
    assert.match(error.evidence_sha256, /^[0-9a-f]{64}$/);
    assert.notEqual(error.evidence_sha256, ZERO);
    captured = error;
    return true;
  });
  assert.ok(captured);
  return captured!;
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function makeSigner() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  return {
    publicPem,
    privateKey,
    proposer: nodeIdFromPubPEM(publicPem),
  };
}

function makeGenesis(signer: ReturnType<typeof makeSigner>, note: string) {
  const body = { kind: "al-durable-safe-mode-proof", note };
  const txs = [{ hash: sha256(JSON.stringify(body)), body }];
  const roots = computeRoots(txs, []);
  const candidate: any = {
    number: 0,
    parentHash: ZERO,
    timestamp: 1_787_560_000_000,
    txRoot: roots.txRoot,
    blobRoot: roots.blobRoot,
    txs,
    blobs: [],
    proposer: signer.proposer,
    proposerPubkey: signer.publicPem,
    sig: "",
  };
  candidate.sig = sign(
    null,
    blockHeaderBytes(candidate),
    signer.privateKey,
  ).toString("hex");
  return candidate;
}

function syntheticPrototype(): any {
  return {
    raw_writes: 0,
    head_writes: 0,
    loadHeadNumber() {
      return -1;
    },
    loadBlock() {
      return null;
    },
    saveBlock() {},
    saveAuthorizedLegacyCommitDirectV2fs() {},
    saveBlockCommit() {
      this.raw_writes += 1;
    },
    persistHeadAtomic() {
      this.head_writes += 1;
    },
    replayWalAllBestEffort() {},
  };
}

// --- Raw cross-process lock worker (no tsx needed: plain fs, no project
// imports) used only by the multi-process adversarial tests below. -------

function writeLockWorkerScript(temp: string): string {
  const scriptPath = path.join(temp, "lock-worker.cjs");
  const source = `
const fs = require("fs");
const path = require("path");
const root = process.env.VOID_TEST_ROOT;
const lockFile = path.join(root, ${JSON.stringify(VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1)});
const mode = process.env.VOID_TEST_MODE;

function tryCreate() {
  try {
    const fd = fs.openSync(lockFile, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid }) + "\\n");
    fs.closeSync(fd);
    const dfd = fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
    fs.fsyncSync(dfd);
    fs.closeSync(dfd);
    return true;
  } catch (e) {
    if (e && e.code === "EEXIST") return false;
    throw e;
  }
}

if (mode === "try-once") {
  process.stdout.write(JSON.stringify({ ok: tryCreate() }));
} else if (mode === "acquire-and-block") {
  const ok = tryCreate();
  process.stdout.write(JSON.stringify({ ok, pid: process.pid }) + "\\n");
  if (ok) {
    try {
      fs.readFileSync(0);
    } catch (e) {
      /* parent closed stdin or killed us */
    }
  }
} else if (mode === "acquire-forged-pid-and-exit") {
  const forgedPid = Number(process.env.VOID_TEST_FORGED_PID);
  try {
    const fd = fs.openSync(lockFile, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
    fs.writeFileSync(fd, JSON.stringify({ pid: forgedPid }) + "\\n");
    fs.closeSync(fd);
    const dfd = fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
    fs.fsyncSync(dfd);
    fs.closeSync(dfd);
    process.stdout.write(JSON.stringify({ ok: true }));
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false }));
  }
}
`;
  fs.writeFileSync(scriptPath, source, "utf8");
  return scriptPath;
}

function spawnLockWorker(
  workerScript: string,
  root: string,
  mode: string,
  extraEnv: Record<string, string> = {},
): { ok: boolean; pid?: number } {
  const result = spawnSync(process.execPath, [workerScript], {
    env: { ...process.env, VOID_TEST_ROOT: root, VOID_TEST_MODE: mode, ...extraEnv },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `worker(${mode}) failed: ${result.stderr}`);
  return JSON.parse(result.stdout.trim());
}

function pidIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "fixtures/governance/void-al-durable-safe-mode-latch-v1.json",
    ),
    "utf8",
  ),
);
assert.equal(fixture.marker, "VOID_AL_DURABLE_SAFE_MODE_LATCH_V1_20260824");
assert.equal(fixture.chain_id, 2050);
assert.equal(fixture.state.crash_lock_fail_closed, true);
assert.equal(fixture.state.all_zero_evidence_allowed, false);
assert.equal(fixture.runtime.restart_restores_safe_mode, true);
assert.equal(fixture.runtime.automatic_resume_allowed, false);
assert.equal(fixture.runtime.resume_api_implemented, false);
assert.equal(fixture.runtime.root_generation_pinned_for_process_lifetime, true);
assert.equal(fixture.runtime.cross_process_mutation_serialized, true);
assert.equal(fixture.runtime.pid_or_liveness_based_authority_reclaim, false);
assert.equal(fixture.closed_hold, "HOLD_AL_DURABLE_SAFE_MODE_STATE_REQUIRED");
assert.equal(fixture.activation.ready, false);
assert.equal(fixture.authority_boundary.sovereign_usb_access, false);
assert.equal(fixture.authority_boundary.chain2050_live_mutation, false);
assert.equal(fixture.authority_boundary.money_movement, false);
assert.equal(fixture.runtime.persistence_ambiguous_retains_authority_never_auto_releases, true);
assert.equal(fixture.runtime.persistence_ambiguous_poisons_pinned_root_in_process, true);
assert.equal(fixture.runtime.release_failure_poisons_pinned_root_in_process, true);
assert.equal(fixture.runtime.pinned_root_capability_immutable, true);
assert.equal(fixture.runtime.pinned_root_capability_runtime_branded, true);
assert.equal(fixture.runtime.fabricated_pinned_root_rejected, true);
assert.equal(fixture.runtime.closed_pinned_root_rejected, true);
assert.equal(
  fixture.runtime.cross_process_mutation_serialized_scope,
  "compliant_same_uid_processes_only_hostile_eviction_out_of_scope",
);
assert.ok(
  fixture.remaining_holds.includes("HOLD_AL_DURABLE_SAFE_MODE_SAME_UID_NAMESPACE_TRUST_REQUIRED"),
  "the same-UID hostile-eviction trust boundary must remain a declared activation HOLD",
);

// --- V4 Truth-Blocker-2 falsifier: the overbroad, unqualified foreign-
// generation-release marker must be GONE from the fixture, replaced by the
// two precisely-scoped machine truths that say exactly what is proven. ---
assert.equal(
  Object.prototype.hasOwnProperty.call(fixture.runtime, "authority_release_refuses_foreign_generation"),
  false,
  "the overbroad unqualified authority_release_refuses_foreign_generation marker must be removed from the fixture",
);
assert.equal(
  fixture.runtime.authority_release_rejects_foreign_generation_present_at_validation,
  true,
);
assert.equal(fixture.runtime.authority_release_atomic_against_hostile_same_uid_racer, false);

// --- V4 Blocker-1 falsifier: the fixture must record that the canary now
// runs INSIDE the held mutation authority, not before acquisition. --------
assert.equal(fixture.runtime.root_generation_canary_runs_inside_held_mutation_authority, true);
assert.equal(
  fixture.runtime.root_admission_failure_during_in_authority_canary_converts_to_durable_root_drifted,
  true,
);

// --- V4 Truth-Gap-3 falsifier: the fixture must record that status()
// re-verifies the root generation read-only and fails closed on idle
// drift. --------------------------------------------------------------
assert.equal(fixture.runtime.status_root_generation_reverified_read_only, true);
assert.equal(fixture.runtime.status_fails_closed_on_root_generation_drift_while_idle, true);
assert.equal(fixture.runtime.status_never_latches_or_mutates, true);

const latchSource = fs.readFileSync(
  path.join(process.cwd(), "src/security/void_al_durable_safe_mode_latch_v1.ts"),
  "utf8",
);
assert.match(latchSource, /VOID_AL_DURABLE_SAFE_MODE_LATCH_V1/);
assert.match(latchSource, /O_EXCL/);
assert.match(latchSource, /fsyncSync/);
assert.match(latchSource, /renameSync/);
assert.match(latchSource, /\/proc\/self\/fd/);
assert.match(latchSource, /pinDurableRootGenerationV1/);
assert.match(latchSource, /AL_DURABLE_SAFE_MODE_AUTHORITY_BUSY/);
assert.match(latchSource, /AL_DURABLE_SAFE_MODE_AUTHORITY_RELEASE_FAILED/);
assert.equal(/export function (?:resume|clear)/i.test(latchSource), false);
assert.equal(/\bpid\b.*alive|isAlive|processLiveness|\/proc\/\$\{.*pid/i.test(latchSource), false);

// --- Blocker-1 falsifier: acquireAuthorityV1/releaseAuthorityV1 must not
// be externally callable production APIs — they must not be exported at
// all, and the "while-held" primitives must require and verify a
// capability token before doing anything. ---------------------------------
assert.equal(/export function acquireAuthorityV1/.test(latchSource), false);
assert.equal(/export function releaseAuthorityV1/.test(latchSource), false);
assert.match(latchSource, /export type AuthorityTokenV1 = symbol/);
assert.match(latchSource, /AL_DURABLE_SAFE_MODE_AUTHORITY_TOKEN_INVALID/);
assert.match(
  latchSource,
  /export function latchWithinHeldAuthorityV1\(\s*pinned: PinnedDurableRootV1,\s*token: AuthorityTokenV1,/,
);
assert.match(
  latchSource,
  /export function readVoidAlDurableSafeModeStateWhileHeldV1\(\s*pinned: PinnedDurableRootV1,\s*token: AuthorityTokenV1,/,
);

// --- Blocker-2 falsifier: release must be bound to the exact authority
// generation it acquired, and must refuse to unlink a replacement. -------
assert.match(latchSource, /AL_DURABLE_SAFE_MODE_AUTHORITY_GENERATION_REPLACED/);
assert.match(latchSource, /stat\.dev !== held\.dev \|\| stat\.ino !== held\.ino/);

// --- V3 Blocker-1 falsifier: withHeldAuthorityV1 must not unconditionally
// release the authority before checking whether the body failed with
// PERSISTENCE_AMBIGUOUS, and a release failure must poison the pinned
// root, not merely propagate. --------------------------------------------
assert.match(latchSource, /function isAmbiguousPersistenceErrorV1/);
assert.match(latchSource, /poisonedPinnedRootsV1/);
assert.equal(
  /result = body\(token\);\s*\}\s*catch \(error\) \{\s*bodyThrew = true;\s*bodyError = error;\s*\}\s*releaseAuthorityV1\(pinned, token\);/.test(
    latchSource.replace(/\s+/g, " "),
  ),
  false,
  "withHeldAuthorityV1 must not unconditionally release immediately after the body, without an ambiguous-persistence retain check first",
);
assert.match(latchSource, /isAmbiguousPersistenceErrorV1\(bodyError\)/);
assert.match(latchSource, /heldAuthorityV1\.delete\(pinned\);\s*\n\s*poisonedPinnedRootsV1\.add\(pinned\);/);

// --- V3 Blocker-2 falsifier: pinned-root capability must be immutable
// (readonly fields, frozen at mint) and runtime-branded (an unexported
// WeakSet, checked by every exported function accepting one). -----------
assert.match(latchSource, /readonly dirFd: number;/);
assert.match(latchSource, /readonly dev: number;/);
assert.match(latchSource, /readonly ino: number;/);
assert.match(latchSource, /readonly rootPath: string;/);
assert.match(latchSource, /const genuinePinnedRootsV1 = new WeakSet/);
assert.match(latchSource, /Object\.freeze\(\{\s*dirFd,/);
assert.match(latchSource, /AL_DURABLE_SAFE_MODE_PINNED_ROOT_INVALID/);
assert.match(latchSource, /function assertGenuinePinnedRootV1/);
assert.equal(/export \{ genuinePinnedRootsV1/.test(latchSource), false);

// --- V3 Blocker-3 falsifier: the same-UID release-generation claim must
// be stated as non-atomic (detects/fails-closed, does not prevent), not
// overclaimed. -------------------------------------------------------
assert.match(latchSource, /NOT atomic against a hostile SAME-UID/);
assert.match(latchSource, /hostile same-UID process/);

// --- V4 Truth-Blocker-2 falsifier: the release doc comment and the module
// truth object must state EXACTLY what is proven — a foreign generation
// already present at the pre-unlink validation point is rejected, and the
// check+unlink pair is explicitly NOT claimed atomic against a hostile
// same-UID racer landing strictly between the two syscalls. The old
// unqualified "the intruder's replacement file is never deleted by us"
// absolute claim must be gone. --------------------------------------------
assert.match(latchSource, /PRE-UNLINK VALIDATION POINT/);
assert.match(
  latchSource,
  /`lstat` succeeds but strictly BEFORE the subsequent `unlinkSync` executes/,
);
assert.equal(
  /and the intruder's replacement file is never deleted by us\.\s*\*\//.test(latchSource),
  false,
  "the old unqualified 'never deleted by us' absolute claim must be removed, not merely relocated",
);
assert.match(
  latchSource,
  /authority_release_rejects_foreign_generation_present_at_validation: true,/,
);
assert.match(latchSource, /authority_release_atomic_against_hostile_same_uid_racer: false,/);
assert.match(latchSource, /cross_process_mutation_and_latch_serialized_scope:/);
assert.match(
  latchSource,
  /"compliant_same_uid_processes_only_hostile_eviction_out_of_scope" as const,/,
);

const durableRuntimeSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/security/void_alignment_layer_block_commit_durable_runtime_v1.ts",
  ),
  "utf8",
);
// V5 falsifier: no per-install process-exit listener. The OS reclaims fds
// and the module-private WeakMap/WeakSet state at process exit anyway; a
// listener registered per installed prototype only accumulates unbounded
// process-global state and trips Node's default MaxListenersExceededWarning.
assert.equal(
  /process\.on\(\s*["']exit["']/.test(durableRuntimeSource),
  false,
  "durable runtime must not register a process.on(\"exit\", ...) listener",
);
assert.match(durableRuntimeSource, /VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1/);
assert.match(durableRuntimeSource, /VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1/);
assert.match(durableRuntimeSource, /VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1/);
assert.match(durableRuntimeSource, /latchWithinHeldAuthorityV1/);
assert.match(durableRuntimeSource, /withHeldAuthorityV1/);
assert.match(durableRuntimeSource, /verifyRootGenerationCurrentWhileHeldV1/);
assert.match(durableRuntimeSource, /persistLatentChildSafeMode/);
// Blocker-3 falsifier: admission failure during the canary (not only a
// plain dev/ino mismatch) must be caught and converted to the durable
// ROOT_DRIFTED latch, never escape unlatched.
assert.match(durableRuntimeSource, /admission_failed:/);
// Blocker-4 falsifier: status() must take a fresh on-disk read every call,
// not answer purely from `durableState.durable`.
assert.match(durableRuntimeSource, /readVoidAlDurableSafeModeStateSnapshotV1/);
assert.match(durableRuntimeSource, /durable_read_fresh/);
assert.equal(
  /saveBlockCommit"[\s\S]{0,40}persistHeadAtomic"/.test(
    durableRuntimeSource.replace(/\s+/g, " "),
  ),
  false,
  "saveBlockCommit/persistHeadAtomic must not be independently listed as durable-guarded top-level methods",
);

// --- V4 Blocker-1 falsifier: the canary must run INSIDE the mutation
// authority's own held callback — never as a separate check performed
// before acquisition — and the old acquire-then-latch fallback for
// root-drift must be gone entirely (using it here would be the exact
// nested-reacquisition mistake this design forbids elsewhere). -----------
assert.equal(
  /function verifyRootGenerationCurrentV1\(/.test(durableRuntimeSource),
  false,
  "the old pre-acquisition-only canary name must be gone, not merely aliased",
);
assert.equal(
  /function persistSafeModeAcquiringV1/.test(durableRuntimeSource),
  false,
  "the acquire-first latch fallback must be removed now that the canary runs while already held",
);
assert.equal(
  /verifyRootGenerationCurrentWhileHeldV1\(state\);\s*\n\s*return withHeldAuthorityV1/.test(
    durableRuntimeSource,
  ),
  false,
  "the canary must not run before authority acquisition",
);
{
  const acquireIdx = durableRuntimeSource.indexOf(
    'withHeldAuthorityV1(state.pinned, { boundedRetry: true, intent: "mutation" }',
  );
  const canaryCallIdx = durableRuntimeSource.indexOf(
    "verifyRootGenerationCurrentWhileHeldV1(state, token);",
  );
  const readIdx = durableRuntimeSource.indexOf(
    "readVoidAlDurableSafeModeStateWhileHeldV1(state.pinned, token);",
  );
  assert.ok(acquireIdx !== -1 && canaryCallIdx !== -1 && readIdx !== -1);
  assert.ok(
    acquireIdx < canaryCallIdx && canaryCallIdx < readIdx,
    "invokeDurableGuardV1 must acquire the authority, THEN run the in-authority canary, THEN read durable state — in that exact order",
  );
}
assert.match(
  durableRuntimeSource,
  /persistSafeModeWhileHeldV1\(state, token, VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1, evidenceSha\);/,
);
assert.match(durableRuntimeSource, /afterMutationAuthorityAcquiredBeforeCanaryV1/);

// --- V4 Truth-Gap-3 falsifier: status() must expose an explicit
// root_generation_current truth and perform a read-only re-check function
// distinct from the mutation-path canary. ---------------------------------
assert.match(durableRuntimeSource, /root_generation_current/);
assert.match(durableRuntimeSource, /function checkRootGenerationCurrentReadOnlyV1/);
assert.match(durableRuntimeSource, /cross_process_mutation_serialized_scope/);

const bootstrapSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/security/void_alignment_layer_block_commit_runtime_bootstrap_v1.ts",
  ),
  "utf8",
);
assert.match(
  bootstrapSource,
  /installVoidAlignmentLayerBlockCommitDurableRuntimeFromEnvironmentV1\(\)/,
);

const indexSource = fs.readFileSync(path.join(process.cwd(), "src/index.ts"), "utf8");
assert.equal(
  indexSource.includes("void_alignment_layer_block_commit_runtime_bootstrap_v1"),
  false,
  "normal runtime must remain unmounted in this source-only generation",
);

// --- Blocker-5 falsifier: the known constructor replayWalAllBestEffort
// swallowed-safe-mode finding must remain a tracked, explicit activation
// HOLD, never silently dropped. src/chain/seg_store.ts is out of scope for
// this lane to modify, so this asserts the exact known-swallow call site
// is still present (i.e. still genuinely unrepaired, not that it's fine)
// and that the HOLD documenting it is still declared in the fixture — if
// either goes missing without the other being deliberately updated
// together, this proof fails rather than silently going quiet. -----------
const segStoreSource = fs.readFileSync(
  path.join(process.cwd(), "src/chain/seg_store.ts"),
  "utf8",
);
assert.match(
  segStoreSource,
  /try\s*\{\s*this\.replayWalAllBestEffort\(\);\s*\}\s*catch\s*\(err\)\s*\{\s*recordSegstoreDatanetEmptyCatchVisibilityFailure_src_chain_seg_store_ts/,
  "HOLD_AL_DURABLE_SAFE_MODE_CONSTRUCTOR_REPLAY_SWALLOWED tracks this exact swallow site — if it changed, update the HOLD (repair or re-describe it), not this assertion alone",
);
assert.ok(
  fixture.remaining_holds.includes("HOLD_AL_DURABLE_SAFE_MODE_CONSTRUCTOR_REPLAY_SWALLOWED"),
  "the constructor replay swallow finding must remain a declared activation HOLD, not be silently dropped",
);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-al-durable-safe-mode-"));
fs.chmodSync(temp, 0o700);
const workerScript = writeLockWorkerScript(temp);

const prevGate = process.env.VOID_AL_BLOCK_COMMIT_RUNTIME_V1;
const prevChain = process.env.VOID_CHAIN_ID;
const prevAuthorityRequired = process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
const prevLegacyAuthorityRequired = process.env.VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER;
const prevAuthoritySource = process.env.VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE;
const prevTrusted = process.env.VOID_BLOCK_TRUSTED_PROPOSERS;

try {
  const badModeRoot = privateRoot(temp, "bad-mode");
  fs.chmodSync(badModeRoot, 0o755);
  expectLatchError(
    () =>
      initializeVoidAlDurableSafeModeLatchV1({
        root_directory: badModeRoot,
        confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
      }),
    "AL_DURABLE_SAFE_MODE_ROOT_NOT_PRIVATE",
  );

  const root = privateRoot(temp, "state");
  expectLatchError(
    () =>
      initializeVoidAlDurableSafeModeLatchV1({
        root_directory: root,
        confirmation: "wrong",
      }),
    "AL_DURABLE_SAFE_MODE_INITIALIZATION_CONFIRMATION_REQUIRED",
  );

  const initial = initializeVoidAlDurableSafeModeLatchV1({
    root_directory: root,
    confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
  });
  assert.equal(initial.marker, VOID_AL_DURABLE_SAFE_MODE_LATCH_V1);
  assert.equal(initial.chain_id, 2050);
  assert.equal(initial.generation, "0");
  assert.equal(initial.mode, "running");
  assert.equal(initial.first_reason_code, null);
  assert.equal(initial.latest_reason_code, null);
  assert.match(initial.state_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(
    fs.statSync(path.join(root, VOID_AL_DURABLE_SAFE_MODE_STATE_FILE_V1)).mode & 0o777,
    0o600,
  );

  const idempotentInitial = initializeVoidAlDurableSafeModeLatchV1({
    root_directory: root,
    confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
  });
  assert.deepEqual(idempotentInitial, initial);

  expectLatchError(
    () =>
      latchVoidAlDurableSafeModeV1({
        root_directory: root,
        reason_code: "ZERO_EVIDENCE",
        evidence_sha256: ZERO,
      }),
    "AL_DURABLE_SAFE_MODE_EVIDENCE_INVALID",
  );

  const firstEvidence = sha256("first incident");
  const first = latchVoidAlDurableSafeModeV1({
    root_directory: root,
    reason_code: "AL_TEST_FIRST_INCIDENT",
    evidence_sha256: firstEvidence,
  });
  assert.equal(first.mode, "safe_mode");
  assert.equal(first.generation, "1");
  assert.equal(first.first_reason_code, "AL_TEST_FIRST_INCIDENT");
  assert.equal(first.first_evidence_sha256, firstEvidence);
  assert.equal(first.latest_reason_code, "AL_TEST_FIRST_INCIDENT");
  assert.equal(first.latest_evidence_sha256, firstEvidence);

  const same = latchVoidAlDurableSafeModeV1({
    root_directory: root,
    reason_code: "AL_TEST_FIRST_INCIDENT",
    evidence_sha256: firstEvidence,
  });
  assert.deepEqual(same, first);

  const secondEvidence = sha256("second incident");
  const second = latchVoidAlDurableSafeModeV1({
    root_directory: root,
    reason_code: "AL_TEST_SECOND_INCIDENT",
    evidence_sha256: secondEvidence,
  });
  assert.equal(second.generation, "2");
  assert.equal(second.first_reason_code, "AL_TEST_FIRST_INCIDENT");
  assert.equal(second.first_evidence_sha256, firstEvidence);
  assert.equal(second.latest_reason_code, "AL_TEST_SECOND_INCIDENT");
  assert.equal(second.latest_evidence_sha256, secondEvidence);
  assert.deepEqual(readVoidAlDurableSafeModeLatchV1(root), second);

  const crashRoot = privateRoot(temp, "crash-lock");
  initializeVoidAlDurableSafeModeLatchV1({
    root_directory: crashRoot,
    confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
  });
  const crashLock = path.join(crashRoot, VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1);
  fs.writeFileSync(crashLock, "synthetic-crash\n", { mode: 0o600, flag: "wx" });
  expectLatchError(
    () => readVoidAlDurableSafeModeLatchV1(crashRoot),
    "AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED",
  );
  // D7(a): install-time/read-time admission never retries and never claims
  // BUSY for a surviving authority generation — it is RECOVERY_REQUIRED,
  // full stop, distinct from ordinary contention (tested further below).
  expectLatchError(
    () =>
      initializeVoidAlDurableSafeModeLatchV1({
        root_directory: crashRoot,
        confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
      }),
    "AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED",
  );
  fs.unlinkSync(crashLock);

  const tamperRoot = privateRoot(temp, "tamper");
  initializeVoidAlDurableSafeModeLatchV1({
    root_directory: tamperRoot,
    confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
  });
  latchVoidAlDurableSafeModeV1({
    root_directory: tamperRoot,
    reason_code: "AL_TEST_TAMPER_BASE",
    evidence_sha256: sha256("tamper base"),
  });
  const tamperStatePath = path.join(
    tamperRoot,
    VOID_AL_DURABLE_SAFE_MODE_STATE_FILE_V1,
  );
  const tampered = JSON.parse(fs.readFileSync(tamperStatePath, "utf8"));
  tampered.latest_reason_code = "AL_TEST_TAMPER_CHANGED";
  fs.writeFileSync(tamperStatePath, `${JSON.stringify(tampered, null, 2)}\n`, {
    mode: 0o600,
  });
  expectLatchError(
    () => readVoidAlDurableSafeModeLatchV1(tamperRoot),
    "AL_DURABLE_SAFE_MODE_STATE_FINGERPRINT_MISMATCH",
  );

  // --- D2: admission -> pin swap mismatch (tight-window swap between the
  // pathname check and the fd open+fstat verify). A pre-existing separate
  // directory is renamed into place (not deleted+recreated), so the
  // replacement is guaranteed to carry a genuinely different inode rather
  // than risking inode-number reuse at the same path. ---------------------
  {
    const swapRoot = privateRoot(temp, "swap-generation");
    const swapImposter = privateRoot(temp, "swap-generation-imposter");
    const admission = admitDurableRootPathnameV1(swapRoot);
    fs.renameSync(swapRoot, `${swapRoot}-displaced`);
    fs.renameSync(swapImposter, swapRoot);
    assert.throws(
      () => pinDurableRootGenerationV1(admission),
      (error: unknown) => {
        assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
        assert.equal(error.code, "AL_DURABLE_SAFE_MODE_ROOT_GENERATION_MISMATCH");
        return true;
      },
    );
  }

  // --- Blocker-2: authority generation binding. A hostile SAME-UID
  // process unlinks the authority file this acquisition created and
  // installs a DIFFERENT generation at the identical pathname WHILE it is
  // still (logically) held — release must detect that foreign replacement
  // and refuse to touch it, rather than blindly unlinking whatever now
  // occupies the name. Simulated deterministically (single-threaded, no
  // race) inside withHeldAuthorityV1's own callback, so the substitution
  // is guaranteed to have happened before release runs. ------------------
  {
    const replacedRoot = privateRoot(temp, "authority-generation-replaced");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: replacedRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const admissionReplaced = admitDurableRootPathnameV1(replacedRoot);
    const pinnedReplaced = pinDurableRootGenerationV1(admissionReplaced);
    const lockFile = path.join(replacedRoot, VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1);
    // The imposter is created as a wholly separate, pre-existing file (not
    // by unlink-then-recreate at the same name) and RENAMED into place, so
    // it is guaranteed to carry a genuinely different inode rather than
    // risking the filesystem immediately reusing the just-freed one — the
    // same technique the D2 admission/pin swap test above uses.
    const imposterFile = path.join(temp, "authority-generation-replaced-imposter");
    try {
      assert.throws(
        () =>
          withHeldAuthorityV1(pinnedReplaced, { boundedRetry: false, intent: "mutation" }, () => {
            fs.writeFileSync(
              imposterFile,
              `${JSON.stringify({ pid: process.pid, foreign: true })}\n`,
              { mode: 0o600, flag: "wx" },
            );
            fs.unlinkSync(lockFile);
            fs.renameSync(imposterFile, lockFile);
          }),
        (error: unknown) => {
          assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
          assert.equal(error.code, "AL_DURABLE_SAFE_MODE_AUTHORITY_GENERATION_REPLACED");
          return true;
        },
      );
    } finally {
      closePinnedDurableRootV1(pinnedReplaced);
    }
    // The foreign replacement must survive completely untouched — release
    // refused to unlink it.
    assert.equal(fs.existsSync(lockFile), true);
    const foreignContent = JSON.parse(fs.readFileSync(lockFile, "utf8"));
    assert.equal(foreignContent.foreign, true);
  }

  // --- V3 Blocker-1: PERSISTENCE_AMBIGUOUS must retain (never release) the
  // authority, and must poison the in-process pinned-root handle so a
  // second operation on the SAME handle refuses without executing its
  // body, while a fresh strict read against the same on-disk root
  // separately observes RECOVERY_REQUIRED because the authority file was
  // never unlinked. Deterministic: the physical root directory is made
  // non-writable AFTER the authority file has already been created (so
  // acquisition itself still succeeds) but BEFORE the durable state write,
  // so the temp-file create inside writeStateReplace fails with EACCES —
  // exactly the mutation-attempted-then-I/O-failed shape that classifies
  // as PERSISTENCE_AMBIGUOUS rather than a plain LATCH_FAILED. ------------
  {
    const ambiguousRoot = privateRoot(temp, "persistence-ambiguous");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: ambiguousRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const admissionAmbiguous = admitDurableRootPathnameV1(ambiguousRoot);
    const pinnedAmbiguous = pinDurableRootGenerationV1(admissionAmbiguous);
    try {
      assert.throws(
        () =>
          withHeldAuthorityV1(pinnedAmbiguous, { boundedRetry: false, intent: "latch" }, (token) => {
            fs.chmodSync(ambiguousRoot, 0o500);
            try {
              return latchWithinHeldAuthorityV1(pinnedAmbiguous, token, {
                reason_code: "AL_TEST_PERSISTENCE_AMBIGUOUS",
                evidence_sha256: sha256("persistence ambiguous"),
              });
            } finally {
              // Cleanup only — restores write access for later filesystem
              // operations in this test and eventual temp-dir removal. The
              // authority file itself is never touched here.
              fs.chmodSync(ambiguousRoot, 0o700);
            }
          }),
        (error: unknown) => {
          assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
          assert.equal(error.code, "AL_DURABLE_SAFE_MODE_PERSISTENCE_AMBIGUOUS");
          return true;
        },
      );

      // The authority file must still exist — retained, not released.
      assert.equal(
        fs.existsSync(path.join(ambiguousRoot, VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1)),
        true,
        "PERSISTENCE_AMBIGUOUS must retain the authority file rather than releasing it",
      );

      // A second operation on the SAME in-process pinned-root object must
      // refuse immediately — before executing any body at all.
      let secondBodyRan = false;
      assert.throws(
        () =>
          withHeldAuthorityV1(pinnedAmbiguous, { boundedRetry: false, intent: "latch" }, () => {
            secondBodyRan = true;
          }),
        (error: unknown) => {
          assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
          assert.equal(error.code, "AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED");
          return true;
        },
      );
      assert.equal(
        secondBodyRan,
        false,
        "a pinned root poisoned by PERSISTENCE_AMBIGUOUS must refuse before executing any further body",
      );

      // The lock-free status snapshot read must also fail closed for this
      // same poisoned handle, rather than answering from stale
      // pre-incident state.
      assert.throws(
        () => readVoidAlDurableSafeModeStateSnapshotV1(pinnedAmbiguous),
        (error: unknown) => {
          assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
          assert.equal(error.code, "AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED");
          return true;
        },
      );
    } finally {
      closePinnedDurableRootV1(pinnedAmbiguous);
    }

    // A fresh strict read (a new process generation's install/read)
    // against the SAME on-disk root must also observe RECOVERY_REQUIRED,
    // because the authority file was genuinely never unlinked — this is
    // independent of the in-process poisoning proven above.
    expectLatchError(
      () => readVoidAlDurableSafeModeLatchV1(ambiguousRoot),
      "AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED",
    );
  }

  // --- V3 Blocker-2: pinned-root capability is immutable and
  // runtime-branded — mutation cannot redirect an already-authorized pin,
  // a fabricated structurally-matching object is rejected everywhere, and
  // a closed pin is rejected by every entry point that accepts one. ------
  {
    const brandRoot = privateRoot(temp, "pinned-root-brand");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: brandRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const brandAdmission = admitDurableRootPathnameV1(brandRoot);
    const brandPinned = pinDurableRootGenerationV1(brandAdmission);

    // Object mutation attempt cannot change dirFd/dev/ino/rootPath: the
    // pin is frozen, and ESM modules run in strict mode, so an assignment
    // attempt throws TypeError rather than silently succeeding and
    // redirecting an already-authorized pin to a different root.
    assert.throws(() => {
      (brandPinned as unknown as { dirFd: number }).dirFd = 999999;
    }, TypeError);
    assert.throws(() => {
      (brandPinned as unknown as { rootPath: string }).rootPath = "/tmp/redirected-elsewhere";
    }, TypeError);

    // A hand-constructed object with a structurally identical (even
    // otherwise-valid-looking) shape is never trusted, regardless of what
    // values it carries.
    const fabricated: any = {
      dirFd: brandPinned.dirFd,
      dev: brandPinned.dev,
      ino: brandPinned.ino,
      rootPath: brandPinned.rootPath,
    };
    assert.throws(
      () => readVoidAlDurableSafeModeStateSnapshotV1(fabricated),
      (error: unknown) => {
        assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
        assert.equal(error.code, "AL_DURABLE_SAFE_MODE_PINNED_ROOT_INVALID");
        return true;
      },
    );
    assert.throws(
      () => closePinnedDurableRootV1(fabricated),
      (error: unknown) => {
        assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
        assert.equal(error.code, "AL_DURABLE_SAFE_MODE_PINNED_ROOT_INVALID");
        return true;
      },
    );

    // The while-held read/latch entry points reject the same fabricated
    // pin, even when given an otherwise-valid token minted for a
    // DIFFERENT genuine pin.
    const brandRoot2 = privateRoot(temp, "pinned-root-brand-2");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: brandRoot2,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const brandAdmission2 = admitDurableRootPathnameV1(brandRoot2);
    const brandPinned2 = pinDurableRootGenerationV1(brandAdmission2);
    try {
      withHeldAuthorityV1(brandPinned2, { boundedRetry: false, intent: "latch" }, (token) => {
        assert.throws(
          () => readVoidAlDurableSafeModeStateWhileHeldV1(fabricated, token),
          (error: unknown) => {
            assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
            assert.equal(error.code, "AL_DURABLE_SAFE_MODE_PINNED_ROOT_INVALID");
            return true;
          },
        );
        assert.throws(
          () =>
            latchWithinHeldAuthorityV1(fabricated, token, {
              reason_code: "AL_TEST_FABRICATED_PIN",
              evidence_sha256: sha256("fabricated pin"),
            }),
          (error: unknown) => {
            assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
            assert.equal(error.code, "AL_DURABLE_SAFE_MODE_PINNED_ROOT_INVALID");
            return true;
          },
        );
      });
    } finally {
      closePinnedDurableRootV1(brandPinned2);
    }

    // A genuine pin, once closed, is rejected by every entry point that
    // accepts a pinned root — snapshot read and withHeldAuthorityV1 itself
    // — and a double-close must itself fail closed, never silently no-op.
    closePinnedDurableRootV1(brandPinned);
    assert.throws(
      () => readVoidAlDurableSafeModeStateSnapshotV1(brandPinned),
      (error: unknown) => {
        assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
        assert.equal(error.code, "AL_DURABLE_SAFE_MODE_PINNED_ROOT_INVALID");
        return true;
      },
    );
    assert.throws(
      () => withHeldAuthorityV1(brandPinned, { boundedRetry: false, intent: "latch" }, () => {}),
      (error: unknown) => {
        assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
        assert.equal(error.code, "AL_DURABLE_SAFE_MODE_PINNED_ROOT_INVALID");
        return true;
      },
    );
    assert.throws(
      () => closePinnedDurableRootV1(brandPinned),
      (error: unknown) => {
        assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
        assert.equal(error.code, "AL_DURABLE_SAFE_MODE_PINNED_ROOT_INVALID");
        return true;
      },
    );
  }

  const missingRoot = privateRoot(temp, "missing-state");

  const signer = makeSigner();
  process.env.VOID_AL_BLOCK_COMMIT_RUNTIME_V1 = "1";
  process.env.VOID_CHAIN_ID = "2050";
  process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = "1";
  delete process.env.VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER;
  process.env.VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE = "env";
  process.env.VOID_BLOCK_TRUSTED_PROPOSERS = signer.proposer;

  const missingProto = syntheticPrototype();
  expectLatchError(
    () =>
      installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
        prototype: missingProto,
        enabled: true,
        env: process.env,
        durable_safe_mode_root: missingRoot,
      }),
    "AL_DURABLE_SAFE_MODE_STATE_NOT_INITIALIZED",
  );

  const runtimeRoot = privateRoot(temp, "runtime");
  initializeVoidAlDurableSafeModeLatchV1({
    root_directory: runtimeRoot,
    confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
  });

  const proto1 = syntheticPrototype();
  const installed1 = installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
    prototype: proto1,
    enabled: true,
    env: process.env,
    durable_safe_mode_root: runtimeRoot,
  });
  assert.equal(installed1.marker, VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1);
  assert.equal(installed1.effective_safe_mode, false);
  assert.equal(installed1.durable_mode, "running");
  assert.equal(installed1.restart_restores_safe_mode, true);
  assert.equal(installed1.resume_api_implemented, false);
  assert.equal(installed1.root_generation_pinned_for_process_lifetime, true);
  assert.equal(installed1.cross_process_mutation_serialized, true);
  assert.equal(
    installed1.cross_process_mutation_serialized_scope,
    "compliant_same_uid_processes_only_hostile_eviction_out_of_scope",
  );
  // A normal status call on an unchanged root remains fresh/green.
  assert.equal(installed1.root_generation_current, true);

  // Raw bypass of the NESTED private method: the (unmodified, separate)
  // child guard alone still blocks the write. Durable is intentionally not
  // independently re-wrapped around this nested call — see the design note
  // in void_alignment_layer_block_commit_durable_runtime_v1.ts — the
  // unified authority instead guards the three top-level entry points
  // end-to-end, once, per logical operation.
  expectHeld(
    () => proto1.saveBlockCommit({ number: 0, note: "raw bypass" }),
    VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1,
  );
  assert.equal(proto1.raw_writes, 0);

  // An external, non-writer watchdog durably latches safe mode via the
  // standalone entry point — proving watchdogs retain latch authority
  // independent of any installed writer.
  const watchdogEvidence = sha256("watchdog forced safe mode");
  const watchdogLatched = latchVoidAlDurableSafeModeV1({
    root_directory: runtimeRoot,
    reason_code: "AL_TEST_WATCHDOG_FORCED",
    evidence_sha256: watchdogEvidence,
  });
  assert.equal(watchdogLatched.mode, "safe_mode");
  assert.equal(watchdogLatched.generation, "1");

  // --- Finding-4 falsifier: status() must reflect the watchdog's durable
  // latch RIGHT NOW, purely from a fresh on-disk read — proto1's writer is
  // idle (no mutation attempted yet, so state.durable's cache would still
  // say "running" if status() trusted it), and this must not report
  // effective_safe_mode=false from that known-stale cache. --------------
  const statusAfterWatchdogLatch = getVoidAlignmentLayerBlockCommitDurableRuntimeStatusV1(proto1);
  assert.equal(
    statusAfterWatchdogLatch.effective_safe_mode,
    true,
    "status() must not report effective_safe_mode=false from a stale cache after an external watchdog latch",
  );
  assert.equal(statusAfterWatchdogLatch.durable_mode, "safe_mode");
  assert.equal(statusAfterWatchdogLatch.durable_generation, "1");
  assert.equal(statusAfterWatchdogLatch.durable_reason_code, "AL_TEST_WATCHDOG_FORCED");
  assert.equal(statusAfterWatchdogLatch.durable_read_fresh, true);
  assert.equal(statusAfterWatchdogLatch.durable_read_error_code, null);
  assert.equal(statusAfterWatchdogLatch.root_generation_current, true);

  // proto1's OWN next top-level mutation attempt must observe that
  // externally-durable latch via a FRESH read taken while holding the
  // authority — never a stale in-memory cache — and refuse before the
  // child guard even runs.
  expectHeld(
    () => proto1.saveBlock({ number: 0 }),
    VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1,
  );

  const persisted = readVoidAlDurableSafeModeLatchV1(runtimeRoot);
  assert.equal(persisted.mode, "safe_mode");
  assert.equal(persisted.generation, "1");
  assert.equal(persisted.latest_reason_code, "AL_TEST_WATCHDOG_FORCED");

  // A new prototype models a new process generation using the same durable
  // root — restart restores safe mode.
  const proto2 = syntheticPrototype();
  const installed2 = installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
    prototype: proto2,
    enabled: true,
    env: process.env,
    durable_safe_mode_root: runtimeRoot,
  });
  assert.equal(installed2.effective_safe_mode, true);
  assert.equal(installed2.durable_mode, "safe_mode");
  assert.equal(installed2.durable_generation, "1");
  expectHeld(
    () => proto2.saveBlock({ number: 0, note: "restart must hold" }),
    VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1,
  );
  assert.equal(proto2.raw_writes, 0);
  const status2 = getVoidAlignmentLayerBlockCommitDurableRuntimeStatusV1(proto2);
  assert.equal(status2.effective_safe_mode, true);
  assert.equal(status2.durable_mode, "safe_mode");
  assert.equal(status2.automatic_resume_allowed, false);
  assert.equal(status2.resume_api_implemented, false);

  // --- D8/D9: nested saveBlockCommit does not deadlock or re-acquire the
  // durable authority (saveBlockCommit is called from WITHIN
  // replayWalAllBestEffort's own already-held top-level authority — if it
  // independently tried to re-acquire the same O_EXCL file in this same
  // synchronous call stack, this would surface as AL_DURABLE_SAFE_MODE_
  // AUTHORITY_BUSY, not as the expected child-guard outcome below), and WAL
  // replay remains one complete serialized logical operation: the prior
  // double-durable-latch defect stays fixed — generation bumps exactly
  // once for this one logical incident, not once per nested call. --------
  const latentRoot = privateRoot(temp, "latent");
  initializeVoidAlDurableSafeModeLatchV1({
    root_directory: latentRoot,
    confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
  });
  const latentProto = syntheticPrototype();
  latentProto.replay_candidate = makeGenesis(signer, "latent-wal-safe-mode");
  latentProto.replayWalAllBestEffort = function replayWithoutHeadTerminal() {
    this.saveBlockCommit(this.replay_candidate);
  };
  installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
    prototype: latentProto,
    enabled: true,
    env: process.env,
    durable_safe_mode_root: latentRoot,
  });
  expectHeld(
    () => latentProto.replayWalAllBestEffort(),
    VOID_AL_DURABLE_SAFE_MODE_CHILD_LATCHED_V1,
  );
  assert.equal(latentProto.raw_writes, 1);
  const latentPersisted = readVoidAlDurableSafeModeLatchV1(latentRoot);
  assert.equal(latentPersisted.mode, "safe_mode");
  assert.equal(latentPersisted.generation, "1");
  assert.equal(
    latentPersisted.latest_reason_code,
    "AL_WAL_REPLAY_COMMIT_WITHOUT_HEAD_TERMINAL",
  );

  // A second, independent nested-call case: saveBlockCommit followed by a
  // real persistHeadAtomic head terminal (clearing pending_replay), proving
  // the nested sequence can also complete WITHOUT any safe-mode transition
  // at all — not just the violation path above — within the same single
  // acquisition, using the real SegStore class end-to-end rather than a
  // synthetic prototype.
  {
    const segRoot = privateRoot(temp, "nested-no-reacquire-segstore");
    const segStoreRoot = privateRoot(temp, "nested-no-reacquire-segstore-data");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: segRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const { SegStore } = await import("../src/chain/seg_store.js");
    // Construct with AL not yet "requested" so the startup head-reconciler
    // seeds heads.json/head.txt normally; durable is installed afterward.
    const savedGate = process.env.VOID_AL_BLOCK_COMMIT_RUNTIME_V1;
    delete process.env.VOID_AL_BLOCK_COMMIT_RUNTIME_V1;
    const store = new SegStore(segStoreRoot);
    restoreEnv("VOID_AL_BLOCK_COMMIT_RUNTIME_V1", savedGate);
    const proto = Object.getPrototypeOf(store);
    installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
      prototype: proto,
      enabled: true,
      env: process.env,
      durable_safe_mode_root: segRoot,
    });
    const genesis = makeGenesis(signer, "nested-no-reacquire-segstore");
    store.saveBlock(genesis);
    assert.equal(store.loadHeadNumber(), 0);
    const nestedFinalState = readVoidAlDurableSafeModeLatchV1(segRoot);
    assert.equal(
      nestedFinalState.mode,
      "running",
      "a clean nested saveBlockCommit+persistHeadAtomic must not itself deadlock or falsely latch",
    );
  }

  // --- D1: canonical root renamed aside + same-owner/mode imposter
  // installed at the original pathname while the runtime remains alive.
  // The retained runtime must never touch the imposter, and its next
  // top-level mutation must HOLD on canonical-generation mismatch. -------
  {
    const driftRoot = privateRoot(temp, "drift-canonical");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: driftRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const driftProto = syntheticPrototype();
    driftProto.replayWalAllBestEffort = function noopReplay() {
      this.replay_calls = (this.replay_calls ?? 0) + 1;
    };
    installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
      prototype: driftProto,
      enabled: true,
      env: process.env,
      durable_safe_mode_root: driftRoot,
    });

    // First call: normal operation, generation stays "running".
    driftProto.replayWalAllBestEffort();
    assert.equal(driftProto.replay_calls, 1);
    assert.equal(readVoidAlDurableSafeModeLatchV1(driftRoot).mode, "running");

    const displacedRoot = `${driftRoot}-displaced`;
    fs.renameSync(driftRoot, displacedRoot);
    fs.mkdirSync(driftRoot, { recursive: false, mode: 0o700 });
    fs.chmodSync(driftRoot, 0o700);
    const imposterMarker = path.join(driftRoot, "imposter-marker.txt");
    fs.writeFileSync(imposterMarker, "not the real root\n", { mode: 0o600 });

    expectHeld(
      () => driftProto.replayWalAllBestEffort(),
      VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
    );
    // The retained runtime must never have touched the imposter: it must
    // still contain only the marker this test wrote, no state/lock file.
    assert.deepEqual(
      fs.readdirSync(driftRoot).sort(),
      ["imposter-marker.txt"],
    );
    // The incident was durably recorded against the RETAINED (displaced)
    // generation, not the imposter.
    const displacedState = readVoidAlDurableSafeModeLatchV1(displacedRoot);
    assert.equal(displacedState.mode, "safe_mode");
    assert.equal(displacedState.generation, "1");
    assert.equal(displacedState.latest_reason_code, VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1);
  }

  // --- V4 Blocker-1 falsifier: the root-generation drift must be caught
  // even when it lands strictly AFTER the top-level mutation authority is
  // acquired and strictly BEFORE the in-authority canary evaluates it — the
  // exact check-then-acquire gap the V3 ordering left open. There is no
  // real interleaving point to race for real here (this design is
  // single-threaded and fully synchronous between acquisition and the
  // canary), so the adversary is simulated deterministically via a
  // test-only hook that fires at precisely that point. -------------------
  {
    const postAcquireRoot = privateRoot(temp, "post-acquire-pre-canary-drift");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: postAcquireRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const postAcquireProto = syntheticPrototype();
    postAcquireProto.replayWalAllBestEffort = function noopReplay() {
      this.replay_calls = (this.replay_calls ?? 0) + 1;
    };
    const displacedPostAcquireRoot = `${postAcquireRoot}-displaced`;
    let hookFired = false;
    installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
      prototype: postAcquireProto,
      enabled: true,
      env: process.env,
      durable_safe_mode_root: postAcquireRoot,
      test_hooks: {
        afterMutationAuthorityAcquiredBeforeCanaryV1: () => {
          hookFired = true;
          // The same displaced-root + same-owner/mode-imposter adversary
          // the D1 test above uses, but injected strictly AFTER this
          // call's own authority acquisition rather than before the call
          // even starts.
          fs.renameSync(postAcquireRoot, displacedPostAcquireRoot);
          fs.mkdirSync(postAcquireRoot, { recursive: false, mode: 0o700 });
          fs.chmodSync(postAcquireRoot, 0o700);
        },
      },
    });

    expectHeld(
      () => postAcquireProto.replayWalAllBestEffort(),
      VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
    );
    assert.equal(hookFired, true, "the post-acquire/pre-canary adversary hook must actually have run");
    assert.equal(
      postAcquireProto.replay_calls,
      undefined,
      "zero mutation-body execution: the guarded method body must never run once the in-authority canary trips, even when the drift landed after acquisition",
    );
    // The imposter the adversary installed at the canonical pathname must
    // remain completely untouched — no state/lock file was ever written
    // into it.
    assert.deepEqual(fs.readdirSync(postAcquireRoot), []);
    // The incident must be durably latched against the RETAINED (displaced)
    // generation, via the SAME authority token already held.
    const postAcquireDisplacedState = readVoidAlDurableSafeModeLatchV1(displacedPostAcquireRoot);
    assert.equal(postAcquireDisplacedState.mode, "safe_mode");
    assert.equal(postAcquireDisplacedState.generation, "1");
    assert.equal(
      postAcquireDisplacedState.latest_reason_code,
      VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
    );
  }

  // --- Blocker-3: canonical-root ADMISSION FAILURE (not just an outright
  // dev/ino mismatch) during the canary must also durably convert to
  // ROOT_DRIFTED via the retained root, never escape unlatched. Three
  // distinct admission-failure shapes, each in its own fresh root. --------
  {
    // (a) missing path entirely (renamed aside, nothing restored) ->
    // admitDurableRootPathnameV1 throws AL_DURABLE_SAFE_MODE_ROOT_UNAVAILABLE.
    const missingDriftRoot = privateRoot(temp, "drift-missing");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: missingDriftRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const missingDriftProto = syntheticPrototype();
    missingDriftProto.replayWalAllBestEffort = function noopReplay() {};
    installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
      prototype: missingDriftProto,
      enabled: true,
      env: process.env,
      durable_safe_mode_root: missingDriftRoot,
    });
    const displacedMissing = `${missingDriftRoot}-displaced`;
    fs.renameSync(missingDriftRoot, displacedMissing);
    expectHeld(
      () => missingDriftProto.replayWalAllBestEffort(),
      VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
    );
    const displacedMissingState = readVoidAlDurableSafeModeLatchV1(displacedMissing);
    assert.equal(displacedMissingState.mode, "safe_mode");
    assert.equal(displacedMissingState.latest_reason_code, VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1);
    assert.equal(fs.existsSync(missingDriftRoot), false, "must never adopt/recreate the missing candidate path");
  }
  {
    // (b) canonical pathname replaced with a SYMLINK (not a real
    // directory) -> admitDurableRootPathnameV1 throws
    // AL_DURABLE_SAFE_MODE_ROOT_NOT_REAL_DIRECTORY.
    const symlinkDriftRoot = privateRoot(temp, "drift-symlink");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: symlinkDriftRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const symlinkDriftProto = syntheticPrototype();
    symlinkDriftProto.replayWalAllBestEffort = function noopReplay() {};
    installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
      prototype: symlinkDriftProto,
      enabled: true,
      env: process.env,
      durable_safe_mode_root: symlinkDriftRoot,
    });
    const displacedSymlink = `${symlinkDriftRoot}-displaced`;
    fs.renameSync(symlinkDriftRoot, displacedSymlink);
    const symlinkTarget = privateRoot(temp, "drift-symlink-target");
    fs.symlinkSync(symlinkTarget, symlinkDriftRoot);
    expectHeld(
      () => symlinkDriftProto.replayWalAllBestEffort(),
      VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
    );
    const displacedSymlinkState = readVoidAlDurableSafeModeLatchV1(displacedSymlink);
    assert.equal(displacedSymlinkState.mode, "safe_mode");
    assert.equal(displacedSymlinkState.latest_reason_code, VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1);
    assert.equal(fs.lstatSync(symlinkDriftRoot).isSymbolicLink(), true, "must never touch/replace the symlink");
    assert.deepEqual(fs.readdirSync(symlinkTarget), [], "must never write through the symlink into its target");
  }
  {
    // (c) canonical pathname replaced with an insecurely-moded directory
    // (group/other readable) -> admitDurableRootPathnameV1 throws
    // AL_DURABLE_SAFE_MODE_ROOT_NOT_PRIVATE.
    const modeDriftRoot = privateRoot(temp, "drift-mode");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: modeDriftRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const modeDriftProto = syntheticPrototype();
    modeDriftProto.replayWalAllBestEffort = function noopReplay() {};
    installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
      prototype: modeDriftProto,
      enabled: true,
      env: process.env,
      durable_safe_mode_root: modeDriftRoot,
    });
    const displacedMode = `${modeDriftRoot}-displaced`;
    fs.renameSync(modeDriftRoot, displacedMode);
    fs.mkdirSync(modeDriftRoot, { recursive: false, mode: 0o755 });
    fs.chmodSync(modeDriftRoot, 0o755);
    expectHeld(
      () => modeDriftProto.replayWalAllBestEffort(),
      VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
    );
    const displacedModeState = readVoidAlDurableSafeModeLatchV1(displacedMode);
    assert.equal(displacedModeState.mode, "safe_mode");
    assert.equal(displacedModeState.latest_reason_code, VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1);
    assert.deepEqual(fs.readdirSync(modeDriftRoot), [], "must never write into the insecurely-moded candidate");
  }

  // --- V4 Truth-Gap-3 falsifier: status() must fail closed on canonical
  // root drift discovered while the installed writer is otherwise IDLE —
  // BEFORE any mutation is ever attempted — not only after a mutation
  // attempt's own canary trips. -------------------------------------------
  {
    const idleDriftRoot = privateRoot(temp, "idle-status-drift");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: idleDriftRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const idleDriftProto = syntheticPrototype();
    const idleDriftInstalled = installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
      prototype: idleDriftProto,
      enabled: true,
      env: process.env,
      durable_safe_mode_root: idleDriftRoot,
    });
    assert.equal(idleDriftInstalled.root_generation_current, true);
    assert.equal(idleDriftInstalled.effective_safe_mode, false);

    // A normal status call on the still-unchanged root remains fresh/green.
    const idleStatusBeforeDrift = getVoidAlignmentLayerBlockCommitDurableRuntimeStatusV1(idleDriftProto);
    assert.equal(idleStatusBeforeDrift.root_generation_current, true);
    assert.equal(idleStatusBeforeDrift.effective_safe_mode, false);
    assert.equal(idleStatusBeforeDrift.durable_read_fresh, true);

    // Displace the canonical root and install a same-owner/mode imposter at
    // the original pathname. No mutation is ever attempted against
    // idleDriftProto — the writer is, and remains, idle.
    const idleDisplacedRoot = `${idleDriftRoot}-displaced`;
    fs.renameSync(idleDriftRoot, idleDisplacedRoot);
    fs.mkdirSync(idleDriftRoot, { recursive: false, mode: 0o700 });
    fs.chmodSync(idleDriftRoot, 0o700);

    const idleStatusAfterDrift = getVoidAlignmentLayerBlockCommitDurableRuntimeStatusV1(idleDriftProto);
    assert.equal(
      idleStatusAfterDrift.root_generation_current,
      false,
      "status() must detect canonical-root drift on its own read-only re-check",
    );
    assert.equal(
      idleStatusAfterDrift.effective_safe_mode,
      true,
      "status() must fail closed the moment root drift is detected, with zero mutation attempts",
    );
    assert.equal(idleStatusAfterDrift.durable_read_fresh, false);
    assert.ok(idleStatusAfterDrift.durable_read_error_code);
    // The cached durable fields are still returned — as explicitly stale
    // evidence, not fabricated — reflecting the pre-drift "running" state,
    // never cleared to some other value.
    assert.equal(idleStatusAfterDrift.durable_mode, "running");

    // status() itself must be strictly READ-ONLY: the imposter directory it
    // discovered remains completely untouched, and the retained (displaced)
    // generation's own on-disk state still shows zero incidents — status()
    // never latched or mutated anything while detecting the drift.
    assert.deepEqual(fs.readdirSync(idleDriftRoot), []);
    const idleDisplacedState = readVoidAlDurableSafeModeLatchV1(idleDisplacedRoot);
    assert.equal(idleDisplacedState.mode, "running");
    assert.equal(idleDisplacedState.generation, "0");

    // A subsequent real mutation attempt still independently HOLDs via its
    // own in-authority canary — status() having already found the drift
    // read-only does not change, or substitute for, that.
    expectHeld(
      () => idleDriftProto.saveBlock({ number: 0 }),
      VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
    );
    const idleDisplacedStateAfterMutationAttempt = readVoidAlDurableSafeModeLatchV1(idleDisplacedRoot);
    assert.equal(idleDisplacedStateAfterMutationAttempt.mode, "safe_mode");
    assert.equal(
      idleDisplacedStateAfterMutationAttempt.latest_reason_code,
      VOID_AL_DURABLE_SAFE_MODE_ROOT_DRIFTED_V1,
    );
  }

  // --- D3: M-before-L ordering. A top-level mutation's critical section
  // spawns a real child watchdog attempt mid-flight (deterministic via
  // spawnSync blocking) and proves it cannot acquire while held; after the
  // mutation releases, a fresh watchdog attempt succeeds. -----------------
  {
    const orderRoot = privateRoot(temp, "order-m-before-l");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: orderRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const orderProto = syntheticPrototype();
    let childObservedWhileHeld: { ok: boolean } | null = null;
    orderProto.replayWalAllBestEffort = function mutationSpawningChild() {
      childObservedWhileHeld = spawnLockWorker(workerScript, orderRoot, "try-once");
    };
    installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
      prototype: orderProto,
      enabled: true,
      env: process.env,
      durable_safe_mode_root: orderRoot,
    });
    orderProto.replayWalAllBestEffort();
    assert.ok(childObservedWhileHeld);
    assert.equal(
      (childObservedWhileHeld as { ok: boolean }).ok,
      false,
      "watchdog must not acquire while M's critical section holds the authority",
    );

    // After M released, a fresh watchdog attempt must succeed and be able
    // to latch.
    const afterRelease = spawnLockWorker(workerScript, orderRoot, "try-once");
    assert.equal(afterRelease.ok, true);
    // Clean up the raw lock this worker created (outside the library's own
    // release path, by design, to keep the worker minimal) before using
    // the real API for the subsequent latch.
    fs.unlinkSync(path.join(orderRoot, VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1));

    const latchedAfter = latchVoidAlDurableSafeModeV1({
      root_directory: orderRoot,
      reason_code: "AL_TEST_L_AFTER_M",
      evidence_sha256: sha256("l after m"),
    });
    assert.equal(latchedAfter.mode, "safe_mode");
    assert.equal(latchedAfter.generation, "1");
  }

  // --- D4: L-before-M ordering — the core impossibility property. A latch
  // durably writes safe_mode and is paused (still holding the authority)
  // before release; a concurrent mutation attempt cannot acquire while
  // held; once released, the mutation's own fresh read observes safe_mode
  // and refuses — zero mutation after durable latch. ----------------------
  {
    const orderRoot2 = privateRoot(temp, "order-l-before-m");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: orderRoot2,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });
    const admission2 = admitDurableRootPathnameV1(orderRoot2);
    const pinned2 = pinDurableRootGenerationV1(admission2);
    let mutationObservedWhileLatchHeld: { ok: boolean } | null = null;
    try {
      withHeldAuthorityV1(pinned2, { boundedRetry: false, intent: "latch" }, (token) => {
        const latchedDuring = latchWithinHeldAuthorityV1(pinned2, token, {
          reason_code: "AL_TEST_L_BEFORE_M",
          evidence_sha256: sha256("l before m"),
        });
        assert.equal(latchedDuring.mode, "safe_mode");
        // Durably written, authority still held (not yet released, since
        // withHeldAuthorityV1 releases only AFTER this callback returns) —
        // a concurrent mutation attempt must fail to acquire right now.
        mutationObservedWhileLatchHeld = spawnLockWorker(workerScript, orderRoot2, "try-once");
      });
    } finally {
      closePinnedDurableRootV1(pinned2);
    }
    assert.ok(mutationObservedWhileLatchHeld);
    assert.equal(
      (mutationObservedWhileLatchHeld as { ok: boolean }).ok,
      false,
      "mutation must not acquire while L's durable write is still held",
    );

    // After release, install a runtime (fresh read observes the durable
    // latch at install time) and prove the FIRST top-level mutation
    // attempt refuses without ever reaching the child guard's real write.
    const mProto = syntheticPrototype();
    const installedAfterLatch = installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1({
      prototype: mProto,
      enabled: true,
      env: process.env,
      durable_safe_mode_root: orderRoot2,
    });
    assert.equal(installedAfterLatch.durable_mode, "safe_mode");
    expectHeld(
      () => mProto.saveBlock({ number: 0 }),
      VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1,
    );
    assert.equal(mProto.raw_writes, 0);
  }

  // --- D5/D6/D7(b,c): crash-holder survives as an authority file and is
  // never auto-reclaimed (even after confirmed process death); forged/live
  // PID content grants no authority; ordinary bounded contention is
  // distinguishable from a surviving authority. ---------------------------
  {
    const crashHoldRoot = privateRoot(temp, "crash-holder");
    initializeVoidAlDurableSafeModeLatchV1({
      root_directory: crashHoldRoot,
      confirmation: VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
    });

    // D6 first: forge a lock file whose content claims a currently-live
    // pid (this very test process) — content/pid must never grant
    // authority, since acquisition is a pure O_EXCL existence check.
    const forged = spawnLockWorker(workerScript, crashHoldRoot, "acquire-forged-pid-and-exit", {
      VOID_TEST_FORGED_PID: String(process.pid),
    });
    assert.equal(forged.ok, true);
    {
      const admissionForged = admitDurableRootPathnameV1(crashHoldRoot);
      const pinnedForged = pinDurableRootGenerationV1(admissionForged);
      try {
        assert.throws(
          () => withHeldAuthorityV1(pinnedForged, { boundedRetry: true, intent: "mutation" }, () => {}),
          (error: unknown) => {
            assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
            assert.equal(error.code, "AL_DURABLE_SAFE_MODE_AUTHORITY_BUSY");
            return true;
          },
        );
      } finally {
        closePinnedDurableRootV1(pinnedForged);
      }
    }
    fs.unlinkSync(path.join(crashHoldRoot, VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1));

    // D5/D7(c): a real child process acquires the authority and is
    // SIGKILLed while holding it (a hard, non-graceful termination — no
    // cleanup runs). While it is confirmed alive and holding, an ordinary
    // bounded-retry acquire attempt must terminate in the distinct BUSY
    // state, not RECOVERY_REQUIRED.
    const child = spawn(process.execPath, [workerScript], {
      env: { ...process.env, VOID_TEST_ROOT: crashHoldRoot, VOID_TEST_MODE: "acquire-and-block" },
      stdio: ["pipe", "pipe", "inherit"],
    });
    const readiness: { ok: boolean; pid: number } = await new Promise((resolve, reject) => {
      let buf = "";
      child.stdout!.on("data", (chunk) => {
        buf += chunk.toString("utf8");
        const nl = buf.indexOf("\n");
        if (nl >= 0) resolve(JSON.parse(buf.slice(0, nl)));
      });
      child.on("error", reject);
    });
    assert.equal(readiness.ok, true);
    assert.ok(pidIsAlive(readiness.pid));

    {
      const admissionBusy = admitDurableRootPathnameV1(crashHoldRoot);
      const pinnedBusy = pinDurableRootGenerationV1(admissionBusy);
      try {
        assert.throws(
          () => withHeldAuthorityV1(pinnedBusy, { boundedRetry: true, intent: "mutation" }, () => {}),
          (error: unknown) => {
            assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
            assert.equal(error.code, "AL_DURABLE_SAFE_MODE_AUTHORITY_BUSY");
            return true;
          },
        );
      } finally {
        closePinnedDurableRootV1(pinnedBusy);
      }
    }

    child.kill("SIGKILL");
    // A SIGKILLed child becomes a zombie, still visible to kill(pid, 0),
    // until the parent's event loop actually processes SIGCHLD and reaps
    // it — a synchronous busy-loop would never yield for that to happen,
    // so this specific wait (only) uses real async polling.
    await new Promise<void>((resolve, reject) => {
      const deathDeadline = Date.now() + 5000;
      const poll = () => {
        if (!pidIsAlive(readiness.pid)) return resolve();
        if (Date.now() >= deathDeadline) return reject(new Error("child did not die in time"));
        setTimeout(poll, 20);
      };
      poll();
    });
    assert.equal(pidIsAlive(readiness.pid), false, "child did not die in time");

    // D5: even now that the holder is CONFIRMED dead, the authority file
    // survives and is never auto-reclaimed on that basis — acquisition
    // still fails (as BUSY, from an ordinary caller's perspective; the
    // library performs no liveness check at all, confirmed by the source
    // assertion above that no pid-liveness logic exists in the latch
    // module).
    {
      const admissionAfterDeath = admitDurableRootPathnameV1(crashHoldRoot);
      const pinnedAfterDeath = pinDurableRootGenerationV1(admissionAfterDeath);
      try {
        assert.throws(
          () => withHeldAuthorityV1(pinnedAfterDeath, { boundedRetry: true, intent: "mutation" }, () => {}),
          (error: unknown) => {
            assert.ok(error instanceof VoidAlDurableSafeModeLatchErrorV1);
            assert.equal(error.code, "AL_DURABLE_SAFE_MODE_AUTHORITY_BUSY");
            return true;
          },
        );
      } finally {
        closePinnedDurableRootV1(pinnedAfterDeath);
      }
    }
    // D7(a) again, now against a REAL crash remnant specifically: fresh
    // admission/read/install-style access must call it RECOVERY_REQUIRED,
    // not BUSY — the distinction is "am I at admission" not "how long did
    // I wait."
    expectLatchError(
      () => readVoidAlDurableSafeModeLatchV1(crashHoldRoot),
      "AL_DURABLE_SAFE_MODE_RECOVERY_REQUIRED",
    );

    assert.equal(
      fs.existsSync(path.join(crashHoldRoot, VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1)),
      true,
      "the crash-held authority file must still be present — never silently removed",
    );
  }

  console.log(MARKER);
  console.log("explicit_private_root=true");
  console.log("create_only_initialization=true");
  console.log("file_mode_0600=true");
  console.log("file_and_directory_fsync=true");
  console.log("zero_evidence_rejected=true");
  console.log("fingerprint_tamper_rejected=true");
  console.log("crash_lock_fail_closed=true");
  console.log("child_safe_mode_persisted=true");
  console.log("latent_child_safe_mode_persisted=true");
  console.log("restart_restores_safe_mode=true");
  console.log("automatic_resume_allowed=false");
  console.log("resume_api_implemented=false");
  console.log("normal_entrypoint_bootstrap_mounted=false");
  console.log("activation_ready=false");
  console.log("live_activation_performed=false");
  console.log("sovereign_usb_access=false");
  console.log("chain2050_live_mutation=false");
  console.log("money_movement=false");
  console.log("root_generation_pinned_for_process_lifetime=true");
  console.log("root_generation_drift_hold_proven=true");
  console.log("cross_process_mutation_and_latch_serialized=true");
  console.log("m_before_l_ordering_proven=true");
  console.log("l_before_m_zero_commit_after_latch_proven=true");
  console.log("crash_holder_never_auto_reclaimed=true");
  console.log("forged_live_pid_grants_no_authority=true");
  console.log("busy_distinct_from_recovery_required=true");
  console.log("nested_mutation_no_reacquire=true");
  console.log("authority_while_held_primitives_require_capability_token=true");
  console.log("authority_acquire_release_not_externally_callable=true");
  console.log("authority_generation_bound_to_acquisition=true");
  console.log("authority_release_rejects_foreign_generation_present_at_validation=true");
  console.log("authority_release_atomic_against_hostile_same_uid_racer=false");
  console.log("root_generation_canary_runs_inside_held_mutation_authority=true");
  console.log("root_generation_drift_post_acquire_pre_canary_caught=true");
  console.log("root_admission_failure_during_in_authority_canary_converts_to_durable_root_drifted=true");
  console.log("status_never_reports_effective_safe_mode_false_from_stale_cache=true");
  console.log("status_root_generation_reverified_read_only=true");
  console.log("status_fails_closed_on_root_generation_drift_while_idle=true");
  console.log("cross_process_mutation_serialized_scope_exposed_as_data=true");
  console.log("constructor_replay_swallow_tracked_as_activation_hold=true");
  console.log("persistence_ambiguous_retains_authority_never_auto_releases=true");
  console.log("persistence_ambiguous_poisons_pinned_root_in_process=true");
  console.log("pinned_root_capability_immutable=true");
  console.log("pinned_root_capability_runtime_branded=true");
  console.log("fabricated_pinned_root_rejected=true");
  console.log("closed_pinned_root_rejected=true");
  console.log("same_uid_namespace_trust_tracked_as_activation_hold=true");
} finally {
  restoreEnv("VOID_AL_BLOCK_COMMIT_RUNTIME_V1", prevGate);
  restoreEnv("VOID_CHAIN_ID", prevChain);
  restoreEnv(
    "VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED",
    prevAuthorityRequired,
  );
  restoreEnv("VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER", prevLegacyAuthorityRequired);
  restoreEnv("VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE", prevAuthoritySource);
  restoreEnv("VOID_BLOCK_TRUSTED_PROPOSERS", prevTrusted);
  fs.rmSync(temp, { recursive: true, force: true });
}
