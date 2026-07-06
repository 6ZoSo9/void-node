// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as http from "node:http";
import * as crypto from "node:crypto";

import { Node } from "../src/node_core.js";
import { Block, blockHash, computeRoots, ZERO_HASH_64 } from "../src/chain/block.js";

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

function makeKp() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = crypto.createHash("sha256").update(pubPEM).digest("hex").slice(0, 32);
  return { privateKey, publicKey, pubPEM, nodeId };
}

function emptyBlock(number: number, parentHash: string): Block {
  const roots = computeRoots([], []);
  return {
    number,
    parentHash,
    timestamp: Date.now(),
    txRoot: roots.txRoot,
    blobRoot: roots.blobRoot,
    txs: [],
    blobs: [],
    proposer: "fixture",
    sig: "",
  };
}

async function withPeer(blocks: any[], fn: (base: string) => Promise<void>) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/blocks/latest/number2.json") {
      const head = blocks.reduce((m, b) => Math.max(m, Number(b?.number ?? -1)), -1);
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ number: head }) + "\n");
      return;
    }
    if (url.pathname === "/blocks/range") {
      const from = Number(url.searchParams.get("from") || 0);
      const to = Number(url.searchParams.get("to") || -1);
      const out = blocks.filter((b) => Number(b?.number) >= from && Number(b?.number) <= to);
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(out) + "\n");
      return;
    }
    res.statusCode = 404;
    res.end("not found\n");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  assert(addr && typeof addr === "object", "peer server did not bind");
  const base = `http://127.0.0.1:${addr.port}`;

  try {
    await fn(base);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-peer-import-validation-"));
  process.env.DATA_DIR = tmp;

  const node = new Node(0, makeKp(), { allowEmptyBlocks: true });

  const genesis = emptyBlock(0, ZERO_HASH_64);
  node.store.saveBlock(genesis);

  const valid1 = emptyBlock(1, blockHash(genesis));

  const badParent = { ...valid1, parentHash: "f".repeat(64) };
  await withPeer([badParent], async (base) => {
    const out: any = await node.pullOnce(base);
    assert(out.ok === false, "bad parent peer block should be rejected");
    assert(out.invalidReason === "parent_hash_mismatch", `expected parent_hash_mismatch, got ${out.invalidReason}`);
    assert(node.store.loadBlock(1) === null, "bad parent peer block must not persist");
  });

  const txHash = "a".repeat(64);
  const badRoot = {
    ...valid1,
    txs: [{ hash: txHash, body: { kind: "bad-root-fixture" } }],
    txRoot: ZERO_HASH_64,
  };
  await withPeer([badRoot], async (base) => {
    const out: any = await node.pullOnce(base);
    assert(out.ok === false, "bad txRoot peer block should be rejected");
    assert(out.invalidReason === "tx_root_mismatch", `expected tx_root_mismatch, got ${out.invalidReason}`);
    assert(node.store.loadBlock(1) === null, "bad txRoot peer block must not persist");
  });

  await withPeer([valid1], async (base) => {
    const out: any = await node.pullOnce(base);
    assert(out.ok === true, "valid peer block should import");
    assert(node.store.loadBlock(1) !== null, "valid peer block should persist");
  });

  const impossible2 = emptyBlock(2, "e".repeat(64));
  let threw = false;
  try {
    node.store.saveBlock(impossible2);
  } catch (e: any) {
    threw = String(e?.message || e).includes("parent_hash_mismatch");
  }
  assert(threw, "SegStore.saveBlock must reject direct invalid append");

  console.log("VOID_PEER_BLOCK_IMPORT_VALIDATION_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
