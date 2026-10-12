// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";

import { Node } from "../src/node_core.js";
import { computeRoots, ZERO_HASH_64 } from "../src/chain/block.js";

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

function makeKp() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = crypto.createHash("sha256").update(pubPEM).digest("hex").slice(0, 32);
  return { privateKey, publicKey, pubPEM, nodeId };
}

function baseGenesis(overrides: Record<string, any> = {}) {
  const roots = computeRoots([], []);
  return {
    number: 0,
    parentHash: ZERO_HASH_64,
    timestamp: Date.now(),
    txRoot: roots.txRoot,
    blobRoot: roots.blobRoot,
    txs: [],
    blobs: [],
    proposer: "signature-boundary-fixture",
    sig: "a".repeat(128),
    ...overrides,
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-block-sig-empty-"));
    process.env.DATA_DIR = tmp;
    const node = new Node(0, makeKp(), { allowEmptyBlocks: true });
    expectReject(node, baseGenesis({ sig: "" }), "invalid_block_signature_shape");
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-block-sig-malformed-"));
    process.env.DATA_DIR = tmp;
    const node = new Node(0, makeKp(), { allowEmptyBlocks: true });
    expectReject(node, baseGenesis({ sig: "abc" }), "invalid_block_signature_shape");
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-block-missing-proposer-"));
    process.env.DATA_DIR = tmp;
    const node = new Node(0, makeKp(), { allowEmptyBlocks: true });
    expectReject(node, baseGenesis({ proposer: "" }), "missing_proposer");
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-block-sig-shape-valid-"));
    process.env.DATA_DIR = tmp;
    const node = new Node(0, makeKp(), { allowEmptyBlocks: true });
    const b = baseGenesis();
    node.store.saveBlock(b as any);
    assert(!!node.store.loadBlock(0), "valid signature-shape block should persist");
  }

  console.log("VOID_BLOCK_SIGNATURE_AUTHORITY_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
