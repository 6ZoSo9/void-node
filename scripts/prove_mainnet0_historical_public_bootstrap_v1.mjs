#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";

import {
  blockHash,
  computeRoots,
  validateBlockForAppend,
} from "../dist/chain/block.js";
import {
  isMainnet0GenesisMinimalV1,
  validateMainnet0GenesisMinimalForAppendV1,
} from "../dist/chain/mainnet0_historical_compat_v1.js";
import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  VOID_LEGACY_EMPTY_TX_ROOT_V1,
} from "../dist/chain/legacy_commit_direct_v2fs_v1.js";
import { SegStore } from "../dist/chain/seg_store.js";
import {
  followerVerifiedPublicBootstrapOriginAuthorizedV1,
  verifiedPublicBootstrapAdapterOriginV1,
} from "../dist/http/follower_verified_public_bootstrap_authority_v1.js";
import { Node } from "../dist/node_core.js";

const MARKER = "VOID_MAINNET0_HISTORICAL_PUBLIC_BOOTSTRAP_V1_PROOF_GREEN";

function tempRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `void-mainnet0-history-${label}-`));
}

function makeMinimal(number) {
  return {
    number,
    timestamp: 1_776_292_502_707 + number,
  };
}

function makeLegacy(number, txs = []) {
  const { txRoot: computedTxRoot } = computeRoots(txs, []);
  const txRoot = txs.length === 0
    ? VOID_LEGACY_EMPTY_TX_ROOT_V1
    : computedTxRoot;
  return {
    number,
    ts: 1_786_754_384_925 + number,
    txs,
    _commit: VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
    txRoot,
    header: { txRoot },
  };
}

function makeModern(number, parent) {
  const { txRoot, blobRoot } = computeRoots([], []);
  return {
    number,
    parentHash: blockHash(parent),
    timestamp: 1_790_000_000_000 + number,
    txRoot,
    blobRoot,
    txs: [],
    blobs: [],
    proposer: "mainnet0-modern-proof",
    sig: "00".repeat(64),
  };
}

function walPath(root) {
  return path.join(root, "wal", "00000000.wal");
}

function walRecord(version, mode, block) {
  return {
    v: version,
    mode,
    n: block.number,
    b64: Buffer.from(JSON.stringify(block)).toString("base64"),
    ts: Date.now(),
  };
}

function proveMinimalValidator() {
  const b0 = makeMinimal(0);
  const b1 = makeMinimal(1);

  assert.equal(isMainnet0GenesisMinimalV1(b0), true);
  assert.deepEqual(validateMainnet0GenesisMinimalForAppendV1(b0, null), { ok: true });
  assert.deepEqual(validateMainnet0GenesisMinimalForAppendV1(b1, b0), { ok: true });
  assert.equal(
    validateMainnet0GenesisMinimalForAppendV1({ ...b0, proposer: "" }, null).ok,
    false,
  );
  assert.equal(
    validateMainnet0GenesisMinimalForAppendV1({ number: "0", timestamp: b0.timestamp }, null).ok,
    false,
  );
  assert.equal(
    validateMainnet0GenesisMinimalForAppendV1({ number: 0, timestamp: "1" }, null).ok,
    false,
  );
  assert.equal(validateMainnet0GenesisMinimalForAppendV1(b1, null).ok, false);
}

function proveVerifiedAdapterAuthority() {
  const origin = "http://127.0.0.1:43123";
  const good = {
    VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "1",
    VOID_FOLLOWER_AUTOSTART_PEERS: origin,
    VOID_FOLLOWER_AUTOSTART_PEER: `${origin}/`,
  };

  assert.equal(verifiedPublicBootstrapAdapterOriginV1(good), origin);
  assert.equal(followerVerifiedPublicBootstrapOriginAuthorizedV1(origin, good), true);
  assert.equal(
    followerVerifiedPublicBootstrapOriginAuthorizedV1("http://127.0.0.1:43124", good),
    false,
  );
  assert.equal(
    verifiedPublicBootstrapAdapterOriginV1({
      ...good,
      VOID_FOLLOWER_AUTOSTART_PEER: "http://127.0.0.1:43124",
    }),
    null,
  );
  assert.equal(
    verifiedPublicBootstrapAdapterOriginV1({
      ...good,
      VOID_FOLLOWER_AUTOSTART_PEERS: `${origin},http://127.0.0.1:43124`,
    }),
    null,
  );
  assert.equal(
    verifiedPublicBootstrapAdapterOriginV1({
      ...good,
      VOID_FOLLOWER_AUTOSTART_PEERS: "http://192.168.1.10:43123",
      VOID_FOLLOWER_AUTOSTART_PEER: "http://192.168.1.10:43123",
    }),
    null,
  );
  assert.equal(
    verifiedPublicBootstrapAdapterOriginV1({
      ...good,
      VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "0",
    }),
    null,
  );
}

