#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";

import { computeRoots } from "../dist/chain/block.js";
import { SegStore } from "../dist/chain/seg_store.js";
import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  validateLegacyCommitDirectV2fsForAppendV1,
} from "../dist/chain/legacy_commit_direct_v2fs_v1.js";
import {
  followerLegacyV2fsOriginAuthorizedV1,
  followerLegacyV2fsOriginsFromRawV1,
} from "../dist/http/follower_legacy_v2fs_authority_v1.js";
import { preferredAuthenticatedDuplicateDirectionV1 } from "../dist/p2p/authenticated_duplicate_arbitration_v1.js";
import { Node } from "../dist/node_core.js";

const MARKER = "VOID_FOLLOWER_LEGACY_V2FS_AND_DUPLICATE_DIAL_V1_PROOF_GREEN";

function tempRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `void-follower-legacy-${label}-`));
}

function makeLegacy(number, txs = []) {
  const { txRoot } = computeRoots(txs, []);
  return {
    number,
    ts: 1_786_754_384_925 + number,
    txs,
    _commit: VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
    txRoot,
    header: { txRoot },
  };
}

function walPath(root) {
  return path.join(root, "wal", "00000000.wal");
}

function writeWal(root, record) {
  fs.writeFileSync(walPath(root), `${JSON.stringify(record)}\n`, "utf8");
}

function walRecord(version, block) {
  const base = {
    n: block.number,
    b64: Buffer.from(JSON.stringify(block)).toString("base64"),
    ts: Date.now(),
  };
  return version === 2
    ? { v: 2, mode: "legacy-v2fs", ...base }
    : { v: 1, ...base };
}

function proveLegacyEnvelopeAndStore() {
  const b0 = makeLegacy(0);
  const b1 = makeLegacy(1);
  const b2 = makeLegacy(2);

  assert.deepEqual(validateLegacyCommitDirectV2fsForAppendV1(b0, null), { ok: true });
  assert.deepEqual(validateLegacyCommitDirectV2fsForAppendV1(b1, b0), { ok: true });
  assert.equal(validateLegacyCommitDirectV2fsForAppendV1(b1, null).ok, false);
  assert.equal(
    validateLegacyCommitDirectV2fsForAppendV1({ ...b0, timestamp: b0.ts }, null).ok,
    false,
  );
  assert.equal(
    validateLegacyCommitDirectV2fsForAppendV1({ ...b0, _commit: "other" }, null).ok,
    false,
  );
  assert.equal(
    validateLegacyCommitDirectV2fsForAppendV1({ ...b0, txRoot: "1".repeat(64) }, null).ok,
    false,
  );

  const root = tempRoot("store");
  try {
    const store = new SegStore(root, { sparseEvery: 1 });
    assert.throws(
      () => store.saveBlock(b0),
      /invalid block: invalid_timestamp/,
      "ordinary modern saveBlock must not admit unsigned legacy",
    );
    store.saveAuthorizedLegacyCommitDirectV2fs(b0);
    store.saveAuthorizedLegacyCommitDirectV2fs(b1);
    store.saveAuthorizedLegacyCommitDirectV2fs(b2);
    assert.equal(store.loadHeadNumber(), 2);
    assert.deepEqual(store.loadBlock(0), b0);
    assert.deepEqual(store.loadBlock(1), b1);
    assert.deepEqual(store.loadBlock(2), b2);
    store.saveAuthorizedLegacyCommitDirectV2fs(b2);
    assert.equal(store.loadHeadNumber(), 2);
    assert.throws(
      () => store.saveAuthorizedLegacyCommitDirectV2fs({ ...b2, ts: b2.ts + 1 }),
      /conflicting existing block/,
    );
    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 2);
    assert.deepEqual(reopened.loadBlock(2), b2);
    assert.equal(fs.existsSync(walPath(root)), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  const v2Root = tempRoot("wal-v2");
  try {
    new SegStore(v2Root, { sparseEvery: 1 });
    writeWal(v2Root, walRecord(2, b0));
    const recovered = new SegStore(v2Root, { sparseEvery: 1 });
    assert.equal(recovered.loadHeadNumber(), 0);
    assert.deepEqual(recovered.loadBlock(0), b0);
  } finally {
    fs.rmSync(v2Root, { recursive: true, force: true });
  }

  const v1Root = tempRoot("wal-v1");
  try {
    new SegStore(v1Root, { sparseEvery: 1 });
    writeWal(v1Root, walRecord(1, b0));
    const rejected = new SegStore(v1Root, { sparseEvery: 1 });
    assert.equal(rejected.loadHeadNumber(), -1);
    assert.equal(rejected.loadBlock(0), null);
    assert.equal(fs.existsSync(walPath(v1Root)), true);
  } finally {
    fs.rmSync(v1Root, { recursive: true, force: true });
  }
}

function proveOriginAuthority() {
  assert.equal(followerLegacyV2fsOriginsFromRawV1("").size, 0);
  assert.equal(
    followerLegacyV2fsOriginAuthorizedV1(
      "http://127.0.0.1:4100",
      "http://127.0.0.1:4100/",
    ),
    true,
  );
  assert.equal(
    followerLegacyV2fsOriginAuthorizedV1(
      "http://127.0.0.1:4101",
      "http://127.0.0.1:4100",
    ),
    false,
  );
  assert.throws(
    () => followerLegacyV2fsOriginsFromRawV1("http://127.0.0.1:4100/private"),
    /requires an exact origin/,
  );
  assert.throws(
    () => followerLegacyV2fsOriginsFromRawV1("file:///tmp/not-an-origin"),
    /requires http\(s\)/,
  );
}

function proveDuplicateArbitration() {
  const precision = "9d89483769e469e0473b489dc50dba96";
  const nimo = "befd84d4fe47341af81b1a8aef8bcb97";
  assert.equal(preferredAuthenticatedDuplicateDirectionV1(precision, nimo), "outbound");
  assert.equal(preferredAuthenticatedDuplicateDirectionV1(nimo, precision), "inbound");

  const low = "0".repeat(32);
  const high = "f".repeat(32);
  assert.equal(preferredAuthenticatedDuplicateDirectionV1(low, high), "outbound");
  assert.equal(preferredAuthenticatedDuplicateDirectionV1(high, low), "inbound");
  assert.throws(
    () => preferredAuthenticatedDuplicateDirectionV1(low, low),
    /self identity collision/,
  );
}

function sendJson(res, status, body) {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(bytes.length));
  res.end(bytes);
}

