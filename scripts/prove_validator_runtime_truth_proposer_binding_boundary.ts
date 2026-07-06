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

function signBlock(priv: crypto.KeyObject, b: any): string {
  return crypto.sign(null, blockHeaderBytes(b), priv).toString("hex");
}

function signedGenesis(kp = makeKp(), overrides: Record<string, any> = {}) {
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
  draft.sig = signBlock(kp.privateKey, draft);
  return { kp, block: draft };
}

function writeRuntimeTruthFile(tmp: string, proposer: string, extra: Record<string, any> = {}) {
  const file = path.join(tmp, "validator-runtime-truth.json");
  fs.writeFileSync(file, JSON.stringify({
    marker: "VOID_VALIDATOR_RUNTIME_TRUTH_PROPOSER_BINDING_FIXTURE_V1",
    epoch: "0",
    schedule: [
      { epoch: "0", slot: 0, proposer }
    ],
    ...extra,
  }, null, 2));
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

function runtimeTruthEnv(file: string, extra: Record<string, string | undefined> = {}) {
  return {
    VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED: "1",
    VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE: "runtime_truth",
    VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE: file,
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-runtime-truth-slot-accepted-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    const truthFile = writeRuntimeTruthFile(tmp, kp.nodeId);

    withEnv(runtimeTruthEnv(truthFile), () => {
      node.store.saveBlock(block as any);
      assert(!!node.store.loadBlock(0), "runtime-truth slot proposer block should persist");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-runtime-truth-slot-reject-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const expected = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    const truthFile = writeRuntimeTruthFile(tmp, expected.nodeId);

    withEnv(runtimeTruthEnv(truthFile), () => {
      expectReject(node, block, "runtime_truth_proposer_mismatch");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-runtime-truth-env-only-reject-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);

    withEnv({
      VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED: "1",
      VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE: "runtime_truth",
      VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE: undefined,
      VOID_BLOCK_TRUSTED_PROPOSERS: kp.nodeId,
    }, () => {
      expectReject(node, block, "missing_validator_runtime_truth_file");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-runtime-truth-malformed-reject-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    const badFile = path.join(tmp, "bad-runtime-truth.json");
    fs.writeFileSync(badFile, "{ not-json");

    withEnv(runtimeTruthEnv(badFile), () => {
      expectReject(node, block, "invalid_validator_runtime_truth_file");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-runtime-truth-unsupported-source-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    const truthFile = writeRuntimeTruthFile(tmp, kp.nodeId);

    withEnv(runtimeTruthEnv(truthFile, { VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE: "operator_vibes" }), () => {
      expectReject(node, block, "unsupported_proposer_authority_source");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-runtime-truth-missing-schedule-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    const emptyFile = path.join(tmp, "empty-runtime-truth.json");
    fs.writeFileSync(emptyFile, JSON.stringify({ marker: "EMPTY_RUNTIME_TRUTH", epoch: "0" }));

    withEnv(runtimeTruthEnv(emptyFile), () => {
      expectReject(node, block, "validator_runtime_truth_schedule_missing");
    });
  }

  console.log("VOID_VALIDATOR_RUNTIME_TRUTH_PROPOSER_BINDING_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
