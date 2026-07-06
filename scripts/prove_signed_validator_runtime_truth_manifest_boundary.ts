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
    marker: "VOID_SIGNED_VALIDATOR_RUNTIME_TRUTH_FIXTURE_V1",
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

function signedRuntimeTruthEnv(file: string, signerPubkeyFile: string | undefined, extra: Record<string, string | undefined> = {}) {
  return {
    VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED: "1",
    VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE: "signed_runtime_truth",
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE: file,
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE: signerPubkeyFile,
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY: undefined,
    VOID_BLOCK_PROPOSER_EPOCH: "0",
    VOID_BLOCK_PROPOSER_SLOT: undefined,
    VOID_BLOCK_TRUSTED_PROPOSERS: undefined,
    ...extra,
  };
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-signed-runtime-truth-accepted-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signTruth(baseTruth(proposer.nodeId), signer));
    const signerFile = writePubkey(tmp, signer);

    withEnv(signedRuntimeTruthEnv(truthFile, signerFile), () => {
      node.store.saveBlock(block as any);
      assert(!!node.store.loadBlock(0), "signed runtime-truth scheduled proposer block should persist");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-signed-runtime-truth-unsigned-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const truthFile = writeJson(tmp, "unsigned-runtime-truth.json", baseTruth(proposer.nodeId));
    const signerFile = writePubkey(tmp, signer);

    withEnv(signedRuntimeTruthEnv(truthFile, signerFile), () => {
      expectReject(node, block, "validator_runtime_truth_signature_missing");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-signed-runtime-truth-tamper-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signed = signTruth(baseTruth(proposer.nodeId), signer);
    signed.schedule[0].proposer = proposer.nodeId.slice(0, -1) + (proposer.nodeId.endsWith("0") ? "1" : "0");
    const truthFile = writeJson(tmp, "tampered-runtime-truth.json", signed);
    const signerFile = writePubkey(tmp, signer);

    withEnv(signedRuntimeTruthEnv(truthFile, signerFile), () => {
      expectReject(node, block, "validator_runtime_truth_signature_invalid");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-signed-runtime-truth-wrong-signer-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const trusted = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const truthFile = writeJson(tmp, "wrong-signer-runtime-truth.json", signTruth(baseTruth(proposer.nodeId), signer));
    const trustedFile = writePubkey(tmp, trusted);

    withEnv(signedRuntimeTruthEnv(truthFile, trustedFile), () => {
      expectReject(node, block, "validator_runtime_truth_signer_mismatch");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-signed-runtime-truth-missing-trusted-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signTruth(baseTruth(proposer.nodeId), signer));

    withEnv(signedRuntimeTruthEnv(truthFile, undefined), () => {
      expectReject(node, block, "missing_validator_runtime_truth_trusted_signer");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-signed-runtime-truth-inline-trusted-accepted-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signTruth(baseTruth(proposer.nodeId), signer));

    withEnv(signedRuntimeTruthEnv(truthFile, undefined, {
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY: signer.pubPEM,
    }), () => {
      node.store.saveBlock(block as any);
      assert(!!node.store.loadBlock(0), "inline trusted signer should validate signed runtime truth");
    });
  }

  console.log("VOID_SIGNED_VALIDATOR_RUNTIME_TRUTH_MANIFEST_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
