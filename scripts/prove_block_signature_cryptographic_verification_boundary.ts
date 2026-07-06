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
  verifyBlockSignatureWithPubkey,
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-block-crypto-valid-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    const verified = verifyBlockSignatureWithPubkey(block, kp.pubPEM);
    assert(verified.ok === true, "valid signed block should verify");
    node.store.saveBlock(block as any);
    assert(!!node.store.loadBlock(0), "valid signed block should persist");
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-block-crypto-bad-sig-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    block.sig = "b".repeat(128);
    expectReject(node, block, "block_signature_invalid");
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-block-crypto-tampered-header-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    block.timestamp = block.timestamp + 1;
    expectReject(node, block, "block_signature_invalid");
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-block-crypto-wrong-key-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const other = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    block.proposerPubkey = other.pubPEM;
    expectReject(node, block, "proposer_pubkey_mismatch");
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-block-crypto-local-seal-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const out = await node.sealBlock({ allowEmptyOnce: true });
    assert(out.ok === true && out.number === 0, "local seal should create genesis block");
    const b: any = node.store.loadBlock(0);
    assert(!!b, "local sealed block should persist");
    assert(typeof b.proposerPubkey === "string" && b.proposerPubkey.includes("BEGIN PUBLIC KEY"), "local sealed block should carry proposerPubkey");
    const verified = verifyBlockSignatureWithPubkey(b, b.proposerPubkey);
    assert(verified.ok === true, "local sealed block signature should verify against embedded proposerPubkey");
  }

  console.log("VOID_BLOCK_SIGNATURE_CRYPTOGRAPHIC_VERIFICATION_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
