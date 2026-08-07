// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  VOID_P2P_VERIFIED_PEER_CACHE_TTL_MS_V1,
  loadVoidVerifiedPeerCacheV1,
  voidVerifiedPeerCachePathV1,
  writeVoidVerifiedPeerCacheV1,
} from "../src/p2p/verified_peer_cache_v1.js";

const MARKER = "VOID_P2P_VERIFIED_PEER_CACHE_RECONNECT_V1_PROOF_GREEN";

type TestKeypair = {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;
  pubPEM: string;
};

function keypair(): TestKeypair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, nodeId, pubPEM };
}

async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 7_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function reserveClosedPort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert(address && typeof address === "object");
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

function setNodeEnv(dataDir: string, bootstrap = ""): void {
  process.env.DATA_DIR = dataDir;
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  process.env.BOOTSTRAP_ADDRS = bootstrap;
}

function cacheRecord(
  nodeId: string,
  address: string,
  lastAuthenticatedAtMs = Date.now(),
) {
  return Object.freeze({
    node_id: nodeId,
    addresses: Object.freeze([address]),
    last_authenticated_at_ms: lastAuthenticatedAtMs,
  });
}

function cacheSnapshot(dataDir: string) {
  return loadVoidVerifiedPeerCacheV1(
    voidVerifiedPeerCachePathV1(dataDir),
  );
}

function stopQuietly(node: Node | undefined): void {
  if (!node) return;
  try {
    node.stop();
  } catch {}
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-p2p-verified-peer-cache-reconnect-v1-"),
);

let target: Node | undefined;
let client: Node | undefined;
let restartedClient: Node | undefined;
let impostor: Node | undefined;
let mismatchClient: Node | undefined;
let corruptClient: Node | undefined;
let multipathClient: Node | undefined;

