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
    marker: "VOID_LIVE_CANONICAL_CHAIN_STATE_FINALITY_API_RUNTIME_TRUTH_FIXTURE_V1",
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

function apiResponse(root: string, extraEntry: Record<string, any> = {}, extraRoot: Record<string, any> = {}) {
  return {
    ok: true,
    marker: "VOID_LIVE_CANONICAL_CHAIN_STATE_FINALITY_API_FIXTURE_V1",
    source: "live_canonical_chain_state_api",
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

function liveState(root: string) {
  return {
    marker: "VOID_LIVE_CANONICAL_CHAIN_STATE_EPOCH_ROOT_SOURCE_FIXTURE_V1",
    finalized: true,
    validator_epoch_root_commitments: [
      { epoch: "0", root, finalized: true },
    ],
  };
}

function localCommitment(root: string) {
  return {
    marker: "VOID_VALIDATOR_EPOCH_ROOT_COMMITMENT_FIXTURE_V1",
    commitments: [
      { epoch: "0", root },
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

function apiEnv(
  truthFile: string,
  signerPubkeyFile: string,
  apiResponseFile: string | undefined,
  extra: Record<string, string | undefined> = {}
) {
  return {
    VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED: "1",
    VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE: "signed_runtime_truth_live_chain_api_epoch_root",
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE: truthFile,
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE: signerPubkeyFile,
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FILE: apiResponseFile,
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_DIR: undefined,
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-root-accepted-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const apiFile = writeJson(path.join(tmp, "api", "finalized-epoch-root.json"), apiResponse(root));

    withEnv(apiEnv(truthFile, signerFile, apiFile), () => {
      node.store.saveBlock(block as any);
      assert(!!node.store.loadBlock(0), "live API finalized epoch-root should accept matching signed runtime truth");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-root-missing-env-reject-"));
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
    const canonicalFixture = writeJson(path.join(tmp, "fixtures", "canonical-chain-state.json"), liveState(root));
    const localCommitment = writeJson(path.join(tmp, "fixtures", "local-commitment.json"), { commitments: [{ epoch: "0", root }] });

    withEnv(apiEnv(truthFile, signerFile, undefined, {
      VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_DIR: tmp,
      VOID_BLOCK_VALIDATOR_CANONICAL_CHAIN_STATE_FILE: canonicalFixture,
      VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE: localCommitment,
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: root,
    }), () => {
      expectReject(node, block, "missing_live_validator_chain_state_api_response_file");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-root-missing-file-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const missingApiFile = path.join(tmp, "api", "missing-finality.json");

    withEnv(apiEnv(truthFile, signerFile, missingApiFile), () => {
      expectReject(node, block, "live_validator_chain_state_api_response_file_missing");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-root-bad-json-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const apiFile = path.join(tmp, "api", "bad.json");
    fs.mkdirSync(path.dirname(apiFile), { recursive: true });
    fs.writeFileSync(apiFile, "{ not-json");

    withEnv(apiEnv(truthFile, signerFile, apiFile), () => {
      expectReject(node, block, "invalid_live_validator_chain_state_api_response");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-root-not-ok-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const apiFile = writeJson(path.join(tmp, "api", "not-ok.json"), apiResponse(root, {}, { ok: false, error: "not_finalized" }));

    withEnv(apiEnv(truthFile, signerFile, apiFile), () => {
      expectReject(node, block, "live_validator_chain_state_api_response_not_ok");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-root-stale-epoch-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const apiFile = writeJson(path.join(tmp, "api", "stale.json"), {
      ok: true,
      finalized: true,
      validator_epoch_root_commitments: [
        { epoch: "1", root, finalized: true },
      ],
    });

    withEnv(apiEnv(truthFile, signerFile, apiFile), () => {
      expectReject(node, block, "live_validator_chain_state_api_epoch_mismatch");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-root-malformed-root-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const apiFile = writeJson(path.join(tmp, "api", "bad-root.json"), apiResponse("not-a-root"));

    withEnv(apiEnv(truthFile, signerFile, apiFile), () => {
      expectReject(node, block, "invalid_live_validator_chain_state_api_epoch_root");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-root-unfinalized-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const apiFile = writeJson(path.join(tmp, "api", "unfinalized.json"), apiResponse(root, { finalized: false }, { finalized: false }));

    withEnv(apiEnv(truthFile, signerFile, apiFile), () => {
      expectReject(node, block, "live_validator_chain_state_api_epoch_root_not_finalized");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-root-wrong-root-reject-"));
    process.env.DATA_DIR = tmp;
    const proposer = makeKp();
    const signer = makeKp();
    const node = new Node(0, proposer, { allowEmptyBlocks: true });
    const { block } = signedBlock(proposer);
    const signedTruth = signTruth(baseTruth(proposer.nodeId), signer);
    const root = validatorRuntimeTruthManifestBodyHash(signedTruth);
    const truthFile = writeJson(path.join(tmp, "signed-runtime-truth.json"), signedTruth);
    const signerFile = writePubkey(tmp, signer);
    const apiFile = writeJson(path.join(tmp, "api", "wrong-root.json"), apiResponse(flipHex64(root)));

    writeJson(path.join(tmp, "validator-epoch-root-commitments.json"), liveState(root));
    const canonicalFixture = writeJson(path.join(tmp, "fixtures", "canonical-good.json"), liveState(root));
    const localCommitmentFile = writeJson(path.join(tmp, "fixtures", "local-good.json"), localCommitment(root));

    withEnv(apiEnv(truthFile, signerFile, apiFile, {
      VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_DIR: tmp,
      VOID_BLOCK_VALIDATOR_CANONICAL_CHAIN_STATE_FILE: canonicalFixture,
      VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE: localCommitmentFile,
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT: root,
    }), () => {
      expectReject(node, block, "validator_runtime_truth_live_chain_api_epoch_root_mismatch");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-root-body-changed-reject-"));
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
    const apiFile = writeJson(path.join(tmp, "api", "old-root.json"), apiResponse(rootA));

    withEnv(apiEnv(truthFile, signerFile, apiFile), () => {
      expectReject(node, block, "validator_runtime_truth_live_chain_api_epoch_root_mismatch");
    });
  }

  console.log("VOID_LIVE_CANONICAL_CHAIN_STATE_FINALITY_API_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
