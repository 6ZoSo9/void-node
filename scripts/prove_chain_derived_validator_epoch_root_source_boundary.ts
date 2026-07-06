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
    marker: "VOID_CHAIN_DERIVED_VALIDATOR_EPOCH_ROOT_SOURCE_FIXTURE_V1",
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

function commitment(root: string, extra: Record<string, any> = {}) {
  return {
    marker: "VOID_VALIDATOR_EPOCH_ROOT_COMMITMENT_FIXTURE_V1",
    chain_id: "void-local-dev",
    commitments: [
      { epoch: "0", root }
    ],
    ...extra,
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

function flipHex64(h: string): string {
  assert(/^[0-9a-f]{64}$/.test(h), "test root must be lowercase 64 hex");
  const last = h[h.length - 1];
  return h.slice(0, -1) + (last === "0" ? "1" : "0");
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

function chainRootEnv(
  truthFile: string,
  signerPubkeyFile: string,
  commitmentFile: string | undefined,
  extra: Record<string, string | undefined> = {}
) {
  return {
    VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED: "1",
    VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE: "signed_runtime_truth_chain_epoch_root",
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE: truthFile,
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE: signerPubkeyFile,
    VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE: commitmentFile,
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: undefined,
    VOID_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: undefined,
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_BODY_HASH: undefined,
    VOID_VALIDATOR_RUNTIME_TRUTH_BODY_HASH: undefined,
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain-root-accepted-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const commitmentFile = writeJson(tmp, "chain-epoch-root-commitment.json", commitment(root));

    withEnv(chainRootEnv(truthFile, signerFile, commitmentFile), () => {
      node.store.saveBlock(block as any);
      assert(!!node.store.loadBlock(0), "chain-derived epoch-root commitment should accept matching signed runtime truth");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain-root-missing-env-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);

    withEnv(chainRootEnv(truthFile, signerFile, undefined), () => {
      expectReject(node, block, "missing_validator_epoch_root_commitment_file");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain-root-missing-file-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const missingCommitmentFile = path.join(tmp, "missing-chain-commitment.json");

    withEnv(chainRootEnv(truthFile, signerFile, missingCommitmentFile, {
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: root,
    }), () => {
      expectReject(node, block, "validator_epoch_root_commitment_file_missing");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain-root-malformed-file-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const commitmentFile = path.join(tmp, "bad-chain-commitment.json");
    fs.writeFileSync(commitmentFile, "{ not-json");

    withEnv(chainRootEnv(truthFile, signerFile, commitmentFile), () => {
      expectReject(node, block, "invalid_validator_epoch_root_commitment_file");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain-root-malformed-root-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const commitmentFile = writeJson(tmp, "chain-epoch-root-commitment.json", commitment("not-a-root"));

    withEnv(chainRootEnv(truthFile, signerFile, commitmentFile), () => {
      expectReject(node, block, "invalid_validator_epoch_root_commitment");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain-root-wrong-root-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const commitmentFile = writeJson(tmp, "chain-epoch-root-commitment.json", commitment(flipHex64(root)));

    withEnv(chainRootEnv(truthFile, signerFile, commitmentFile), () => {
      expectReject(node, block, "validator_runtime_truth_chain_epoch_root_mismatch");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain-root-env-not-substitute-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const commitmentFile = writeJson(tmp, "chain-epoch-root-commitment.json", commitment(flipHex64(root)));

    withEnv(chainRootEnv(truthFile, signerFile, commitmentFile, {
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: root,
    }), () => {
      expectReject(node, block, "validator_runtime_truth_chain_epoch_root_mismatch");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain-root-body-changed-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);

    const signedTruthA = signTruth(baseTruth(proposer.nodeId, { manifest_version: "A" }), signer);
    const rootA = validatorRuntimeTruthManifestBodyHash(signedTruthA);

    const signedTruthB = signTruth(baseTruth(proposer.nodeId, { manifest_version: "B" }), signer);
    const truthFile = writeJson(tmp, "signed-runtime-truth-b.json", signedTruthB);
    const signerFile = writePubkey(tmp, signer);
    const commitmentFile = writeJson(tmp, "chain-epoch-root-commitment.json", commitment(rootA));

    withEnv(chainRootEnv(truthFile, signerFile, commitmentFile), () => {
      expectReject(node, block, "validator_runtime_truth_chain_epoch_root_mismatch");
    });
  }

  console.log("VOID_CHAIN_DERIVED_VALIDATOR_EPOCH_ROOT_SOURCE_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