function proveSegStoreRatchetAndModernIsolation() {
  const root = tempRoot("ratchet");
  const oldAuthority = process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;

  try {
    process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = "0";
    const b0 = makeMinimal(0);
    const b1 = makeLegacy(1);
    const b2 = makeModern(2, b1);

    assert.deepEqual(validateBlockForAppend(b2, b1), { ok: true });

    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveAuthorizedMainnet0GenesisMinimalV1(b0);
    store.saveAuthorizedMainnet0HistoricalLegacyV2fs(b1);
    store.saveBlock(b2);

    assert.equal(store.loadHeadNumber(), 2);
    assert.deepEqual(store.loadBlock(0), b0);
    assert.deepEqual(store.loadBlock(1), b1);
    assert.deepEqual(store.loadBlock(2), b2);

    assert.throws(
      () => store.saveAuthorizedMainnet0GenesisMinimalV1(makeMinimal(3)),
      /mainnet0_historical_minimal_parent_era_invalid/,
    );
    assert.throws(
      () => store.saveAuthorizedMainnet0HistoricalLegacyV2fs(makeLegacy(3)),
      /mainnet0_historical_v2fs_parent_era_invalid/,
    );
  } finally {
    if (oldAuthority === undefined) delete process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
    else process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = oldAuthority;
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function proveWalReplayAcrossHistoricalModes() {
  const root = tempRoot("wal-good");
  try {
    const b0 = makeMinimal(0);
    const b1 = makeLegacy(1);
    new SegStore(root, { sparseEvery: 1 });
    fs.writeFileSync(
      walPath(root),
      [
        JSON.stringify(walRecord(3, "genesis-minimal-v1", b0)),
        JSON.stringify(walRecord(4, "legacy-v2fs-historical-v1", b1)),
        "",
      ].join("\n"),
      "utf8",
    );

    const recovered = new SegStore(root, { sparseEvery: 1 });
    assert.equal(recovered.loadHeadNumber(), 1);
    assert.deepEqual(recovered.loadBlock(0), b0);
    assert.deepEqual(recovered.loadBlock(1), b1);
    assert.equal(fs.existsSync(walPath(root)), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  const rejectedRoot = tempRoot("wal-v2fs-genesis");
  try {
    const b0 = makeLegacy(0);
    new SegStore(rejectedRoot, { sparseEvery: 1 });
    fs.writeFileSync(
      walPath(rejectedRoot),
      `${JSON.stringify(walRecord(4, "legacy-v2fs-historical-v1", b0))}\n`,
      "utf8",
    );
    const rejected = new SegStore(rejectedRoot, { sparseEvery: 1 });
    assert.equal(rejected.loadHeadNumber(), -1);
    assert.equal(rejected.loadBlock(0), null);
    assert.equal(fs.existsSync(walPath(rejectedRoot)), true);
  } finally {
    fs.rmSync(rejectedRoot, { recursive: true, force: true });
  }
}

function sendJson(res, status, body) {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("content-length", String(bytes.length));
  res.end(bytes);
}

function chainServer(state) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/blocks/latest/number2.json") {
      sendJson(res, 200, { number: state.blocks.at(-1)?.number ?? -1 });
      return;
    }
    if (url.pathname === "/blocks/range") {
      const from = Number(url.searchParams.get("from"));
      const to = Number(url.searchParams.get("to"));
      sendJson(res, 200, state.blocks.filter((block) => block.number >= from && block.number <= to));
      return;
    }
    sendJson(res, 404, { ok: false });
  });
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

function makeFollowerNode(store) {
  const node = Object.create(Node.prototype);
  node.followerPullPersistenceGenerationV1 = null;
  node.store = store;
  node.txIndex = {};
  node.receipts = {};
  return node;
}

async function proveAdapterOnlyFollowerAndManualPeerIsolation() {
  const trustedState = { blocks: [makeMinimal(0), makeMinimal(1), makeLegacy(2)] };
  const attackerState = { blocks: [makeMinimal(0)] };
  const trustedServer = chainServer(trustedState);
  const attackerServer = chainServer(attackerState);
  const trustedPort = await listen(trustedServer);
  const attackerPort = await listen(attackerServer);
  const trustedOrigin = `http://127.0.0.1:${trustedPort}`;
  const attackerOrigin = `http://127.0.0.1:${attackerPort}`;
  const envKeys = [
    "VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE",
    "VOID_FOLLOWER_AUTOSTART_PEERS",
    "VOID_FOLLOWER_AUTOSTART_PEER",
    "VOID_FOLLOWER_LEGACY_V2FS_ORIGINS",
    "VOID_FOLLOWER_PULL_LIMIT",
    "VOID_FOLLOWER_PULL_TIMEOUT_MS",
  ];
  const backup = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const trustedRoot = tempRoot("adapter");
  const attackerRoot = tempRoot("attacker");

  try {
    process.env.VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE = "1";
    process.env.VOID_FOLLOWER_AUTOSTART_PEERS = trustedOrigin;
    process.env.VOID_FOLLOWER_AUTOSTART_PEER = trustedOrigin;
    delete process.env.VOID_FOLLOWER_LEGACY_V2FS_ORIGINS;
    process.env.VOID_FOLLOWER_PULL_LIMIT = "3";
    process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "5000";

    const trustedStore = new SegStore(trustedRoot, { sparseEvery: 1 });
    const trustedNode = makeFollowerNode(trustedStore);
    const result = await trustedNode.pullOnce(trustedOrigin);
    assert.equal(result.ok, true);
    assert.equal(result.imported, 3);
    assert.equal(trustedStore.loadHeadNumber(), 2);
    assert.deepEqual(trustedStore.loadBlock(0), trustedState.blocks[0]);
    assert.deepEqual(trustedStore.loadBlock(1), trustedState.blocks[1]);
    assert.deepEqual(trustedStore.loadBlock(2), trustedState.blocks[2]);

    const attackerStore = new SegStore(attackerRoot, { sparseEvery: 1 });
    const attackerNode = makeFollowerNode(attackerStore);
    const rejected = await attackerNode.pullOnce(attackerOrigin);
    assert.equal(rejected.ok, false);
    assert.equal(rejected.invalidBlock, 0);
    assert.equal(rejected.invalidReason, "mainnet0_minimal_origin_not_authorized");
    assert.equal(attackerStore.loadHeadNumber(), -1);

    trustedState.blocks = [...trustedState.blocks, makeMinimal(3)];
    await assert.rejects(
      () => trustedNode.pullOnce(trustedOrigin),
      /mainnet0_historical_minimal_parent_era_invalid/,
    );
    assert.equal(trustedStore.loadHeadNumber(), 2);
  } finally {
    for (const [key, value] of Object.entries(backup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(trustedRoot, { recursive: true, force: true });
    fs.rmSync(attackerRoot, { recursive: true, force: true });
    await close(trustedServer);
    await close(attackerServer);
  }
}

function proveWorkflowTracksHistoricalBoundary() {
  const workflow = fs.readFileSync(
    ".github/workflows/void-public-bootstrap-client-resilience-v1.yml",
    "utf8",
  );
  for (const file of [
    "scripts/prove_mainnet0_historical_public_bootstrap_v1.mjs",
    "src/chain/mainnet0_historical_compat_v1.ts",
    "src/http/follower_verified_public_bootstrap_authority_v1.ts",
    "src/http/follower_routes.ts",
    "src/chain/seg_store.ts",
    "src/node_core.ts",
  ]) {
    assert.ok(workflow.includes(file), `workflow missing dependency ${file}`);
  }
  assert.ok(
    workflow.includes("node scripts/prove_mainnet0_historical_public_bootstrap_v1.mjs"),
    "workflow does not execute Mainnet-0 historical bootstrap proof",
  );
}

proveMinimalValidator();
proveVerifiedAdapterAuthority();
proveSegStoreRatchetAndModernIsolation();
proveWalReplayAcrossHistoricalModes();
await proveAdapterOnlyFollowerAndManualPeerIsolation();
proveWorkflowTracksHistoricalBoundary();

console.log(MARKER);
console.log("manual_bootstrap_configuration_required=false");
console.log("verified_adapter_exact_origin_required=true");
console.log("minimal_exact_envelope_required=true");
console.log("historical_era_regression_rejected=true");
console.log("modern_validator_unchanged=true");
console.log("historical_wal_modes_replay_bounded=true");
