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
    marker: "VOID_LIVE_CANONICAL_CHAIN_STATE_EPOCH_ROOT_SOURCE_FIXTURE_V1",
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

function liveState(root: string, extraEntry: Record<string, any> = {}, extraRoot: Record<string, any> = {}) {
  return {
    marker: "VOID_LIVE_CANONICAL_CHAIN_STATE_EPOCH_ROOT_SOURCE_FIXTURE_V1",
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

function writeJson(file: string, obj: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
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

function liveChainEnv(
  truthFile: string,
  signerPubkeyFile: string,
  liveDir: string | undefined,
  extra: Record<string, string | undefined> = {}
) {
  return {
    VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED: "1",
    VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE: "signed_runtime_truth_live_chain_epoch_root",
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE: truthFile,
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE: signerPubkeyFile,
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_DIR: liveDir,
    VOID_BLOCK_VALIDATOR_CANONICAL_CHAIN_STATE_FILE: undefined,
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-live-root-accepted-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    writeJson(path.join(tmp, "validator-epoch-root-commitments.json"), liveState(root));

    withEnv(liveChainEnv(truthFile, signerFile, tmp), () => {
      node.store.saveBlock(block as any);
      assert(!!node.store.loadBlock(0), "live chain-state epoch-root should accept matching signed runtime truth");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-live-root-data-dir-fallback-accepted-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    writeJson(path.join(tmp, "chain", "validator-epoch-root-commitments.json"), liveState(root));

    withEnv(liveChainEnv(truthFile, signerFile, undefined), () => {
      node.store.saveBlock(block as any);
      assert(!!node.store.loadBlock(0), "DATA_DIR fallback live chain-state should accept matching signed runtime truth");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-live-root-fixture-substitute-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const canonicalFixture = writeJson(path.join(tmp, "fixtures", "canonical-chain-state.json"), liveState(root));
    const localCommitmentFile = writeJson(path.join(tmp, "fixtures", "local-commitment.json"), localCommitment(root));

    withEnv(liveChainEnv(truthFile, signerFile, undefined, {
      DATA_DIR: undefined,
      VOID_BLOCK_VALIDATOR_CANONICAL_CHAIN_STATE_FILE: canonicalFixture,
      VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE: localCommitmentFile,
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: root,
    }), () => {
      expectReject(node, block, "missing_live_validator_chain_state_dir");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-live-root-missing-file-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const localCommitmentFile = writeJson(path.join(tmp, "fixtures", "local-commitment.json"), localCommitment(root));

    withEnv(liveChainEnv(truthFile, signerFile, tmp, {
      VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE: localCommitmentFile,
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: root,
    }), () => {
      expectReject(node, block, "live_validator_chain_state_file_missing");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-live-root-bad-json-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    fs.writeFileSync(path.join(tmp, "validator-epoch-root-commitments.json"), "{ not-json");

    withEnv(liveChainEnv(truthFile, signerFile, tmp), () => {
      expectReject(node, block, "invalid_live_validator_chain_state_file");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-live-root-missing-commitment-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    writeJson(path.join(tmp, "validator-epoch-root-commitments.json"), {
      marker: "VOID_LIVE_CANONICAL_CHAIN_STATE_EPOCH_ROOT_SOURCE_FIXTURE_V1",
      finalized: true,
      validator_epoch_root_commitments: [
        { epoch: "1", root, finalized: true },
      ],
    });

    withEnv(liveChainEnv(truthFile, signerFile, tmp), () => {
      expectReject(node, block, "live_validator_chain_epoch_root_missing");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-live-root-malformed-root-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    writeJson(path.join(tmp, "validator-epoch-root-commitments.json"), liveState("not-a-root"));

    withEnv(liveChainEnv(truthFile, signerFile, tmp), () => {
      expectReject(node, block, "invalid_live_validator_chain_epoch_root");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-live-root-unfinalized-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    writeJson(path.join(tmp, "validator-epoch-root-commitments.json"), liveState(root, { finalized: false }, { finalized: false }));

    withEnv(liveChainEnv(truthFile, signerFile, tmp), () => {
      expectReject(node, block, "live_validator_chain_epoch_root_not_finalized");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-live-root-wrong-root-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    writeJson(path.join(tmp, "validator-epoch-root-commitments.json"), liveState(flipHex64(root)));

    withEnv(liveChainEnv(truthFile, signerFile, tmp, {
      VOID_BLOCK_VALIDATOR_CANONICAL_CHAIN_STATE_FILE: writeJson(path.join(tmp, "fixtures", "canonical-good.json"), liveState(root)),
      VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE: writeJson(path.join(tmp, "fixtures", "local-good.json"), localCommitment(root)),
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: root,
    }), () => {
      expectReject(node, block, "validator_runtime_truth_live_chain_epoch_root_mismatch");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-live-root-body-changed-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);

    const signedTruthA = signTruth(baseTruth(proposer.nodeId, { manifest_version: "A" }), signer);
    const rootA = validatorRuntimeTruthManifestBodyHash(signedTruthA);

    const signedTruthB = signTruth(baseTruth(proposer.nodeId, { manifest_version: "B" }), signer);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth-b.json"), signedTruthB);
    const signerFile = writePubkey(tmp, signer);
    writeJson(path.join(tmp, "validator-epoch-root-commitments.json"), liveState(rootA));

    withEnv(liveChainEnv(truthFile, signerFile, tmp), () => {
      expectReject(node, block, "validator_runtime_truth_live_chain_epoch_root_mismatch");
    });
  }

  console.log("VOID_LIVE_CANONICAL_CHAIN_STATE_EPOCH_ROOT_SOURCE_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
