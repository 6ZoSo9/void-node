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
    marker: "VOID_CANONICAL_CHAIN_EPOCH_ROOT_COMMITMENT_SOURCE_FIXTURE_V1",
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

function canonicalState(root: string, extraEntry: Record<string, any> = {}, extraRoot: Record<string, any> = {}) {
  return {
    marker: "VOID_CANONICAL_CHAIN_VALIDATOR_EPOCH_ROOT_STATE_FIXTURE_V1",
    chain_id: "void-local-dev",
    finalized: true,
    head: {
      number: 0,
      hash: "0".repeat(64),
      finalized: true,
    },
    validator_epoch_root_commitments: [
      {
        epoch: "0",
        root,
        finalized: true,
        block_number: 0,
        block_hash: "0".repeat(64),
        ...extraEntry,
      },
    ],
    ...extraRoot,
  };
}

function localCommitment(root: string) {
  return {
    marker: "VOID_VALIDATOR_EPOCH_ROOT_COMMITMENT_FIXTURE_V1",
    chain_id: "void-local-dev",
    commitments: [
      { epoch: "0", root }
    ],
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

function canonicalChainEnv(
  truthFile: string,
  signerPubkeyFile: string,
  canonicalStateFile: string | undefined,
  extra: Record<string, string | undefined> = {}
) {
  return {
    VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED: "1",
    VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE: "signed_runtime_truth_canonical_chain_epoch_root",
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE: truthFile,
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE: signerPubkeyFile,
    VOID_BLOCK_VALIDATOR_CANONICAL_CHAIN_STATE_FILE: canonicalStateFile,
    VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE: undefined,
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-canonical-root-accepted-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const stateFile = writeJson(tmp, "canonical-chain-state.json", canonicalState(root));

    withEnv(canonicalChainEnv(truthFile, signerFile, stateFile), () => {
      node.store.saveBlock(block as any);
      assert(!!node.store.loadBlock(0), "canonical chain epoch-root state should accept matching signed runtime truth");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-canonical-root-local-substitute-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const localFile = writeJson(tmp, "local-commitment.json", localCommitment(root));

    withEnv(canonicalChainEnv(truthFile, signerFile, undefined, {
      VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE: localFile,
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: root,
    }), () => {
      expectReject(node, block, "missing_validator_canonical_chain_state_file");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-canonical-root-missing-file-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const missingStateFile = path.join(tmp, "missing-canonical-chain-state.json");

    withEnv(canonicalChainEnv(truthFile, signerFile, missingStateFile), () => {
      expectReject(node, block, "validator_canonical_chain_state_file_missing");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-canonical-root-bad-json-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const stateFile = path.join(tmp, "bad-canonical-chain-state.json");
    fs.writeFileSync(stateFile, "{ not-json");

    withEnv(canonicalChainEnv(truthFile, signerFile, stateFile), () => {
      expectReject(node, block, "invalid_validator_canonical_chain_state_file");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-canonical-root-missing-commitment-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const stateFile = writeJson(tmp, "canonical-chain-state.json", {
      marker: "VOID_CANONICAL_CHAIN_VALIDATOR_EPOCH_ROOT_STATE_FIXTURE_V1",
      finalized: true,
      validator_epoch_root_commitments: [
        { epoch: "1", root, finalized: true },
      ],
    });

    withEnv(canonicalChainEnv(truthFile, signerFile, stateFile), () => {
      expectReject(node, block, "validator_canonical_chain_epoch_root_missing");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-canonical-root-malformed-root-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const stateFile = writeJson(tmp, "canonical-chain-state.json", canonicalState("not-a-root"));

    withEnv(canonicalChainEnv(truthFile, signerFile, stateFile), () => {
      expectReject(node, block, "invalid_validator_canonical_chain_epoch_root");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-canonical-root-unfinalized-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const stateFile = writeJson(tmp, "canonical-chain-state.json", canonicalState(root, { finalized: false }, { finalized: false }));

    withEnv(canonicalChainEnv(truthFile, signerFile, stateFile), () => {
      expectReject(node, block, "validator_canonical_chain_epoch_root_not_finalized");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-canonical-root-wrong-root-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(tmp, "signed-runtime-truth.json", signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const stateFile = writeJson(tmp, "canonical-chain-state.json", canonicalState(flipHex64(root)));

    withEnv(canonicalChainEnv(truthFile, signerFile, stateFile, {
      VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE: writeJson(tmp, "local-good-commitment.json", localCommitment(root)),
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: root,
    }), () => {
      expectReject(node, block, "validator_runtime_truth_canonical_chain_epoch_root_mismatch");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-canonical-root-body-changed-reject-"));
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
    const stateFile = writeJson(tmp, "canonical-chain-state.json", canonicalState(rootA));

    withEnv(canonicalChainEnv(truthFile, signerFile, stateFile), () => {
      expectReject(node, block, "validator_runtime_truth_canonical_chain_epoch_root_mismatch");
    });
  }

  console.log("VOID_CANONICAL_CHAIN_EPOCH_ROOT_COMMITMENT_SOURCE_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
