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

function withAuthorityEnv(trustedIds: string[], fn: () => void) {
  const prevRequired = process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
  const prevTrusted = process.env.VOID_BLOCK_TRUSTED_PROPOSERS;
  try {
    process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = "1";
    process.env.VOID_BLOCK_TRUSTED_PROPOSERS = trustedIds.join(",");
    fn();
  } finally {
    if (prevRequired === undefined) delete process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
    else process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = prevRequired;

    if (prevTrusted === undefined) delete process.env.VOID_BLOCK_TRUSTED_PROPOSERS;
    else process.env.VOID_BLOCK_TRUSTED_PROPOSERS = prevTrusted;
  }
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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-proposer-authority-allowlisted-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    withAuthorityEnv([kp.nodeId], () => {
      node.store.saveBlock(block as any);
      assert(!!node.store.loadBlock(0), "allowlisted signed proposer block should persist");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-proposer-authority-unauthorized-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const allowedOther = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    withAuthorityEnv([allowedOther.nodeId], () => {
      expectReject(node, block, "unauthorized_proposer");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-proposer-authority-missing-pubkey-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    delete block.proposerPubkey;
    withAuthorityEnv([kp.nodeId], () => {
      expectReject(node, block, "missing_proposer_pubkey");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-proposer-authority-bad-sig-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    block.sig = "b".repeat(128);
    withAuthorityEnv([kp.nodeId], () => {
      expectReject(node, block, "block_signature_invalid");
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-proposer-authority-default-off-"));
    process.env.DATA_DIR = tmp;
    const kp = makeKp();
    const node = new Node(0, kp, { allowEmptyBlocks: true });
    const { block } = signedGenesis(kp);
    delete process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
    delete process.env.VOID_BLOCK_TRUSTED_PROPOSERS;
    node.store.saveBlock(block as any);
    assert(!!node.store.loadBlock(0), "default-off authority mode should preserve existing self-authenticated block behavior");
  }

  console.log("VOID_BLOCK_PROPOSER_AUTHORITY_ALLOWLIST_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
