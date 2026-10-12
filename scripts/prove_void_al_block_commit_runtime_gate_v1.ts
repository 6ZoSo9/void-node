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
  blockHash,
  blockHeaderBytes,
  computeRoots,
  nodeIdFromPubPEM,
} from "../src/chain/block.js";
import {
  SegStore,
  VOID_AL_SEGSTORE_STARTUP_HEAD_RECONCILIATION_HOLD_V1,
} from "../src/chain/seg_store.js";
import {
  VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1,
  VOID_AL_BLOCK_COMMIT_MUTATION_EXCEPTION_V1,
  VOID_AL_BLOCK_HEAD_DIRECT_BYPASS_V1,
  VoidAlBlockCommitRuntimeHeldErrorV1,
  getVoidAlignmentLayerBlockCommitRuntimeStatusV1,
  installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1,
} from "../src/security/void_alignment_layer_block_commit_runtime_v1.js";

const MARKER = "VOID_AL_BLOCK_COMMIT_RUNTIME_GATE_V1_PROOF_GREEN";
const ZERO = "0".repeat(64);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function makeSigner() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const proposer = nodeIdFromPubPEM(publicPem);
  return { publicPem, privateKey, proposer };
}

function makeBlock(args: {
  number: number;
  parent: any | null;
  signer: ReturnType<typeof makeSigner>;
  note: string;
}) {
  const body = { kind: "al-block-gate-proof", note: args.note };
  const txHash = sha256(JSON.stringify(body));
  const txs = [{ hash: txHash, body }];
  const roots = computeRoots(txs, []);
  const candidate: any = {
    number: args.number,
    parentHash: args.parent ? blockHash(args.parent) : ZERO,
    timestamp: 1_787_550_000_000 + args.number,
    txRoot: roots.txRoot,
    blobRoot: roots.blobRoot,
    txs,
    blobs: [],
    proposer: args.signer.proposer,
    proposerPubkey: args.signer.publicPem,
    sig: "",
  };
  candidate.sig = sign(
    null,
    blockHeaderBytes(candidate),
    args.signer.privateKey,
  ).toString("hex");
  return candidate;
}

function expectHeld(
  fn: () => unknown,
  code: string,
  disposition: "reject" | "quarantine" | "safe_mode",
) {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof VoidAlBlockCommitRuntimeHeldErrorV1);
    assert.equal(error.code, code);
    assert.equal(error.disposition, disposition);
    assert.match(error.evidence_sha256, /^[0-9a-f]{64}$/);
    return true;
  });
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function segmentBin(root: string, n = 0): string {
  const base = Math.floor(n / 10_000) * 10_000;
  return path.join(root, "segments", String(base).padStart(8, "0"), "blocks.bin");
}

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "fixtures/governance/void-al-block-commit-runtime-gate-v1.json",
    ),
    "utf8",
  ),
);
assert.equal(fixture.marker, "VOID_AL_BLOCK_COMMIT_RUNTIME_GATE_V1_20260824");
assert.equal(fixture.runtime.enable_environment_variable, "VOID_AL_BLOCK_COMMIT_RUNTIME_V1");
assert.equal(fixture.runtime.disabled_installs_no_prototype_patch, true);
assert.equal(fixture.runtime.normal_node_entrypoint_mounts_bootstrap, false);
assert.equal(fixture.activation.ready, false);
assert.equal(
  fixture.activation.hold,
  "HOLD_AL_BLOCK_COMMIT_DIRECT_CALLERS_NOT_MIGRATED",
);
assert.equal(
  fixture.activation.head_hold,
  "HOLD_AL_BLOCK_HEAD_CALLERS_NOT_MIGRATED",
);
assert.equal(fixture.activation.bootstrap_not_mounted, true);
assert.equal(fixture.activation.proposer_authority_required_before_activation, true);
assert.equal(fixture.activation.runtime_environment_change_authorized, false);
assert.equal(fixture.authority_boundary.chain2050_live_mutation, false);
assert.equal(fixture.authority_boundary.money_movement, false);

const bootstrapSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/security/void_alignment_layer_block_commit_runtime_bootstrap_v1.ts",
  ),
  "utf8",
);
assert.match(bootstrapSource, /VOID_AL_BLOCK_COMMIT_RUNTIME_BOOTSTRAP_V1/);
assert.match(bootstrapSource, /installVoidAlignmentLayerBlockCommitRuntimeFromEnvironmentV1\(\)/);
assert.match(bootstrapSource, /blockProposerAuthorityRequiredFromEnv\(process\.env\)/);
assert.match(bootstrapSource, /VOID_AL_BLOCK_COMMIT_PROPOSER_AUTHORITY_REQUIRED_V1/);

const precommitSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/chain/native_block_execution_precommit_integration_v1.ts",
  ),
  "utf8",
);
assert.equal(precommitSource.includes("process.env"), false);
assert.equal(
  precommitSource.includes("installVoidAlignmentLayerBlockCommitRuntimeFromEnvironmentV1"),
  false,
);
assert.match(precommitSource, /environment_read: false/);
assert.match(precommitSource, /preparation_only: true/);

const indexSource = fs.readFileSync(path.join(process.cwd(), "src/index.ts"), "utf8");
assert.equal(
  indexSource.includes("void_alignment_layer_block_commit_runtime_bootstrap_v1"),
  false,
  "normal node entrypoint must not silently mount the held AL bootstrap",
);
const historicalRawCommitMentions = indexSource.match(/saveBlockCommit/g)?.length ?? 0;
assert.ok(
  historicalRawCommitMentions > 0,
  "legacy-runtime activation HOLD remains until raw index callers are retired",
);
const legacyDirectHeadFileWrites =
  (indexSource.match(/head\.txt/g)?.length ?? 0) +
  (indexSource.match(/heads\.json/g)?.length ?? 0);
assert.ok(
  legacyDirectHeadFileWrites > 0,
  "legacy-runtime activation HOLD remains until direct head-file writers are retired",
);

const nodeCoreSource = fs.readFileSync(path.join(process.cwd(), "src/node_core.ts"), "utf8");
const historicalDirectHeadMentions = nodeCoreSource.match(/persistHeadAtomic/g)?.length ?? 0;
assert.ok(historicalDirectHeadMentions > 0);

const governanceDoc = fs.readFileSync(
  path.join(process.cwd(), "docs/governance/void-al-block-commit-runtime-gate-v1.md"),
  "utf8",
);
assert.match(governanceDoc, /HOLD_AL_BLOCK_COMMIT_DIRECT_CALLERS_NOT_MIGRATED/);
assert.match(governanceDoc, /HOLD_AL_BLOCK_HEAD_CALLERS_NOT_MIGRATED/);
assert.match(governanceDoc, /HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED/);
assert.match(governanceDoc, /VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1/);
assert.match(governanceDoc, /--import/);
assert.match(governanceDoc, /process[- ]memory/i);

const prevGate = process.env.VOID_AL_BLOCK_COMMIT_RUNTIME_V1;
const prevAuthorityRequired = process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
const prevLegacyAuthorityRequired = process.env.VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER;
const prevAuthoritySource = process.env.VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE;
const prevTrusted = process.env.VOID_BLOCK_TRUSTED_PROPOSERS;
const prevChain = process.env.VOID_CHAIN_ID;

