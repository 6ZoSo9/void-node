#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
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
  getVoidAlignmentLayerBlockCommitDurableRuntimeStatusV1,
  installVoidAlignmentLayerBlockCommitDurableRuntimeOnPrototypeV1,
} from "../src/security/void_alignment_layer_block_commit_durable_runtime_v1.js";
import {
  VOID_AL_DURABLE_SAFE_MODE_INITIALIZE_CONFIRMATION_V1,
  VOID_AL_DURABLE_SAFE_MODE_LATCH_V1,
  VOID_AL_DURABLE_SAFE_MODE_LOCK_FILE_V1,
  VOID_AL_DURABLE_SAFE_MODE_STATE_FILE_V1,
  VoidAlDurableSafeModeLatchErrorV1,
  initializeVoidAlDurableSafeModeLatchV1,
  latchVoidAlDurableSafeModeV1,
  readVoidAlDurableSafeModeLatchV1,
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
  return captured;
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
assert.equal(fixture.closed_hold, "HOLD_AL_DURABLE_SAFE_MODE_STATE_REQUIRED");
assert.equal(fixture.activation.ready, false);
assert.equal(fixture.authority_boundary.sovereign_usb_access, false);
assert.equal(fixture.authority_boundary.chain2050_live_mutation, false);
assert.equal(fixture.authority_boundary.money_movement, false);

const latchSource = fs.readFileSync(
  path.join(process.cwd(), "src/security/void_al_durable_safe_mode_latch_v1.ts"),
  "utf8",
);
assert.match(latchSource, /VOID_AL_DURABLE_SAFE_MODE_LATCH_V1/);
assert.match(latchSource, /O_EXCL/);
assert.match(latchSource, /fsyncSync/);
assert.match(latchSource, /renameSync/);
assert.equal(/export function (?:resume|clear)/i.test(latchSource), false);

const durableRuntimeSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/security/void_alignment_layer_block_commit_durable_runtime_v1.ts",
  ),
  "utf8",
);
assert.match(durableRuntimeSource, /VOID_AL_BLOCK_COMMIT_DURABLE_RUNTIME_V1/);
assert.match(durableRuntimeSource, /VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1/);
assert.match(durableRuntimeSource, /latchVoidAlDurableSafeModeV1/);
assert.match(durableRuntimeSource, /persistLatentChildSafeMode/);

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

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-al-durable-safe-mode-"));
fs.chmodSync(temp, 0o700);

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

  expectHeld(
    () => proto1.saveBlockCommit({ number: 0, note: "raw bypass" }),
    VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1,
  );
  assert.equal(proto1.raw_writes, 0);

  const persisted = readVoidAlDurableSafeModeLatchV1(runtimeRoot);
  assert.equal(persisted.mode, "safe_mode");
  assert.equal(persisted.generation, "1");
  assert.equal(
    persisted.latest_reason_code,
    VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1,
  );
  assert.match(persisted.latest_evidence_sha256 ?? "", /^[0-9a-f]{64}$/);

  // A new prototype models a new process generation using the same durable root.
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
    () => proto2.saveBlockCommit({ number: 0, note: "restart must hold" }),
    VOID_AL_DURABLE_SAFE_MODE_RESTORED_V1,
  );
  assert.equal(proto2.raw_writes, 0);
  const status2 = getVoidAlignmentLayerBlockCommitDurableRuntimeStatusV1(proto2);
  assert.equal(status2.effective_safe_mode, true);
  assert.equal(status2.durable_mode, "safe_mode");
  assert.equal(status2.automatic_resume_allowed, false);
  assert.equal(status2.resume_api_implemented, false);

  // Prove a child safe mode that is latched only after inner replay returns is
  // also persisted before caller control continues.
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
