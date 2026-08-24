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
  // segment stay untouched, so constructing the next SegStore must exercise the
  // real constructor replay path under the installed AL replay lease.
  const replaySeed = new SegStore(replayRoot, { sparseEvery: 1 });
  const replaySeg = (replaySeed as any).segName(0);
  (replaySeed as any).walAppendDurable(replaySeg, replayGenesis, "modern");
  assert.equal(replaySeed.loadHeadNumber(), -1);
  assert.equal(replaySeed.loadBlock(0), null);

  const installed = installVoidAlignmentLayerBlockCommitRuntimeOnPrototypeV1({
    prototype: SegStore.prototype as any,
    enabled: true,
    env: { ...process.env, VOID_CHAIN_ID: "2050" },
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

  // A wrong-signed actor is quarantined before persistence and does not advance
  // any store. Use a distinct signer so the canonical signer remains usable.
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
  assert.ok(beforeBypassStatus.pre_accept_total >= 5);
  assert.ok(beforeBypassStatus.post_apply_total >= 4);
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
  console.log("disabled_default_no_patch=true");
  console.log("canonical_modern_pre_and_post_al=true");
  console.log("wal_replay_al_lease=true");
  console.log("bad_signature_quarantine_before_write=true");
  console.log("direct_raw_commit_bypass_safe_mode=true");
  console.log("safe_mode_sticky_no_auto_resume=true");
  console.log(`pre_accept_total=${afterBypassStatus.pre_accept_total}`);
  console.log(`post_apply_total=${afterBypassStatus.post_apply_total}`);
  console.log("live_activation_performed=false");
  console.log("chain2050_mutation_performed=false");
  console.log("sovereign_usb_access=false");
  console.log("money_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
