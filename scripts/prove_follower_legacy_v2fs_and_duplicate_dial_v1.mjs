#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { EventEmitter, once } from "node:events";

import { computeRoots } from "../dist/chain/block.js";
import { SegStore } from "../dist/chain/seg_store.js";
import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  VOID_LEGACY_EMPTY_TX_ROOT_V1,
  validateLegacyCommitDirectV2fsForAppendV1,
  validateMainnet0HistoricalLegacyCommitDirectV2fsForAppendV1,
} from "../dist/chain/legacy_commit_direct_v2fs_v1.js";
import {
  followerLegacyV2fsOriginAuthorizedV1,
  followerLegacyV2fsOriginsFromRawV1,
} from "../dist/http/follower_legacy_v2fs_authority_v1.js";
import {
  authenticatedDuplicateConnectionIdV1,
  decideAuthenticatedDuplicateConnectionV1,
  preferredAuthenticatedDuplicateDirectionV1,
} from "../dist/p2p/authenticated_duplicate_arbitration_v1.js";
import {
  VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
  VOID_P2P_AUTHENTICATED_SESSION_STABLE_MS_V1,
  decideVoidP2PAuthenticatedReconnectV1,
} from "../dist/p2p/authenticated_reconnect_backoff_v1.js";
import { Node } from "../dist/node_core.js";

const MARKER = "VOID_FOLLOWER_LEGACY_V2FS_AND_DUPLICATE_DIAL_V1_PROOF_GREEN";

function tempRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `void-follower-legacy-${label}-`));
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

