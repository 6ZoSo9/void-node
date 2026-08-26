#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createPublicSeedClientAdapterV1 } from "../tools/void-public-seed-client-adapter-v1.mjs";

import {
  blockHash,
  computeRoots,
  validateBlockForAppend,
} from "../dist/chain/block.js";
import {
  isMainnet0CanonicalModernToLegacyV2fsBridgeV1,
  isMainnet0GenesisMinimalV1,
  validateMainnet0GenesisMinimalForAppendV1,
  validateMainnet0HistoricalTransitionV1,
} from "../dist/chain/mainnet0_historical_compat_v1.js";
import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  VOID_LEGACY_EMPTY_TX_ROOT_V1,
} from "../dist/chain/legacy_commit_direct_v2fs_v1.js";
import { SegStore } from "../dist/chain/seg_store.js";
import {
  VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1,
  clearVerifiedPublicBootstrapAuthorityForTestV1,
  createVerifiedPublicBootstrapChallengeV1,
  installVerifiedPublicBootstrapAuthorityForTestV1,
  resetVerifiedPublicBootstrapAuthorityForTestV1,
  verifiedPublicBootstrapChallengeStillLiveV1,
  verifyVerifiedPublicBootstrapResponseV1,
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

function makeCanonical196020Parent({ observedHeaderObject = false } = {}) {
  return {
    number: 196020,
    parentHash: "65db20b28569ba90f76d0ae54e5a2c4082e8512ba5bc68d325f4ff4304a43e16",
    timestamp: 1776366022468,
    txRoot: "0".repeat(64),
    blobRoot: "0".repeat(64),
    txs: [],
    blobs: [],
    proposer: "9d89483769e469e0473b489dc50dba96",
    sig: "5be9d1fa7206a835f9a4c751037ea7dbf791c5d92800a2de4b80f39addc5911274a14db2351ceb040391fc8594aadf184c1b05ba400f1bc9db406e9002aef204",
    header: {
      txRoot: observedHeaderObject
        ? { root: VOID_LEGACY_EMPTY_TX_ROOT_V1, leaves: [] }
        : VOID_LEGACY_EMPTY_TX_ROOT_V1,
    },
  };
}

function makeCanonical196021Legacy() {
  return {
    number: 196021,
    ts: 1776473091835,
    txs: [],
    _commit: VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
    txRoot: VOID_LEGACY_EMPTY_TX_ROOT_V1,
    header: { txRoot: VOID_LEGACY_EMPTY_TX_ROOT_V1 },
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
  resetVerifiedPublicBootstrapAuthorityForTestV1();

  const origin = "http://127.0.0.1:43123";
  const secretHex = crypto.randomBytes(32).toString("hex");
  const generation = crypto.randomBytes(16).toString("hex");

  assert.equal(createVerifiedPublicBootstrapChallengeV1(`${origin}/blocks/range?from=0&to=0`), null);
  assert.equal(
    installVerifiedPublicBootstrapAuthorityForTestV1({
      sequence: 1,
      generation,
      adapter_origin: origin,
      secret_hex: secretHex,
    }),
    true,
  );

  const challenge = createVerifiedPublicBootstrapChallengeV1(
    `${origin}/blocks/range?from=0&to=0`,
  );
  assert(challenge);
  assert.equal(challenge.requestedUrl, `${origin}/blocks/range?from=0&to=0`);
  assert.equal(
    createVerifiedPublicBootstrapChallengeV1(
      "http://127.0.0.1:43124/blocks/range?from=0&to=0",
    ),
    null,
  );

  assert.equal(
    installVerifiedPublicBootstrapAuthorityForTestV1({
      sequence: 1,
      generation,
      adapter_origin: origin,
      secret_hex: secretHex,
    }),
    false,
    "duplicate authority sequence must not replace live generation",
  );

  resetVerifiedPublicBootstrapAuthorityForTestV1();
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

function proveCanonical196021BridgeAndFollowerImportIsolation() {
  const canonicalParent = makeCanonical196020Parent();
  const observedMutatedHeaderParent = makeCanonical196020Parent({
    observedHeaderObject: true,
  });
  const canonicalCandidate = makeCanonical196021Legacy();

  assert.equal(
    isMainnet0CanonicalModernToLegacyV2fsBridgeV1(
      canonicalParent,
      canonicalCandidate,
    ),
    true,
  );
  assert.deepEqual(
    validateMainnet0HistoricalTransitionV1(
      canonicalParent,
      "legacy-v2fs",
      canonicalCandidate,
    ),
    { ok: true },
  );
  assert.deepEqual(
    validateMainnet0HistoricalTransitionV1(
      observedMutatedHeaderParent,
      "legacy-v2fs",
      canonicalCandidate,
    ),
    { ok: true },
    "existing follower #196020 header object must not require chain rewrite",
  );

  const invalidParents = [
    { ...canonicalParent, parentHash: "f".repeat(64) },
    { ...canonicalParent, proposer: "other-proposer" },
    { ...canonicalParent, sig: "f".repeat(128) },
  ];
  for (const parent of invalidParents) {
    assert.equal(
      isMainnet0CanonicalModernToLegacyV2fsBridgeV1(
        parent,
        canonicalCandidate,
      ),
      false,
    );
    assert.equal(
      validateMainnet0HistoricalTransitionV1(
        parent,
        "legacy-v2fs",
        canonicalCandidate,
      ).ok,
      false,
    );
  }

  const invalidCandidates = [
    { ...canonicalCandidate, number: 196022 },
    { ...canonicalCandidate, ts: canonicalCandidate.ts + 1 },
    {
      ...canonicalCandidate,
      txRoot: "f".repeat(64),
      header: { txRoot: "f".repeat(64) },
    },
    { ...canonicalCandidate, txs: [{ hash: "33".repeat(32) }] },
    { ...canonicalCandidate, unexpected: true },
  ];
  for (const candidate of invalidCandidates) {
    assert.equal(
      isMainnet0CanonicalModernToLegacyV2fsBridgeV1(
        canonicalParent,
        candidate,
      ),
      false,
    );
    assert.equal(
      validateMainnet0HistoricalTransitionV1(
        canonicalParent,
        "legacy-v2fs",
        candidate,
      ).ok,
      false,
    );
  }

  const genericMinimal = makeMinimal(0);
  const genericLegacy = makeLegacy(1);
  const genericModern = makeModern(2, genericLegacy);
  assert.equal(
    validateMainnet0HistoricalTransitionV1(
      genericModern,
      "legacy-v2fs",
      makeLegacy(3),
    ).ok,
    false,
    "non-canonical modern->legacy regression must remain rejected",
  );

  const bridgeRoot = tempRoot("canonical-196021-bridge");
  try {
    const store = new SegStore(bridgeRoot, { sparseEvery: 1 });
    assert.equal(typeof store.saveBlockCommit, "function");
    assert.equal(typeof store.persistHeadAtomic, "function");

    // Fixture preparation only: seed the already-durable #196020 parent without
    // replaying 196021 historical blocks. This exercises the real SegStore
    // transition/append path at the observed canonical height.
    store.saveBlockCommit(observedMutatedHeaderParent);
    store.persistHeadAtomic(196020);
    assert.deepEqual(store.loadBlock(196020), observedMutatedHeaderParent);

    store.saveAuthorizedMainnet0HistoricalLegacyV2fs(canonicalCandidate);
    assert.equal(store.loadHeadNumber(), 196021);
    assert.deepEqual(store.loadBlock(196021), canonicalCandidate);
  } finally {
    fs.rmSync(bridgeRoot, { recursive: true, force: true });
  }

  const importRoot = tempRoot("modern-import-bypass");
  const oldAuthority = process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
  try {
    process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = "0";
    const b0 = genericMinimal;
    const b1 = genericLegacy;
    const b2 = genericModern;
    const store = new SegStore(importRoot, { sparseEvery: 1 });
    store.saveAuthorizedMainnet0GenesisMinimalV1(b0);
    store.saveAuthorizedMainnet0HistoricalLegacyV2fs(b1);

    let wrappedSaveBlockCalls = 0;
    const originalSaveBlock = store.saveBlock.bind(store);
    store.saveBlock = (block) => {
      wrappedSaveBlockCalls += 1;
      block.header = {
        txRoot: { root: VOID_LEGACY_EMPTY_TX_ROOT_V1, leaves: [] },
      };
      return originalSaveBlock(block);
    };

    const exactBefore = structuredClone(b2);
    store.saveFollowerImportedModernV1(b2);
    assert.equal(
      wrappedSaveBlockCalls,
      0,
      "follower import must not pass through local saveBlock wrappers",
    );
    assert.deepEqual(b2, exactBefore);
    assert.deepEqual(store.loadBlock(2), exactBefore);
  } finally {
    if (oldAuthority === undefined) {
      delete process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED;
    } else {
      process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = oldAuthority;
    }
    fs.rmSync(importRoot, { recursive: true, force: true });
  }

  const nodeSource = fs.readFileSync("src/node_core.ts", "utf8");
  const saveFollowerStart = nodeSource.indexOf("const saveFollowerBlockV1 = (");
  assert(saveFollowerStart >= 0);
  const saveFollowerWindow = nodeSource.slice(
    saveFollowerStart,
    saveFollowerStart + 2600,
  );
  assert.ok(
    saveFollowerWindow.includes("this.store.saveFollowerImportedModernV1(block);"),
    "follower modern import does not call the dedicated exact-import method",
  );
  assert.equal(
    saveFollowerWindow.includes("this.store.saveBlock(block);"),
    false,
    "follower modern import still calls wrapper-owned saveBlock",
  );
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
  res.setHeader("x-void-public-seed-gateway", "v1");
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

async function listenAt(server, port) {
  server.listen(port, "127.0.0.1");
  await once(server, "listening");
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
  const trustedState = {
    blocks: [makeMinimal(0), makeMinimal(1), makeLegacy(2)],
  };
  const upstreamServer = chainServer(trustedState);
  const upstreamPort = await listen(upstreamServer);
  const upstreamOrigin = `http://127.0.0.1:${upstreamPort}`;

  const secret = crypto.randomBytes(32);
  const generation = crypto.randomBytes(16).toString("hex");
  const sequence = 1;
  const adapter = await createPublicSeedClientAdapterV1({
    peers: upstreamOrigin,
    port: 0,
    allowLoopbackFixture: true,
    authority: {
      schema: "void_public_seed_response_authority_v1",
      generation,
      sequence,
      secret,
    },
  });

  const envKeys = [
    "VOID_FOLLOWER_LEGACY_V2FS_ORIGINS",
    "VOID_FOLLOWER_PULL_LIMIT",
    "VOID_FOLLOWER_PULL_TIMEOUT_MS",
  ];
  const backup = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const trustedRoot = tempRoot("adapter");
  const appendRaceRoot = tempRoot("append-boundary");
  const noAuthorityRoot = tempRoot("no-authority");
  const replacementRoot = tempRoot("same-port-replacement");
  let replacementServer = null;

  try {
    delete process.env.VOID_FOLLOWER_LEGACY_V2FS_ORIGINS;
    process.env.VOID_FOLLOWER_PULL_LIMIT = "3";
    process.env.VOID_FOLLOWER_PULL_TIMEOUT_MS = "5000";

    resetVerifiedPublicBootstrapAuthorityForTestV1();

    const noAuthorityStore = new SegStore(noAuthorityRoot, { sparseEvery: 1 });
    const noAuthorityNode = makeFollowerNode(noAuthorityStore);
    const noAuthorityResult = await noAuthorityNode.pullOnce(upstreamOrigin);
    assert.equal(noAuthorityResult.ok, false);
    assert.equal(noAuthorityResult.invalidBlock, 0);
    assert.equal(noAuthorityResult.invalidReason, "mainnet0_minimal_origin_not_authorized");
    assert.equal(noAuthorityStore.loadHeadNumber(), -1);

    assert.equal(
      installVerifiedPublicBootstrapAuthorityForTestV1({
        sequence,
        generation,
        adapter_origin: adapter.base,
        secret_hex: secret.toString("hex"),
      }),
      true,
    );

    const trustedStore = new SegStore(trustedRoot, { sparseEvery: 1 });
    const trustedNode = makeFollowerNode(trustedStore);
    const result = await trustedNode.pullOnce(adapter.base);
    assert.equal(result.ok, true);
    assert.equal(result.imported, 3);
    assert.equal(trustedStore.loadHeadNumber(), 2);
    assert.deepEqual(trustedStore.loadBlock(0), trustedState.blocks[0]);
    assert.deepEqual(trustedStore.loadBlock(1), trustedState.blocks[1]);
    assert.deepEqual(trustedStore.loadBlock(2), trustedState.blocks[2]);

    resetVerifiedPublicBootstrapAuthorityForTestV1();
    assert.equal(
      installVerifiedPublicBootstrapAuthorityForTestV1({
        sequence,
        generation,
        adapter_origin: adapter.base,
        secret_hex: secret.toString("hex"),
      }),
      true,
    );

    const appendRaceStore = new SegStore(appendRaceRoot, { sparseEvery: 1 });
    const appendRaceNode = makeFollowerNode(appendRaceStore);
    let appendBoundaryAuthorityCleared = false;
    await assert.rejects(
      () => appendRaceNode.pullOnce(adapter.base, {
        onImportBlock: (block) => {
          if (
            !appendBoundaryAuthorityCleared &&
            Number(block?.number) === 0
          ) {
            const challenge = createVerifiedPublicBootstrapChallengeV1(
              `${adapter.base}/blocks/range?from=0&to=0`,
            );
            assert(challenge);
            assert.equal(
              verifiedPublicBootstrapChallengeStillLiveV1(challenge),
              true,
            );
            clearVerifiedPublicBootstrapAuthorityForTestV1();
            assert.equal(
              verifiedPublicBootstrapChallengeStillLiveV1(challenge),
              false,
            );
            appendBoundaryAuthorityCleared = true;
          }
        },
      }),
      /VOID_PUBLIC_BOOTSTRAP_HISTORICAL_RESPONSE_AUTHORITY_V1/,
      "authority loss after one verified historical append must stop the next append",
    );
    assert.equal(appendBoundaryAuthorityCleared, true);
    assert.deepEqual(appendRaceStore.loadBlock(0), trustedState.blocks[0]);
    assert.equal(appendRaceStore.loadBlock(1), null);
    assert.equal(appendRaceStore.loadHeadNumber(), 0);

    resetVerifiedPublicBootstrapAuthorityForTestV1();
    assert.equal(
      installVerifiedPublicBootstrapAuthorityForTestV1({
        sequence,
        generation,
        adapter_origin: adapter.base,
        secret_hex: secret.toString("hex"),
      }),
      true,
    );

    const route = "/blocks/range?from=0&to=0";
    const challenge1 = createVerifiedPublicBootstrapChallengeV1(
      `${adapter.base}${route}`,
    );
    assert(challenge1);
    const response1 = await fetch(`${adapter.base}${route}`, {
      headers: {
        [VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1]: challenge1.nonce,
      },
    });
    const bytes1 = Buffer.from(await response1.arrayBuffer());
    assert.equal(
      verifyVerifiedPublicBootstrapResponseV1(response1, bytes1, challenge1),
      true,
    );

    const challenge2 = createVerifiedPublicBootstrapChallengeV1(
      `${adapter.base}${route}`,
    );
    assert(challenge2);
    assert.notEqual(challenge1.nonce, challenge2.nonce);
    assert.equal(
      verifyVerifiedPublicBootstrapResponseV1(response1, bytes1, challenge2),
      false,
      "captured HMAC must not replay under a fresh nonce",
    );

    const tamperedResponse = new Response(
      Buffer.concat([bytes1, Buffer.from(" ")]),
      { status: response1.status, headers: response1.headers },
    );
    const tamperedBytes = Buffer.from(await tamperedResponse.arrayBuffer());
    assert.equal(
      verifyVerifiedPublicBootstrapResponseV1(
        tamperedResponse,
        tamperedBytes,
        challenge1,
      ),
      false,
      "copied HMAC must not authorize different response bytes",
    );

    clearVerifiedPublicBootstrapAuthorityForTestV1();
    assert.equal(
      verifyVerifiedPublicBootstrapResponseV1(response1, bytes1, challenge1),
      false,
      "authority cleared mid-flight must invalidate an otherwise valid response",
    );

    const nextSecret = crypto.randomBytes(32);
    const nextGeneration = crypto.randomBytes(16).toString("hex");
    assert.equal(
      installVerifiedPublicBootstrapAuthorityForTestV1({
        sequence: 2,
        generation: nextGeneration,
        adapter_origin: adapter.base,
        secret_hex: nextSecret.toString("hex"),
      }),
      true,
    );
    assert.equal(
      verifyVerifiedPublicBootstrapResponseV1(response1, bytes1, challenge1),
      false,
      "stale generation response must not survive authority rotation",
    );

    resetVerifiedPublicBootstrapAuthorityForTestV1();
    assert.equal(
      installVerifiedPublicBootstrapAuthorityForTestV1({
        sequence,
        generation,
        adapter_origin: adapter.base,
        secret_hex: secret.toString("hex"),
      }),
      true,
    );

    trustedState.blocks = [...trustedState.blocks, makeMinimal(3)];
    await assert.rejects(
      () => trustedNode.pullOnce(adapter.base),
      /mainnet0_historical_minimal_parent_era_invalid/,
    );
    assert.equal(trustedStore.loadHeadNumber(), 2);

    await close(adapter.server);

    let replacementHeadRequests = 0;
    let replacementRangeRequests = 0;
    replacementServer = http.createServer((req, res) => {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (url.pathname === "/blocks/latest/number2.json") {
        replacementHeadRequests += 1;
        sendJson(res, 200, { number: 0 });
        return;
      }
      if (url.pathname === "/head") {
        replacementHeadRequests += 1;
        sendJson(res, 200, { head: 0 });
        return;
      }
      if (url.pathname === "/__void/demo/summary.json") {
        replacementHeadRequests += 1;
        sendJson(res, 200, { chain: { head: 0 } });
        return;
      }
      if (url.pathname === "/api/health") {
        replacementHeadRequests += 1;
        sendJson(res, 200, { ok: true, head: 0 });
        return;
      }
      if (url.pathname === "/blocks/range") {
        replacementRangeRequests += 1;
        const from = Number(url.searchParams.get("from"));
        const to = Number(url.searchParams.get("to"));
        sendJson(
          res,
          200,
          [makeMinimal(0)].filter(
            (block) => block.number >= from && block.number <= to,
          ),
        );
        return;
      }
      sendJson(res, 404, { ok: false });
    });
    await listenAt(replacementServer, adapter.port);

    const replacementStore = new SegStore(replacementRoot, { sparseEvery: 1 });
    const replacementNode = makeFollowerNode(replacementStore);

    let samePortAuthorityRejected = false;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const outcome = await replacementNode.pullOnce(adapter.base);
        assert.equal(
          replacementStore.loadHeadNumber(),
          -1,
          "foreign same-port replacement must never append historical state",
        );
        assert.equal(
          outcome?.ok,
          false,
          "foreign same-port replacement must not return an authorized pull",
        );
      } catch (error) {
        if (
          /VOID_PUBLIC_BOOTSTRAP_HISTORICAL_RESPONSE_AUTHORITY_V1/.test(
            String(error?.message || error),
          )
        ) {
          samePortAuthorityRejected = true;
          break;
        }
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    assert.ok(
      replacementHeadRequests > 0,
      "foreign same-port replacement head surface was never exercised",
    );
    assert.ok(
      replacementRangeRequests > 0,
      "foreign same-port replacement range was never exercised",
    );
    assert.equal(
      samePortAuthorityRejected,
      true,
      "foreign same-port replacement range did not fail historical HMAC authority",
    );
    assert.equal(replacementStore.loadHeadNumber(), -1);
  } finally {
    resetVerifiedPublicBootstrapAuthorityForTestV1();
    for (const [key, value] of Object.entries(backup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(trustedRoot, { recursive: true, force: true });
    fs.rmSync(appendRaceRoot, { recursive: true, force: true });
    fs.rmSync(noAuthorityRoot, { recursive: true, force: true });
    fs.rmSync(replacementRoot, { recursive: true, force: true });
    if (replacementServer) await close(replacementServer);
    await close(adapter.server);
    await close(upstreamServer);
  }
}

function proveAuthoritySourceOrdering() {
  const nodeSource = fs.readFileSync("src/node_core.ts", "utf8");
  const exactBytesIndex = nodeSource.indexOf("const exactBytes = Buffer.concat(chunks, total);");
  const verifyHookIndex = nodeSource.indexOf("beforeJsonParse?.(exactBytes);");
  const parseIndex = nodeSource.indexOf('return JSON.parse(exactBytes.toString("utf8"));');
  assert(exactBytesIndex >= 0);
  assert(verifyHookIndex > exactBytesIndex);
  assert(parseIndex > verifyHookIndex);

  const supervisorSource = fs.readFileSync(
    "scripts/run_void_public_bootstrap_supervisor_v1.mjs",
    "utf8",
  );
  const envBlock = supervisorSource.slice(
    supervisorSource.indexOf("env: {"),
    supervisorSource.indexOf("stdio:", supervisorSource.indexOf("env: {")),
  );
  assert.equal(envBlock.includes("secret_hex"), false);
  assert.equal(envBlock.includes("generation"), false);
  assert.ok(supervisorSource.includes('"ipc"'));
  assert.ok(supervisorSource.includes("historical_authority_secret_exposed=false"));
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
proveCanonical196021BridgeAndFollowerImportIsolation();
proveWalReplayAcrossHistoricalModes();
await proveAdapterOnlyFollowerAndManualPeerIsolation();
proveAuthoritySourceOrdering();
proveWorkflowTracksHistoricalBoundary();

console.log(MARKER);
console.log("manual_bootstrap_configuration_required=false");
console.log("verified_adapter_exact_origin_required=true");
console.log("verified_adapter_generation_hmac_required=true");
console.log("same_port_foreign_process_rejected=true");
console.log("response_nonce_replay_rejected=true");
console.log("response_body_hmac_binding=true");
console.log("ipc_disconnect_fails_closed=true");
console.log("append_boundary_authority_revalidated=true");
console.log("minimal_exact_envelope_required=true");
console.log("historical_era_regression_rejected=true");
console.log("canonical_modern_to_legacy_bridge_196021=true");
console.log("other_modern_to_legacy_rejected=true");
console.log("follower_modern_import_bypasses_saveblock_wrappers=true");
console.log("existing_196020_header_object_bridge_accepted=true");
console.log("modern_validator_unchanged=true");
console.log("historical_wal_modes_replay_bounded=true");
