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
import { SegStore } from "../src/chain/seg_store.js";
import {
  VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1,
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

const indexSource = fs.readFileSync(
  path.join(process.cwd(), "src/index.ts"),
  "utf8",
);
assert.equal(
  indexSource.includes("void_alignment_layer_block_commit_runtime_bootstrap_v1"),
  false,
  "normal node entrypoint must not silently mount the held AL bootstrap",
);
const historicalRawCommitMentions =
  indexSource.match(/saveBlockCommit/g)?.length ?? 0;
assert.ok(
  historicalRawCommitMentions > 0,
  "activation HOLD must not disappear until direct caller inventory is explicitly migrated",
);

const governanceDoc = fs.readFileSync(
  path.join(
    process.cwd(),
    "docs/governance/void-al-block-commit-runtime-gate-v1.md",
  ),
  "utf8",
);
assert.match(governanceDoc, /HOLD_AL_BLOCK_COMMIT_DIRECT_CALLERS_NOT_MIGRATED/);
assert.match(governanceDoc, /HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED/);
assert.match(governanceDoc, /VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1/);
assert.match(governanceDoc, /--import/);
assert.match(governanceDoc, /process memory/i);

const prevGate = process.env.VOID_AL_BLOCK_COMMIT_RUNTIME_V1;
const prevAuthorityRequired = process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
const prevAuthoritySource = process.env.VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE;
const prevTrusted = process.env.VOID_BLOCK_TRUSTED_PROPOSERS;
const prevChain = process.env.VOID_CHAIN_ID;

try {
  // The explicit future bootstrap must reject AL=1 while proposer authority is
  // still in its backward-compatible default-off mode. Import failure happens
  // before the installer is allowed to patch SegStore.prototype.
  process.env.VOID_AL_BLOCK_COMMIT_RUNTIME_V1 = "1";
  delete process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
  delete process.env.VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER;
  await assert.rejects(
    import("../src/security/void_alignment_layer_block_commit_runtime_bootstrap_v1.js"),
    /VOID_AL_BLOCK_COMMIT_PROPOSER_AUTHORITY_REQUIRED_V1/,
  );

  restoreEnv("VOID_AL_BLOCK_COMMIT_RUNTIME_V1", prevGate);
  restoreEnv("VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED", prevAuthorityRequired);

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
  const replayRoot = path.join(root, "replay");
  const canonicalRoot = path.join(root, "canonical");
  const rejectRoot = path.join(root, "reject");
  const quarantineRoot = path.join(root, "quarantine");

  try {
    const signer = makeSigner();
    const replayGenesis = makeBlock({
      number: 0,
      parent: null,
      signer,
      note: "replay-genesis",
    });

    // Produce one durable WAL intent before the prototype is guarded. The head and
    // segment stay untouched, so constructing the next SegStore exercises the
    // real constructor replay path under the installed AL replay lease.
    const replaySeed = new SegStore(replayRoot, { sparseEvery: 1 });
    const replaySeg = (replaySeed as any).segName(0);
    (replaySeed as any).walAppendDurable(replaySeg, replayGenesis, "modern");
    assert.equal(replaySeed.loadHeadNumber(), -1);
    assert.equal(replaySeed.loadBlock(0), null);

    // AL-enabled block persistence is tested only with the repository's existing
    // proposer-authority policy explicitly required. The block validator reads
    // this runtime policy from process.env, matching production semantics.
    process.env.VOID_CHAIN_ID = "2050";
    process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = "1";
    process.env.VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE = "env";
    process.env.VOID_BLOCK_TRUSTED_PROPOSERS = signer.proposer;

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

    const store = new SegStore(canonicalRoot, { sparseEvery: 1 });
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

    // Exact idempotent replay through the canonical public method remains allowed.
    store.saveBlock(block1);
    assert.equal(store.loadHeadNumber(), 1);

    // A validly self-signed but unauthorized proposer fails the current runtime
    // authority policy and is rejected before persistence.
    const unauthorizedSigner = makeSigner();
    const unauthorizedBlock = makeBlock({
      number: 0,
      parent: null,
      signer: unauthorizedSigner,
      note: "unauthorized-proposer",
    });
    const rejectStore = new SegStore(rejectRoot, { sparseEvery: 1 });
    expectHeld(
      () => rejectStore.saveBlock(unauthorizedBlock),
      "AL_REQUIRED_CHECK_FAILED",
      "reject",
    );
    assert.equal(rejectStore.loadHeadNumber(), -1);
    assert.equal(rejectStore.loadBlock(0), null);

    // A wrong-signed actor trips actor-security quarantine before persistence.
    const badSigner = makeSigner();
    const badBlock = makeBlock({
      number: 0,
      parent: null,
      signer: badSigner,
      note: "bad-signature",
    });
    badBlock.sig = "00".repeat(64);
    const quarantineStore = new SegStore(quarantineRoot, { sparseEvery: 1 });
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

    // The historical raw commit primitive is still reachable in generated JS.
    // When AL is enabled it is a tripwire, not an alternate authority path.
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
    assert.equal(
      afterBypassStatus.safe_mode_reason,
      VOID_AL_BLOCK_COMMIT_DIRECT_BYPASS_V1,
    );
    assert.equal(afterBypassStatus.direct_bypass_total, 1);
    assert.ok(afterBypassStatus.safe_mode_total >= 1);

    // Safe mode is sticky for this process/prototype; it never auto-resumes.
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
    console.log("disabled_default_no_patch=true");
    console.log("canonical_modern_pre_and_post_al=true");
    console.log("wal_replay_al_lease=true");
    console.log("unauthorized_self_signed_proposer_rejected=true");
    console.log("bad_signature_quarantine_before_write=true");
    console.log("direct_raw_commit_bypass_safe_mode=true");
    console.log("safe_mode_sticky_no_auto_resume=true");
    console.log(`historical_raw_commit_mentions=${historicalRawCommitMentions}`);
    console.log(`pre_accept_total=${afterBypassStatus.pre_accept_total}`);
    console.log(`post_apply_total=${afterBypassStatus.post_apply_total}`);
    console.log("activation_ready=false");
    console.log("activation_hold=HOLD_AL_BLOCK_COMMIT_DIRECT_CALLERS_NOT_MIGRATED");
    console.log("bootstrap_hold=HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED");
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
  restoreEnv("VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE", prevAuthoritySource);
  restoreEnv("VOID_BLOCK_TRUSTED_PROPOSERS", prevTrusted);
  restoreEnv("VOID_CHAIN_ID", prevChain);
}