function createFollowerFixture() {
  const blocks = new Map();
  const state = {
    head: -1,
    legacyWrites: 0,
    modernWrites: 0,
    indexWrites: [],
    receiptWrites: [],
  };
  const node = Object.create(Node.prototype);
  node.followerPullPersistenceGenerationV1 = null;
  node.store = {
    loadHeadNumber: () => state.head,
    loadBlock: (number) => blocks.get(Number(number)) ?? null,
    saveAuthorizedLegacyCommitDirectV2fs: (block) => {
      state.legacyWrites += 1;
      blocks.set(Number(block.number), block);
      state.head = Math.max(state.head, Number(block.number));
    },
    saveBlock: (block) => {
      state.modernWrites += 1;
      blocks.set(Number(block.number), block);
      state.head = Math.max(state.head, Number(block.number));
    },
    persistHeadAtomic: (number) => {
      state.head = Math.max(state.head, Number(number));
    },
  };
  node.txIndex = {
    putMany: (refs) => state.indexWrites.push(...refs),
  };
  node.receipts = {
    getMany: async (hashes) => new Map(hashes.map((hash) => [hash, { found: false }])),
    appendMany: async (records) => {
      state.receiptWrites.push(...records);
    },
  };
  return { node, state, blocks };
}

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  return Number(address.port);
}

async function close(server) {
  if (!server.listening) return;
  server.close();
  await once(server, "close");
}