function makeHistoricalHeaderObjectLegacy(number, ts) {
  return {
    number,
    ts,
    txs: [],
    _commit: VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
    txRoot: VOID_LEGACY_EMPTY_TX_ROOT_V1,
    header: {
      txRoot: {
        root: VOID_LEGACY_EMPTY_TX_ROOT_V1,
        leaves: [],
      },
    },
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
  const historicalObjectB1 = makeHistoricalHeaderObjectLegacy(1, b1.ts);

  // Exact canonical Mainnet-0 block observed at the Nimo catch-up boundary.
  const canonical198195Parent = makeLegacy(198195);
  const canonical198196 = makeHistoricalHeaderObjectLegacy(
    198196,
    1776479414229,
  );
  assert.deepEqual(
    validateLegacyCommitDirectV2fsForAppendV1(
      canonical198196,
      canonical198195Parent,
    ),
    { ok: false, reason: "legacy_v2fs_invalid_header_tx_root" },
    "ordinary legacy validator unexpectedly admitted historical object form",
  );
  assert.deepEqual(
    validateMainnet0HistoricalLegacyCommitDirectV2fsForAppendV1(
      canonical198196,
      canonical198195Parent,
    ),
    { ok: true },
    "exact canonical Mainnet-0 #198196 historical object form was rejected",
  );

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

  const historicalObjectRoot = tempRoot("historical-header-object");
  try {
    const store = new SegStore(historicalObjectRoot, { sparseEvery: 1 });
    store.saveAuthorizedLegacyCommitDirectV2fs(b0);
    assert.throws(
      () => store.saveAuthorizedLegacyCommitDirectV2fs(historicalObjectB1),
      /invalid block: legacy_v2fs_invalid_header_tx_root/,
      "ordinary/manual legacy persistence admitted historical object form",
    );
    assert.equal(store.loadHeadNumber(), 0);
    assert.equal(store.loadBlock(1), null);

    store.saveAuthorizedMainnet0HistoricalLegacyV2fs(historicalObjectB1);
    assert.equal(store.loadHeadNumber(), 1);
    assert.deepEqual(store.loadBlock(1), historicalObjectB1);
  } finally {
    fs.rmSync(historicalObjectRoot, { recursive: true, force: true });
  }

  const malformedHistoricalObjects = [
    {
      label: "non-empty leaves",
      block: {
        ...historicalObjectB1,
        header: {
          txRoot: {
            root: VOID_LEGACY_EMPTY_TX_ROOT_V1,
            leaves: ["11".repeat(32)],
          },
        },
      },
    },
    {
      label: "root mismatch",
      block: {
        ...historicalObjectB1,
        header: {
          txRoot: {
            root: "11".repeat(32),
            leaves: [],
          },
        },
      },
    },
    {
      label: "extra object key",
      block: {
        ...historicalObjectB1,
        header: {
          txRoot: {
            root: VOID_LEGACY_EMPTY_TX_ROOT_V1,
            leaves: [],
            extra: true,
          },
        },
      },
    },
    {
      label: "non-empty tx object form",
      block: {
        ...makeLegacy(
          1,
          [{ hash: "22".repeat(32), body: { proof: "non-empty-object" } }],
        ),
        header: {
          txRoot: {
            root: computeRoots(
              [{ hash: "22".repeat(32), body: { proof: "non-empty-object" } }],
              [],
            ).txRoot,
            leaves: [],
          },
        },
      },
    },
  ];
  for (const { label, block } of malformedHistoricalObjects) {
    assert.equal(
      validateMainnet0HistoricalLegacyCommitDirectV2fsForAppendV1(
        block,
        b0,
      ).ok,
      false,
      `${label} crossed historical legacy object boundary`,
    );
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

  const challengeA = "1".repeat(64);
  const challengeB = "2".repeat(64);
  const challengeC = "3".repeat(64);
  const challengeD = "4".repeat(64);
  const connectionA =
    authenticatedDuplicateConnectionIdV1(challengeA, challengeB);
  const connectionB =
    authenticatedDuplicateConnectionIdV1(challengeC, challengeD);
  assert.equal(
    connectionA,
    authenticatedDuplicateConnectionIdV1(challengeB, challengeA),
    "connection identity must be symmetric across endpoints",
  );
  assert.notEqual(connectionA, connectionB);

  const expectedSameDirectionWinner =
    [connectionA, connectionB].sort()[0];
  const lowerEndpoint = decideAuthenticatedDuplicateConnectionV1(
    low,
    high,
    {
      direction: "outbound",
      connection_id: connectionA,
    },
    {
      direction: "outbound",
      connection_id: connectionB,
    },
  );
  const higherEndpoint = decideAuthenticatedDuplicateConnectionV1(
    high,
    low,
    {
      direction: "inbound",
      connection_id: connectionB,
    },
    {
      direction: "inbound",
      connection_id: connectionA,
    },
  );
  assert.equal(
    lowerEndpoint.winning_connection_id,
    expectedSameDirectionWinner,
  );
  assert.equal(
    higherEndpoint.winning_connection_id,
    expectedSameDirectionWinner,
    "opposite authentication order selected different physical sockets",
  );

  const lowerOpposite = decideAuthenticatedDuplicateConnectionV1(
    low,
    high,
    {
      direction: "inbound",
      connection_id: connectionA,
    },
    {
      direction: "outbound",
      connection_id: connectionB,
    },
  );
  const higherOpposite = decideAuthenticatedDuplicateConnectionV1(
    high,
    low,
    {
      direction: "outbound",
      connection_id: connectionA,
    },
    {
      direction: "inbound",
      connection_id: connectionB,
    },
  );
  assert.equal(lowerOpposite.winning_connection_id, connectionB);
  assert.equal(higherOpposite.winning_connection_id, connectionB);

  const collision = decideAuthenticatedDuplicateConnectionV1(
    low,
    high,
    {
      direction: "outbound",
      connection_id: connectionA,
    },
    {
      direction: "outbound",
      connection_id: connectionA,
    },
  );
  assert.equal(collision.winner, "existing");
  assert.equal(collision.reason, "same_connection_identity");
  assert.throws(
    () => authenticatedDuplicateConnectionIdV1("not-a-challenge", challengeB),
    /invalid local challenge/,
  );
}

function proveAuthenticatedReconnectBackoff() {
  let previousBackoffMs;
  const observedDelays = [];
  for (let index = 0; index < 7; index += 1) {
    const decision = decideVoidP2PAuthenticatedReconnectV1({
      previousBackoffMs,
      authenticatedDurationMs: 1,
    });
    observedDelays.push(decision.delay_ms);
    previousBackoffMs = decision.next_backoff_ms;
    assert.equal(decision.stable_authenticated_session, false);
    assert.equal(decision.authenticated_duration_valid, true);
  }
  assert.deepEqual(
    observedDelays,
    [500, 1_000, 2_000, 4_000, 8_000, 15_000, 15_000],
    "short authenticated sessions reset or escaped bounded backoff",
  );

  const stable = decideVoidP2PAuthenticatedReconnectV1({
    previousBackoffMs:
      VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
    authenticatedDurationMs:
      VOID_P2P_AUTHENTICATED_SESSION_STABLE_MS_V1,
  });
  assert.equal(stable.stable_authenticated_session, true);
  assert.equal(stable.delay_ms, 500);
  assert.equal(stable.next_backoff_ms, 1_000);

  const justShort = decideVoidP2PAuthenticatedReconnectV1({
    previousBackoffMs:
      VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
    authenticatedDurationMs:
      VOID_P2P_AUTHENTICATED_SESSION_STABLE_MS_V1 - 1,
  });
  assert.equal(justShort.stable_authenticated_session, false);
  assert.equal(
    justShort.delay_ms,
    VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
  );

  for (const malformed of [
    undefined,
    -1,
    Number.NaN,
    Infinity,
    "30000",
  ]) {
    const corruptInternalState =
      decideVoidP2PAuthenticatedReconnectV1({
        previousBackoffMs: undefined,
        authenticatedDurationMs: malformed,
      });
    assert.equal(
      corruptInternalState.authenticated_duration_valid,
      false,
    );
    assert.equal(
      corruptInternalState.delay_ms,
      VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
      "invalid monotonic evidence failed slow boundary",
    );
  }

  const originalDateNow = Date.now;
  try {
    for (const wallClock of [9_999_999_999_999, 0]) {
      Date.now = () => wallClock;
      const short = decideVoidP2PAuthenticatedReconnectV1({
        previousBackoffMs:
          VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
        authenticatedDurationMs: 1,
      });
      assert.equal(short.stable_authenticated_session, false);
      assert.equal(
        short.delay_ms,
        VOID_P2P_AUTHENTICATED_RECONNECT_MAX_BACKOFF_MS_V1,
      );
    }
  } finally {
    Date.now = originalDateNow;
  }

  const nodeSource = fs.readFileSync("src/node_core.ts", "utf8");
  assert.ok(
    nodeSource.includes("decideVoidP2PAuthenticatedReconnectV1"),
    "Node runtime does not use authenticated reconnect decision",
  );
  assert.ok(
    nodeSource.includes("decideAuthenticatedDuplicateConnectionV1"),
    "Node runtime does not use deterministic duplicate connection identity",
  );
  assert.equal(
    nodeSource.includes("this.backoff.delete(peer.reconnectAddr)"),
    false,
    "authentication still clears reconnect backoff before stability",
  );
  assert.ok(
    nodeSource.includes(
      'import { performance } from "node:perf_hooks";',
    ),
    "runtime does not import a monotonic process clock",
  );
  assert.ok(
    nodeSource.includes(
      "peer.authenticatedAtMonotonicMs = performance.now()",
    ),
    "authenticated admission is not monotonic",
  );
  assert.ok(
    nodeSource.includes(
      "const closedAtMonotonicMs = performance.now()",
    ),
    "authenticated close is not monotonic",
  );
  assert.equal(
    nodeSource.includes("peer.authenticatedAtMs = Date.now()"),
    false,
    "wall clock still controls authenticated stability",
  );
}

class DuplicateFixtureSocket {
  constructor(label) {
    this.label = label;
    this.events = new EventEmitter();
    this.destroyed = false;
    this.writableLength = 0;
    this.localAddress = "127.0.0.1";
    this.localPort = 40_000;
    this.remoteAddress = "127.0.0.1";
    this.remotePort = 4_701;
    this.writes = [];
  }

  on(event, listener) {
    this.events.on(event, listener);
    return this;
  }

  write(data) {
    if (this.destroyed) return false;
    this.writes.push(Buffer.from(data));
    return true;
  }

  destroy(error) {
    if (this.destroyed) return this;
    this.destroyed = true;
    queueMicrotask(() => {
      if (error) this.events.emit("error", error);
      this.events.emit("close");
    });
    return this;
  }
}

function duplicateFixtureKeypair() {
  const { privateKey, publicKey } =
    crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const nodeId = crypto
    .createHash("sha256")
    .update(pubPEM)
    .digest("hex")
    .slice(0, 32);
  return { privateKey, publicKey, nodeId, pubPEM };
}

function duplicateFixtureAuth(remote, selfChallenge) {
  return {
    type: "AUTH",
    id: remote.nodeId,
    listen: ["127.0.0.1:4701"],
    proto: 2,
    pubkey: remote.pubPEM,
    challenge: "a".repeat(64),
    self_challenge: selfChallenge,
    sig: "b".repeat(128),
  };
}

function peerForFixtureSocket(node, socket) {
  return [...node.peers.values()].find(
    (peer) => peer.socket === socket,
  );
}

async function settleDuplicateFixtureClose() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

async function proveAuthenticatedDuplicateRuntimeGeneration() {
  const root = tempRoot("authenticated-duplicate-generation");
  const priorDataDir = process.env.DATA_DIR;

  try {
    process.env.DATA_DIR = root;
    const local = duplicateFixtureKeypair();
    const remote = duplicateFixtureKeypair();
    const node = new Node(0, local);
    node.listenAddrs.push("127.0.0.1:4700");

    const cleanupCalls = [];
    const originalHandlePeerTransportClose =
      node.handlePeerTransportClose;
    node.handlePeerTransportClose = function (peer) {
      cleanupCalls.push({
        peer_id: peer.id,
        connection_id: peer.authenticatedConnectionId ?? null,
        current_route: this.peers.get(peer.id) === peer,
      });
      return originalHandlePeerTransportClose.call(this, peer);
    };

    const pairs = [
      ["1".repeat(64), "2".repeat(64)],
      ["3".repeat(64), "4".repeat(64)],
    ]
      .map(([localChallenge, remoteChallenge]) => ({
        localChallenge,
        remoteChallenge,
        connectionId: authenticatedDuplicateConnectionIdV1(
          localChallenge,
          remoteChallenge,
        ),
      }))
      .sort((a, b) =>
        a.connectionId.localeCompare(b.connectionId),
      );

    const candidatePair = pairs[0];
    const existingPair = pairs[1];
    assert.ok(
      candidatePair.connectionId < existingPair.connectionId,
      "fixture did not create a deterministic replacement",
    );

    const existingSocket =
      new DuplicateFixtureSocket("existing-higher-id");
    node.attachSocket(
      existingSocket,
      "127.0.0.1:4701",
      true,
      remote.nodeId,
      "127.0.0.1:4701",
    );
    const existingPeer =
      peerForFixtureSocket(node, existingSocket);
    assert.ok(existingPeer, "existing fixture peer missing");
    existingPeer.localChallenge = existingPair.localChallenge;
    assert.equal(
      node.finishAuthenticatedPeer(
        existingPeer,
        duplicateFixtureAuth(
          remote,
          existingPair.remoteChallenge,
        ),
      ),
      true,
    );

    const candidateSocket =
      new DuplicateFixtureSocket("candidate-lower-id");
    node.attachSocket(
      candidateSocket,
      "127.0.0.1:4701",
      true,
      remote.nodeId,
      "127.0.0.1:4701",
    );
    const candidatePeer =
      peerForFixtureSocket(node, candidateSocket);
    assert.ok(candidatePeer, "candidate fixture peer missing");
    candidatePeer.localChallenge = candidatePair.localChallenge;
    assert.equal(
      node.finishAuthenticatedPeer(
        candidatePeer,
        duplicateFixtureAuth(
          remote,
          candidatePair.remoteChallenge,
        ),
      ),
      true,
    );

    await settleDuplicateFixtureClose();

    assert.equal(existingSocket.destroyed, true);
    assert.equal(candidateSocket.destroyed, false);
    assert.equal(
      node.peers.get(remote.nodeId),
      candidatePeer,
      "deterministic duplicate winner was not retained",
    );
    assert.equal(
      candidatePeer.authenticatedConnectionId,
      candidatePair.connectionId,
    );
    assert.deepEqual(
      cleanupCalls,
      [],
      "stale displaced direct close erased surviving peer identity state",
    );

    const nodeSource = fs.readFileSync("src/node_core.ts", "utf8");
    assert.ok(
      nodeSource.includes(
        "VOID_P2P_AUTHENTICATED_DUPLICATE_STALE_CLOSE_V1_IGNORED",
      ),
      "stale authenticated close visibility marker missing",
    );
    assert.ok(
      nodeSource.includes(
        'peer.transport === "relay" || closedNormalRoute',
      ),
      "close cleanup is not bound to the current direct route generation",
    );

    node.handlePeerTransportClose =
      originalHandlePeerTransportClose;
    candidatePeer.suppressReconnect = true;
    candidateSocket.destroy();
    await settleDuplicateFixtureClose();
  } finally {
    if (priorDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = priorDataDir;
    fs.rmSync(root, { recursive: true, force: true });
  }
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
    saveAuthorizedMainnet0HistoricalLegacyV2fs: (block) => {
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

    // Manual legacy-origin authority remains strict string-only. The structured
    // old-writer header is available only after verified public-bootstrap HMAC.
    servedBlocks = [makeHistoricalHeaderObjectLegacy(0, 1776479414229)];
    const manualObject = createFollowerFixture();
    const manualObjectResult = await manualObject.node.pullOnce(origin);
    assert.equal(manualObjectResult.ok, false);
    assert.equal(manualObjectResult.invalidBlock, 0);
    assert.equal(
      manualObjectResult.invalidReason,
      "legacy_v2fs_invalid_header_tx_root",
    );
    assert.equal(manualObject.state.legacyWrites, 0);
    assert.equal(manualObject.state.modernWrites, 0);
    assert.equal(manualObject.state.head, -1);
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
    "src/types/p2p.ts",
    "src/p2p/auth_v1.ts",
    "src/p2p/authenticated_duplicate_arbitration_v1.ts",
    "src/p2p/authenticated_reconnect_backoff_v1.ts",
    "src/node_core.ts",
  ]) {
    assert.ok(workflow.includes(file), `workflow missing dependency ${file}`);
  }
  assert.ok(
    workflow.includes("node scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs"),
    "workflow does not execute focused legacy/dial proof",
  );
  assert.ok(
    workflow.includes("actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803"),
    "bootstrap workflow checkout action is not immutable",
  );
  assert.ok(
    workflow.includes("actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38"),
    "bootstrap workflow setup-node action is not immutable",
  );
  assert.equal(
    workflow.includes("grep -F 'preferredAuthenticatedDuplicateDirectionV1' dist/node_core.js"),
    false,
    "bootstrap workflow still asserts the retired compiled duplicate symbol",
  );
  for (const marker of [
    "decideAuthenticatedDuplicateConnectionV1",
    "decideVoidP2PAuthenticatedReconnectV1",
    "VOID_P2P_AUTHENTICATED_DUPLICATE_STALE_CLOSE_V1_IGNORED",
  ]) {
    assert.ok(
      workflow.includes(marker),
      `bootstrap compiled boundary missing ${marker}`,
    );
  }
}

function proveAuthenticatedReconnectWorkflowTracksDependencies() {
  const workflow = fs.readFileSync(
    ".github/workflows/void-p2p-authenticated-reconnect-stability-v1.yml",
    "utf8",
  );
  const dependencies = [
    ".github/workflows/void-p2p-authenticated-reconnect-stability-v1.yml",
    "scripts/prove_p2p_authenticated_duplicate_runtime_lifecycle_v1.mjs",
    "scripts/ci_diff_hygiene_v1.sh",
    "scripts/prove_ci_diff_hygiene_v1.mjs",
    "scripts/copy_void_runtime_js_v1.mjs",
    "scripts/retire_saveblock_periodic_rewriters_v1.mjs",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.build.json",
    "src/wal/wal_v1.js",
    "src/node_core.ts",
    "src/types/p2p.ts",
    "src/p2p/auth_v1.ts",
    "src/p2p/authenticated_duplicate_arbitration_v1.ts",
    "src/p2p/authenticated_reconnect_backoff_v1.ts",
  ];
  for (const file of dependencies) {
    const occurrenceCount =
      workflow.split(`- "${file}"`).length - 1;
    assert.equal(
      occurrenceCount,
      2,
      `reconnect workflow dependency scope mismatch ${file}`,
    );
  }
  assert.ok(
    workflow.includes(
      "node scripts/prove_p2p_authenticated_duplicate_runtime_lifecycle_v1.mjs",
    ),
    "reconnect workflow does not execute focused runtime proof",
  );
  assert.equal(
    workflow.includes(
      "node scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs",
    ),
    false,
    "reconnect workflow still executes broad follower proof",
  );
  assert.ok(
    workflow.includes("node scripts/prove_ci_diff_hygiene_v1.mjs"),
    "shared diff-hygiene proof is missing",
  );
  assert.ok(
    workflow.includes("bash scripts/ci_diff_hygiene_v1.sh"),
    "committed-range diff hygiene is missing",
  );
  for (const major of ["22", "24", "26"]) {
    assert.ok(
      workflow.includes(major),
      `reconnect workflow does not cover Node ${major}`,
    );
  }
  assert.ok(
    workflow.includes(
      "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
    ),
    "reconnect workflow checkout action is not immutable",
  );
  assert.ok(
    workflow.includes(
      "actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38",
    ),
    "reconnect workflow setup-node action is not immutable",
  );
}

proveLegacyEnvelopeAndStore();
proveOriginAuthority();
proveDuplicateArbitration();
proveAuthenticatedReconnectBackoff();
await proveAuthenticatedDuplicateRuntimeGeneration();
await provePullOnceOriginGateAndLegacyTimestamp();
proveFocusedWorkflowTracksDependencies();
proveAuthenticatedReconnectWorkflowTracksDependencies();

console.log(MARKER);
console.log("modern_validator_unchanged=true");
console.log("legacy_exact_envelope=true");
console.log("wrong_legacy_marker_falls_through_modern=false");
console.log("legacy_origin_default_off=true");
console.log("legacy_wal_authority_tagged=true");
console.log("legacy_receipt_timestamp_uses_ts=true");
console.log("mainnet0_198196_historical_header_txroot_object=true");
console.log("historical_header_txroot_object_exact_shape_only=true");
console.log("manual_legacy_header_txroot_object_rejected=true");
console.log("ordinary_legacy_header_txroot_object_rejected=true");
console.log("simultaneous_dial_direction_deterministic=true");
console.log("same_direction_duplicate_connection_deterministic=true");
console.log("authenticated_reconnect_backoff_requires_stability=true");
console.log("premature_authenticated_backoff_reset_removed=true");
console.log("authenticated_stability_clock=monotonic");
console.log("wall_clock_jumps_cannot_reset_backoff=true");
console.log("malformed_monotonic_duration_fails_slow=true");
console.log("stale_authenticated_duplicate_close_generation_ignored=true");
console.log("runtime_duplicate_replacement_preserves_survivor_state=true");