try {
  process.env.VOID_AL_BLOCK_COMMIT_RUNTIME_V1 = "1";
  delete process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
  delete process.env.VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER;
  await assert.rejects(
    import("../src/security/void_alignment_layer_block_commit_runtime_bootstrap_v1.js"),
    /VOID_AL_BLOCK_COMMIT_PROPOSER_AUTHORITY_REQUIRED_V1/,
  );

  restoreEnv("VOID_AL_BLOCK_COMMIT_RUNTIME_V1", prevGate);
  restoreEnv("VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED", prevAuthorityRequired);
  restoreEnv("VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER", prevLegacyAuthorityRequired);

  const disabledProto = Object.create(SegStore.prototype as any);
  const originalDisabledSave = disabledProto.saveBlock;
  const disabled = installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
    prototype: disabledProto,
    enabled: false,
    env: { ...process.env, VOID_CHAIN_ID: "2050" },
  });
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.installed, false);
  assert.equal(disabledProto.saveBlock, originalDisabledSave);
  assert.equal(disabled.safe_mode, false);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-al-block-gate-"));
  const headBypassRoot = path.join(root, "head-bypass");
  const headRecoveryRoot = path.join(root, "head-recovery");
  const replayRoot = path.join(root, "replay");
  const canonicalRoot = path.join(root, "canonical");
  const rejectRoot = path.join(root, "reject");
  const quarantineRoot = path.join(root, "quarantine");
  const driftRoot = path.join(root, "drift");
  const mismatchRoot = path.join(root, "startup-mismatch");

  try {
    const signer = makeSigner();
    const headBypassStore = new SegStore(headBypassRoot, { sparseEvery: 1 });
    const headRecoveryStore = new SegStore(headRecoveryRoot, { sparseEvery: 1 });
    const replaySeed = new SegStore(replayRoot, { sparseEvery: 1 });
    const store = new SegStore(canonicalRoot, { sparseEvery: 1 });
    const rejectStore = new SegStore(rejectRoot, { sparseEvery: 1 });
    const quarantineStore = new SegStore(quarantineRoot, { sparseEvery: 1 });
    const driftStore = new SegStore(driftRoot, { sparseEvery: 1 });

    const replayGenesis = makeBlock({
      number: 0,
      parent: null,
      signer,
      note: "replay-genesis",
    });
    const replaySeg = (replaySeed as any).segName(0);
    (replaySeed as any).walAppendDurable(replaySeg, replayGenesis, "modern");
    assert.equal(replaySeed.loadHeadNumber(), -1);
    assert.equal(replaySeed.loadBlock(0), null);

    const recoveryGenesis = makeBlock({
      number: 0,
      parent: null,
      signer,
      note: "head-recovery-genesis",
    });
    (headRecoveryStore as any).saveBlockCommit(recoveryGenesis);
    assert.equal(headRecoveryStore.loadHeadNumber(), -1);
    assert.deepEqual(headRecoveryStore.loadBlock(0), recoveryGenesis);
    const recoveryBytesBefore = fs.statSync(segmentBin(headRecoveryRoot)).size;

    fs.mkdirSync(mismatchRoot, { recursive: true });
    fs.writeFileSync(
      path.join(mismatchRoot, "heads.json"),
      JSON.stringify({ head: 1, number: 1 }, null, 2),
    );
    fs.writeFileSync(path.join(mismatchRoot, "head.txt"), "0\n");

    process.env.VOID_AL_BLOCK_COMMIT_RUNTIME_V1 = "1";
    process.env.VOID_CHAIN_ID = "2050";
    process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = "1";
    process.env.VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE = "env";
    process.env.VOID_BLOCK_TRUSTED_PROPOSERS = signer.proposer;

    const headBypassProto = Object.create(SegStore.prototype as any);
    Object.setPrototypeOf(headBypassStore, headBypassProto);
    installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
      prototype: headBypassProto,
      enabled: true,
      env: process.env,
    });
    expectHeld(
      () => (headBypassStore as any).persistHeadAtomic(0),
      VOID_AL_BLOCK_HEAD_DIRECT_BYPASS_V1,
      "safe_mode",
    );
    assert.equal(headBypassStore.loadHeadNumber(), -1);
    assert.equal(
      getVoidAlignmentLayerBlockCommitRuntimeStatusV1(headBypassProto)
        .direct_head_bypass_total,
      1,
    );

    const recoveryProto = Object.create(SegStore.prototype as any);
    Object.setPrototypeOf(headRecoveryStore, recoveryProto);
    installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
      prototype: recoveryProto,
      enabled: true,
      env: process.env,
    });
    (headRecoveryStore as any).persistHeadAtomic(0);
    assert.equal(headRecoveryStore.loadHeadNumber(), 0);
    assert.deepEqual(headRecoveryStore.loadBlock(0), recoveryGenesis);
    assert.equal(fs.statSync(segmentBin(headRecoveryRoot)).size, recoveryBytesBefore);
    const recoveryStatus = getVoidAlignmentLayerBlockCommitRuntimeStatusV1(recoveryProto);
    assert.equal(recoveryStatus.safe_mode, false);
    assert.equal(recoveryStatus.direct_head_recovery_total, 1);
    assert.ok(recoveryStatus.pre_accept_total >= 1);
    assert.ok(recoveryStatus.post_apply_total >= 1);

    assert.throws(
      () => new SegStore(mismatchRoot, { sparseEvery: 1 }),
      new RegExp(VOID_AL_SEGSTORE_STARTUP_HEAD_RECONCILIATION_HOLD_V1),
    );

    const driftProto = Object.create(SegStore.prototype as any);
    Object.setPrototypeOf(driftStore, driftProto);
    installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
      prototype: driftProto,
      enabled: true,
      env: process.env,
    });
    const driftGenesis = makeBlock({
      number: 0,
      parent: null,
      signer,
      note: "policy-drift-genesis",
    });
    process.env.VOID_BLOCK_TRUSTED_PROPOSERS = "";
    expectHeld(
      () => driftStore.saveBlock(driftGenesis),
      "AL_REQUIRED_CHECK_FAILED",
      "safe_mode",
    );
    assert.equal(driftStore.loadHeadNumber(), -1);
    restoreEnv("VOID_BLOCK_TRUSTED_PROPOSERS", signer.proposer);

    const partialProto: any = {
      loadHeadNumber() { return -1; },
      loadBlock() { return null; },
      saveBlock(candidate: any) {
        this.fake_durable_candidate = candidate;
        throw new Error("simulated_after_durable_append_before_head");
      },
      saveAuthorizedLegacyCommitDirectV2fs() {
        throw new Error("unused_legacy");
      },
      saveBlockCommit() {},
      persistHeadAtomic() {},
      replayWalAllBestEffort() {},
    };
    const partialStore = Object.create(partialProto);
    installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
      prototype: partialProto,
      enabled: true,
      env: process.env,
    });
    const partialGenesis = makeBlock({
      number: 0,
      parent: null,
      signer,
      note: "partial-commit-exception",
    });
    expectHeld(
      () => partialStore.saveBlock(partialGenesis),
      VOID_AL_BLOCK_COMMIT_MUTATION_EXCEPTION_V1,
      "safe_mode",
    );
    assert.deepEqual(partialStore.fake_durable_candidate, partialGenesis);
    const partialStatus = getVoidAlignmentLayerBlockCommitRuntimeStatusV1(partialProto);
    assert.equal(partialStatus.safe_mode, true);
    assert.equal(partialStatus.mutation_exception_total, 1);

    const installed = installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
      prototype: SegStore.prototype as any,
      enabled: true,
      env: process.env,
    });
    assert.equal(installed.enabled, true);
    assert.equal(installed.installed, true);
    assert.equal(installed.safe_mode, false);
    assert.equal(installed.ordinary_authentication_changed, false);
    assert.equal(installed.sovereign_usb_access, false);
    assert.equal(installed.money_movement, false);

    const replayed = new SegStore(replayRoot, { sparseEvery: 1 });
    assert.equal(replayed.loadHeadNumber(), 0);
    assert.deepEqual(replayed.loadBlock(0), replayGenesis);

    const genesis = makeBlock({
      number: 0,
      parent: null,
      signer,
      note: "canonical-genesis",
    });
    store.saveBlock(genesis);
    assert.equal(store.loadHeadNumber(), 0);
    assert.deepEqual(store.loadBlock(0), genesis);

    const block1 = makeBlock({
      number: 1,
      parent: genesis,
      signer,
      note: "canonical-one",
    });
    store.saveBlock(block1);
    assert.equal(store.loadHeadNumber(), 1);
    assert.deepEqual(store.loadBlock(1), block1);
    store.saveBlock(block1);
    assert.equal(store.loadHeadNumber(), 1);

    const unauthorizedSigner = makeSigner();
    const unauthorizedBlock = makeBlock({
      number: 0,
      parent: null,
      signer: unauthorizedSigner,
      note: "unauthorized-proposer",
    });
    expectHeld(
      () => rejectStore.saveBlock(unauthorizedBlock),
      "AL_REQUIRED_CHECK_FAILED",
      "reject",
    );
    assert.equal(rejectStore.loadHeadNumber(), -1);
    assert.equal(rejectStore.loadBlock(0), null);

    const badSigner = makeSigner();
    const badBlock = makeBlock({
      number: 0,
      parent: null,
      signer: badSigner,
      note: "bad-signature",
    });
    badBlock.sig = "00".repeat(64);
    expectHeld(
      () => quarantineStore.saveBlock(badBlock),
      "AL_REQUIRED_CHECK_FAILED",
      "quarantine",
    );
    assert.equal(quarantineStore.loadHeadNumber(), -1);
    assert.equal(quarantineStore.loadBlock(0), null);

    const beforeBypassStatus = getVoidAlignmentLayerBlockCommitRuntimeStatusV1();
    assert.equal(beforeBypassStatus.safe_mode, false);
    assert.ok(beforeBypassStatus.pre_accept_total >= 6);
    assert.ok(beforeBypassStatus.post_apply_total >= 4);
    assert.ok(beforeBypassStatus.rejected_total >= 1);
    assert.equal(beforeBypassStatus.quarantined_total, 1);

    const block2 = makeBlock({
      number: 2,
      parent: block1,
      signer,
      note: "direct-bypass-attempt",
    });
    expectHeld(
      () => (store as any).saveBlockCommit(block2),
      VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1,
      "safe_mode",
    );
    assert.equal(store.loadHeadNumber(), 1);
    assert.equal(store.loadBlock(2), null);

    const afterBypassStatus = getVoidAlignmentLayerBlockCommitRuntimeStatusV1();
    assert.equal(afterBypassStatus.safe_mode, true);
    assert.equal(afterBypassStatus.safe_mode_reason, VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1);
    assert.equal(afterBypassStatus.direct_bypass_total, 1);
    assert.ok(afterBypassStatus.safe_mode_total >= 1);

    expectHeld(
      () => store.saveBlock(block2),
      "VOID_AL_BLOCK_COMMIT_SAFE_MODE_V1",
      "safe_mode",
    );
    assert.equal(store.loadHeadNumber(), 1);
    assert.equal(store.loadBlock(2), null);

    console.log(MARKER);
    console.log("normal_entrypoint_bootstrap_mounted=false");
    console.log("bootstrap_requires_proposer_authority=true");
    console.log("proposer_authority_policy_latched=true");
    console.log("policy_drift_safe_mode=true");
    console.log("canonical_mutation_exception_safe_mode=true");
    console.log("disabled_default_no_patch=true");
    console.log("canonical_modern_pre_and_post_al=true");
    console.log("wal_replay_al_lease=true");
    console.log("exact_physical_block_head_recovery_no_duplicate_append=true");
    console.log("direct_head_missing_block_safe_mode=true");
    console.log("startup_head_reconciliation_hold_under_al=true");
    console.log("unauthorized_self_signed_proposer_rejected=true");
    console.log("bad_signature_quarantine_before_write=true");
    console.log("direct_raw_commit_bypass_safe_mode=true");
    console.log("safe_mode_sticky_no_auto_resume=true");
    console.log(`historical_raw_commit_mentions=${historicalRawCommitMentions}`);
    console.log(`legacy_direct_head_file_mentions=${legacyDirectHeadFileWrites}`);
    console.log(`historical_node_core_direct_head_mentions=${historicalDirectHeadMentions}`);
    console.log(`pre_accept_total=${afterBypassStatus.pre_accept_total}`);
    console.log(`post_apply_total=${afterBypassStatus.post_apply_total}`);
    console.log("activation_ready=false");
    console.log("activation_hold=HOLD_AL_LEGACY_INDEX_RUNTIME_NOT_RETIRED");
    console.log("bootstrap_hold=HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED");
    console.log("durable_safe_mode_hold=HOLD_AL_DURABLE_SAFE_MODE_STATE_REQUIRED");
    console.log("live_activation_performed=false");
    console.log("chain2050_mutation_performed=false");
    console.log("sovereign_usb_access=false");
    console.log("money_movement=false");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
} finally {
  restoreEnv("VOID_AL_BLOCK_COMMIT_RUNTIME_V1", prevGate);
  restoreEnv("VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED", prevAuthorityRequired);
  restoreEnv("VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER", prevLegacyAuthorityRequired);
  restoreEnv("VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE", prevAuthoritySource);
  restoreEnv("VOID_BLOCK_TRUSTED_PROPOSERS", prevTrusted);
  restoreEnv("VOID_CHAIN_ID", prevChain);
}