async function provePullOnceOriginGateAndLegacyTimestamp() {
  const txHash = "11".repeat(32);
  const blocks = [
    makeLegacy(0, [{ hash: txHash, body: { proof: "legacy-ts" } }]),
    makeLegacy(1),
    makeLegacy(2),
  ];

  let servedBlocks = blocks;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/blocks/latest/number2.json") {
      sendJson(res, 200, { number: servedBlocks.at(-1)?.number ?? -1 });
      return;
    }
    if (url.pathname === "/blocks/range") {
      const from = Number(url.searchParams.get("from"));
      const to = Number(url.searchParams.get("to"));
      sendJson(
        res,
        200,
        servedBlocks.filter((b) => b.number >= from && b.number <= to),
      );
      return;
    }
    sendJson(res, 404, { ok: false });
  });

  const port = await listen(server);
  const origin = `http://127.0.0.1:${port}`;
  const oldOrigins = process.env.VOID_FOLLOWER_LEGACY_V2FS_ORIGINS;
  const oldLimit = process.env.VOID_FOLLOWER_PULL_LIMIT;
  const oldTimeout = process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS;

  try {
    process.env.VOID_FOLLOWER_PULL_LIMIT = "3";
    process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "5000";
    process.env.VOID_FOLLOWER_LEGACY_V2FS_ORIGINS = origin;

    const authorized = createFollowerFixture();
    const result = await authorized.node.pullOnce(origin);
    assert.equal(result.ok, true);
    assert.equal(result.imported, 3);
    assert.equal(authorized.state.head, 2);
    assert.equal(authorized.state.legacyWrites, 3);
    assert.equal(authorized.state.modernWrites, 0);
    assert.deepEqual(authorized.blocks.get(0), blocks[0]);
    assert.equal(authorized.state.receiptWrites.length, 1);
    assert.equal(authorized.state.receiptWrites[0].ts, blocks[0].ts);

    process.env.VOID_FOLLOWER_LEGACY_V2FS_ORIGINS = "";
    const unauthorized = createFollowerFixture();
    const rejected = await unauthorized.node.pullOnce(origin);
    assert.equal(rejected.ok, false);
    assert.equal(rejected.invalidBlock, 0);
    assert.equal(rejected.invalidReason, "legacy_v2fs_origin_not_authorized");
    assert.equal(unauthorized.state.legacyWrites, 0);
    assert.equal(unauthorized.state.modernWrites, 0);
    assert.equal(unauthorized.state.head, -1);

    process.env.VOID_FOLLOWER_LEGACY_V2FS_ORIGINS = origin;
    servedBlocks = [{ ...makeLegacy(0), _commit: "wrong.commit.marker" }];
    const wrongMarker = createFollowerFixture();
    const wrongMarkerResult = await wrongMarker.node.pullOnce(origin);
    assert.equal(wrongMarkerResult.ok, false);
    assert.equal(wrongMarkerResult.invalidBlock, 0);
    assert.equal(wrongMarkerResult.invalidReason, "legacy_v2fs_marker_mismatch");
    assert.equal(wrongMarker.state.legacyWrites, 0);
    assert.equal(wrongMarker.state.modernWrites, 0);
    assert.equal(wrongMarker.state.head, -1);
  } finally {
    if (oldOrigins === undefined) delete process.env.VOID_FOLLOWER_LEGACY_V2FS_ORIGINS;
    else process.env.VOID_FOLLOWER_LEGACY_V2FS_ORIGINS = oldOrigins;
    if (oldLimit === undefined) delete process.env.VOID_FOLLOWER_PULL_LIMIT;
    else process.env.VOID_FOLLOWER_PULL_LIMIT = oldLimit;
    if (oldTimeout === undefined) delete process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS;
    else process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = oldTimeout;
    await close(server);
  }
}

function proveFocusedWorkflowTracksDependencies() {
  const workflow = fs.readFileSync(
    ".github/workflows/void-public-bootstrap-client-resilience-v1.yml",
    "utf8",
  );
  for (const file of [
    "scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs",
    "src/chain/seg_store.ts",
    "src/chain/legacy_commit_direct_v2fs_v1.ts",
    "src/http/follower_legacy_v2fs_authority_v1.ts",
    "src/p2p/authenticated_duplicate_arbitration_v1.ts",
    "src/node_core.ts",
  ]) {
    assert.ok(workflow.includes(file), `workflow missing dependency ${file}`);
  }
  assert.ok(
    workflow.includes("node scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs"),
    "workflow does not execute focused legacy/dial proof",
  );
}

proveLegacyEnvelopeAndStore();
proveOriginAuthority();
proveDuplicateArbitration();
await provePullOnceOriginGateAndLegacyTimestamp();
proveFocusedWorkflowTracksDependencies();

console.log(MARKER);
console.log("modern_validator_unchanged=true");
console.log("legacy_exact_envelope=true");
console.log("wrong_legacy_marker_falls_through_modern=false");
console.log("legacy_origin_default_off=true");
console.log("legacy_wal_authority_tagged=true");
console.log("legacy_receipt_timestamp_uses_ts=true");
console.log("simultaneous_dial_direction_deterministic=true");
