// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";

import { Node } from "../src/node_core.js";
import {
  blockHeaderBytes,
  computeRoots,
  nodeIdFromPubPEM,
  validatorRuntimeTruthManifestBodyHash,
  validatorRuntimeTruthSigningBody,
  ZERO_HASH_64,
} from "../src/chain/block.js";

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

function makeKp() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = nodeIdFromPubPEM(pubPEM);
  return { privateKey, publicKey, pubPEM, nodeId };
}

function signBytes(priv: crypto.KeyObject, bytes: Uint8Array): string {
  return crypto.sign(null, Buffer.from(bytes), priv).toString("hex");
}

function signedBlock(kp = makeKp(), overrides: Record<string, any> = {}) {
  const roots = computeRoots([], []);
  const draft: any = {
    number: 0,
    parentHash: ZERO_HASH_64,
    timestamp: Date.now(),
    txRoot: roots.txRoot,
    blobRoot: roots.blobRoot,
    txs: [],
    blobs: [],
    proposer: kp.nodeId,
    proposerPubkey: kp.pubPEM,
    sig: "",
    ...overrides,
  };
  draft.sig = signBytes(kp.privateKey, blockHeaderBytes(draft));
  return { kp, block: draft };
}

function baseTruth(proposer: string, extra: Record<string, any> = {}) {
  return {
    marker: "VOID_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT_BINDING_FIXTURE_V1",
    epoch: "0",
    schedule: [
      { epoch: "0", slot: 0, proposer }
    ],
    ...extra,
  };
}

function signTruth(truth: any, signer: ReturnType<typeof makeKp>) {
  const sig = signBytes(signer.privateKey, validatorRuntimeTruthSigningBody(truth));
  return {
    ...truth,
    signature: {
      alg: "ed25519",
      key_id: signer.nodeId,
      signer_pubkey: signer.pubPEM,
      sig,
    },
  };
}

function writeJson(tmp: string, name: string, obj: any) {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  return file;
}

function writePubkey(tmp: string, signer: ReturnType<typeof makeKp>) {
  const file = path.join(tmp, "trusted-runtime-truth-signer.pem");
  fs.writeFileSync(file, signer.pubPEM);
  return file;
}

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function strictEpochRootEnv(
  file: string,
  signerPubkeyFile: string,
  epochRoot: string | undefined,
  extra: Record<string, string | undefined> = {}
) {
  return {
    VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED: "1",
    VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE: "signed_runtime_truth_epoch_root",
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE: file,
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE: signerPubkeyFile,
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: epochRoot,
    VOID_BLOCK_PROPOSER_EPOCH: "0",
    VOID_BLOCK_PROPOSER_SLOT: undefined,
    VOID_BLOCK_TRUSTED_PROPOSERS: undefined,
    ...extra,
  };
}

function flipHex64(h: string): string {
  assert(/^[0-9a-f]{64}$/.test(h), "test root must be lowercase 64 hex");
  const last = h[h.length - 1];
  return h.slice(0, -1) + (last === "0" ? "1" : "0");
}

function expectReject(node: Node, block: any, expected: string) {
  let threw = false;
  let message = "";
  try {
    node.store.saveBlock(block);
  } catch (e: any) {
    threw = true;
    message = String(e?.message || e);
  }
  assert(threw, `expected block to be rejected with ${expected}`);
  assert(message.includes(expected), `expected ${expected}, got: ${message}`);
  assert(!node.store.loadBlock(Number(block?.number ?? 0)), "rejected block must not persist");
}

async function main() {
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch-root-accepted-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);

    withEnv(strictEpochRootEnv(truthFile, signerFile, root), () => {
      node.store.saveBlock(block as any);
      assert(!!node.store.loadBlock(0), "signed runtime truth matching expected epoch root should persist");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch-root-missing-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);

    withEnv(strictEpochRootEnv(truthFile, signerFile, undefined), () => {
      expectReject(node, block, "missing_validator_runtime_truth_epoch_root");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch-root-malformed-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);

    withEnv(strictEpochRootEnv(truthFile, signerFile, "not-a-root"), () => {
      expectReject(node, block, "invalid_validator_runtime_truth_epoch_root");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch-root-wrong-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);

    withEnv(strictEpochRootEnv(truthFile, signerFile, flipHex64(root)), () => {
      expectReject(node, block, "validator_runtime_truth_epoch_root_mismatch");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch-root-signed-but-other-body-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);

    const signedTruthA = signTruth(baseTruth(proposer.nodeId, { manifest_version: "A" }), signer);
    const expectedRoot = validatorRuntimeTruthManifestBodyHash(signedTruthA);

    const signedTruthB = signTruth(baseTruth(proposer.nodeId, { manifest_version: "B" }), signer);
    const truthFile = writeJson(tmp, "signed-runtime-truth-b.json", signedTruthB);
    const signerFile = writePubkey(tmp, signer);

    withEnv(strictEpochRootEnv(truthFile, signerFile, expectedRoot), () => {
      expectReject(node, block, "validator_runtime_truth_epoch_root_mismatch");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch-root-proposer-mismatch-still-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const scheduled = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(scheduled.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);

    withEnv(strictEpochRootEnv(truthFile, signerFile, root), () => {
      expectReject(node, block, "runtime_truth_proposer_mismatch");
    });
  }

  console.log("VOID_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT_BINDING_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