try {
  const targetDir = path.join(root, "target");
  const clientDir = path.join(root, "client");
  const targetKeys = keypair();
  const clientKeys = keypair();
  assert.match(targetKeys.nodeId, /^[0-9a-f]{32}$/);
  assert.match(clientKeys.nodeId, /^[0-9a-f]{32}$/);

  const targetPort = await reserveClosedPort();
  setNodeEnv(targetDir, "");
  target = new Node(targetPort, targetKeys);
  await target.start();
  const targetAddress = target.listenAddrs[0];
  assert(targetAddress);

  setNodeEnv(clientDir, targetAddress);
  client = new Node(0, clientKeys);
  await client.start();

  await waitFor(
    () =>
      client!.peersSnapshot().connected.some((peer) => peer.id === targetKeys.nodeId) &&
      target!.peersSnapshot().connected.some((peer) => peer.id === clientKeys.nodeId),
    "initial authenticated connection",
  );

  const firstCache = cacheSnapshot(clientDir);
  assert.equal(firstCache.valid, true, firstCache.reason);
  const targetRecord = firstCache.records.find(
    (record) => record.node_id === targetKeys.nodeId,
  );
  assert(targetRecord);
  assert.deepEqual(targetRecord.addresses, [targetAddress]);

  // Third-party PEERS may cause an in-memory dial, but the advertised address
  // itself must never become durable state unless that remote later AUTHs and
  // supplies it in its own signed listen set.
  const thirdPartyPort = await reserveClosedPort();
  const thirdPartyAddress = `127.0.0.1:${thirdPartyPort}`;
  const authenticatedTargetPeer = client.peers.get(targetKeys.nodeId);
  assert(authenticatedTargetPeer?.handshakeDone);
  (client as any).onMsg(authenticatedTargetPeer, {
    type: "PEERS",
    addrs: [thirdPartyAddress],
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const cacheAfterPeers = cacheSnapshot(clientDir);
  assert.equal(cacheAfterPeers.valid, true, cacheAfterPeers.reason);
  assert(
    cacheAfterPeers.records.every(
      (record) => !record.addresses.includes(thirdPartyAddress),
    ),
  );

  // Stop only the client. The target remains alive. Recreate the client from
  // the same identity + DATA_DIR with no bootstrap addresses at all.
  client.stop();
  client = undefined;
  await new Promise((resolve) => setTimeout(resolve, 100));

  setNodeEnv(clientDir, "");
  restartedClient = new Node(0, clientKeys);
  await restartedClient.start();

  await waitFor(
    () => restartedClient!.peersSnapshot().connected.some(
      (peer) => peer.id === targetKeys.nodeId,
    ),
    "cache-only restart reconnect",
  );

  assert.equal(process.env.BOOTSTRAP_ADDRS, "");

  // Identity pinning: cache an address while claiming it belongs to target A,
  // then put a different authenticated identity at that address. The client
  // must reject it rather than silently rebinding durable trust.
  const impostorDir = path.join(root, "impostor");
  const mismatchDir = path.join(root, "mismatch-client");
  const impostorKeys = keypair();
  setNodeEnv(impostorDir, "");
  impostor = new Node(0, impostorKeys);
  await impostor.start();
  const impostorAddress = impostor.listenAddrs[0];

  fs.mkdirSync(path.dirname(voidVerifiedPeerCachePathV1(mismatchDir)), {
    recursive: true,
    mode: 0o700,
  });
  writeVoidVerifiedPeerCacheV1(
    voidVerifiedPeerCachePathV1(mismatchDir),
    [cacheRecord(targetKeys.nodeId, impostorAddress)],
  );

  const mismatchKeys = keypair();
  setNodeEnv(mismatchDir, "");
  mismatchClient = new Node(0, mismatchKeys);
  await mismatchClient.start();
  await new Promise((resolve) => setTimeout(resolve, 750));

  assert.equal(
    mismatchClient.peersSnapshot().connected.some(
      (peer) => peer.id === impostorKeys.nodeId,
    ),
    false,
  );
  const mismatchCache = cacheSnapshot(mismatchDir);
  assert.equal(mismatchCache.valid, true, mismatchCache.reason);
  assert.equal(mismatchCache.records[0]?.node_id, targetKeys.nodeId);

  // Corrupt cache documents fail closed and are never repaired by startup.
  const corruptDir = path.join(root, "corrupt-client");
  const corruptPath = voidVerifiedPeerCachePathV1(corruptDir);
  fs.mkdirSync(path.dirname(corruptPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(corruptPath, "{not-json\n", { mode: 0o600 });
  assert.equal(loadVoidVerifiedPeerCacheV1(corruptPath).valid, false);

  setNodeEnv(corruptDir, "");
  corruptClient = new Node(0, keypair());
  await corruptClient.start();
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(corruptClient.peersSnapshot().connected.length, 0);
  assert.equal(fs.readFileSync(corruptPath, "utf8"), "{not-json\n");

  // Stale entries are structurally valid but produce no dial targets.
  const staleDir = path.join(root, "stale");
  const stalePath = voidVerifiedPeerCachePathV1(staleDir);
  fs.mkdirSync(path.dirname(stalePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    stalePath,
    JSON.stringify({
      version: 1,
      peers: [
        {
          node_id: targetKeys.nodeId,
          addresses: [targetAddress],
          last_authenticated_at_ms:
            Date.now() - VOID_P2P_VERIFIED_PEER_CACHE_TTL_MS_V1 - 1,
        },
      ],
    }) + "\n",
    { mode: 0o600 },
  );
  const stale = loadVoidVerifiedPeerCacheV1(stalePath);
  assert.equal(stale.valid, true, stale.reason);
  assert.equal(stale.records.length, 0);

  // Symlink cache files are invalid and never followed.
  const symlinkDir = path.join(root, "symlink");
  const symlinkPath = voidVerifiedPeerCachePathV1(symlinkDir);
  fs.mkdirSync(path.dirname(symlinkPath), { recursive: true, mode: 0o700 });
  const symlinkTarget = path.join(root, "symlink-target.json");
  fs.writeFileSync(symlinkTarget, JSON.stringify({ version: 1, peers: [] }) + "\n");
  fs.symlinkSync(symlinkTarget, symlinkPath);
  assert.equal(loadVoidVerifiedPeerCacheV1(symlinkPath).valid, false);

  // Multiple cached peers remain independent: one dead cached target cannot
  // block the healthy authenticated target from reconnecting.
  const multipathDir = path.join(root, "multipath-cache-client");
  const deadPort = await reserveClosedPort();
  const deadAddress = `127.0.0.1:${deadPort}`;
  const deadNodeId = "f".repeat(32);
  writeVoidVerifiedPeerCacheV1(
    voidVerifiedPeerCachePathV1(multipathDir),
    [
      cacheRecord(deadNodeId, deadAddress, Date.now()),
      cacheRecord(targetKeys.nodeId, targetAddress, Date.now() - 1),
    ],
  );

  setNodeEnv(multipathDir, "");
  multipathClient = new Node(0, keypair());
  await multipathClient.start();
  await waitFor(
    () => multipathClient!.peersSnapshot().connected.some(
      (peer) => peer.id === targetKeys.nodeId,
    ),
    "healthy cached peer with dead sibling",
  );

  console.log("[PASS] only directly authenticated listen state enters durable cache");
  console.log("[PASS] third-party PEERS advertisement itself is not persisted");
  console.log("[PASS] restart reconnects with empty BOOTSTRAP_ADDRS");
  console.log("[PASS] cached reconnect is pinned to authenticated node identity");
  console.log("[PASS] corrupt and symlink cache state fails closed");
  console.log("[PASS] stale cache records do not become dial targets");
  console.log("[PASS] dead cached peer does not block a healthy cached sibling");

  console.log(MARKER);
  console.log("authenticated_peer_only_persistence=true");
  console.log("third_party_peers_persisted=false");
  console.log("restart_without_bootstrap_reconnected=true");
  console.log("cached_identity_mismatch_accepted=false");
  console.log("corrupt_cache_dialed=false");
  console.log("symlink_cache_followed=false");
  console.log("stale_cache_dialed=false");
  console.log("multiple_cached_peers_independent=true");
  console.log("single_required_seed=false");
  console.log("cloud_provider_dependency=false");
  console.log("dns_provider_dependency=false");
  console.log("tailnet_dependency=false");
  console.log("deployment_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  stopQuietly(multipathClient);
  stopQuietly(corruptClient);
  stopQuietly(mismatchClient);
  stopQuietly(impostor);
  stopQuietly(restartedClient);
  stopQuietly(client);
  stopQuietly(target);

  delete process.env.BOOTSTRAP_ADDRS;
  delete process.env.P2P_BIND_HOST;
  delete process.env.P2P_ADVERTISE_HOST;
  delete process.env.DATA_DIR;

  await new Promise((resolve) => setTimeout(resolve, 100));
  fs.rmSync(root, { recursive: true, force: true });
}
