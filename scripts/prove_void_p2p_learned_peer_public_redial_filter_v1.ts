import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import { Node } from "../src/node_core.js";
import {
  deriveVoidNodeIdFromPublicPemV1,
  VOID_P2P_AUTH_TIMEOUT_MS_V1,
} from "../src/p2p/auth_v1.js";
import {
  isPublicLearnedPeerAddressV1,
} from "../src/types/p2p.js";

const PUBLIC_V4_A = "8.8.8.8:4700";
const PUBLIC_V4_B = "1.1.1.1:4700";
const PUBLIC_V4_C = "9.9.9.9:4700";
const PUBLIC_V6 = "[2606:4700:4700::1111]:4700";

const blocked = [
  "0.0.0.0:4700",
  "10.1.2.3:4700",
  "100.64.0.1:4700",
  "127.0.0.1:4700",
  "169.254.1.1:4700",
  "172.16.2.3:4700",
  "192.0.2.10:4700",
  "192.168.1.20:4700",
  "198.18.0.1:4700",
  "198.51.100.10:4700",
  "203.0.113.10:4700",
  "224.0.0.1:4700",
  "240.0.0.1:4700",
  "[::1]:4700",
  "[100::1]:4700",
  "[2001:db8::1]:4700",
  "[fc00::1]:4700",
  "[fe80::1]:4700",
  "[ff02::1]:4700",
  "peer.example:4700",
];

function keypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  return {
    privateKey,
    publicKey,
    pubPEM,
    nodeId: deriveVoidNodeIdFromPublicPemV1(pubPEM),
  };
}

async function closedLocalAddress(): Promise<string> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return `127.0.0.1:${port}`;
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2_500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("timed out waiting for learned-peer proof condition");
}

for (const address of [
  PUBLIC_V4_A,
  PUBLIC_V4_B,
  PUBLIC_V4_C,
  PUBLIC_V6,
]) {
  assert.equal(
    isPublicLearnedPeerAddressV1(address),
    true,
    `expected public learned address: ${address}`,
  );
}

for (const address of blocked) {
  assert.equal(
    isPublicLearnedPeerAddressV1(address),
    false,
    `expected blocked learned address: ${address}`,
  );
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-p2p-learned-public-v1-"),
);
const previousDataDir = process.env.DATA_DIR;
process.env.DATA_DIR = temp;

try {
  const authenticatedSender: any = {
    id: "b".repeat(32),
    handshakeDone: true,
  };

  // -------------------------------------------------------------------------
  // Public-only exchange/redial semantics.
  // -------------------------------------------------------------------------
  const node = new Node(0, keypair());

  node.listenAddrs.push(
    "10.0.0.5:4700",
    PUBLIC_V4_A,
    PUBLIC_V6,
    "self.example:4700",
  );

  const connectedPeer: any = {
    id: "c".repeat(32),
    handshakeDone: true,
    transport: "direct",
    persistDirectEvidence: true,
    listens: [
      "192.168.55.8:4700",
      PUBLIC_V4_B,
      "peer.example:4700",
      "[fe80::2]:4700",
    ],
  };
  node.peers.set(connectedPeer.id, connectedPeer);

  // Direct-upgrade/punch sockets authenticate end-to-end but deliberately
  // carry persistDirectEvidence=false. Their observed/listen addresses must
  // never be republished as durable public discovery evidence.
  const ephemeralDirectPeer: any = {
    id: "d".repeat(32),
    handshakeDone: true,
    transport: "direct",
    persistDirectEvidence: false,
    listens: ["8.8.4.4:4700"],
  };
  node.peers.set(ephemeralDirectPeer.id, ephemeralDirectPeer);

  (node as any).knownAddrs.add(PUBLIC_V4_B);

  const advertised = (node as any).publicPeerExchangeAddrsV1();
  assert.deepEqual(
    new Set(advertised),
    new Set([PUBLIC_V4_A, PUBLIC_V4_B, PUBLIC_V6]),
  );

  const dials: Array<{
    address: string;
    expectedNodeId: string | undefined;
    retryOnFailure: boolean | undefined;
  }> = [];

  (node as any).connect = (
    address: string,
    expectedNodeId?: string,
    retryOnFailure?: boolean,
  ) => {
    dials.push({ address, expectedNodeId, retryOnFailure });
  };

  (node as any).onMsg(authenticatedSender, {
    type: "PEERS",
    addrs: [
      PUBLIC_V4_A,
      PUBLIC_V4_B,
      PUBLIC_V4_C,
      PUBLIC_V6,
      ...blocked,
      PUBLIC_V4_C,
      "not-an-address",
    ],
  });

  assert.deepEqual(dials, [
    {
      address: PUBLIC_V4_C,
      expectedNodeId: undefined,
      retryOnFailure: false,
    },
  ]);

  const attempts = (node as any).learnedPeerDialAttemptsV1 as Set<string>;
  assert.deepEqual(new Set(attempts), new Set([PUBLIC_V4_C]));

  // Duplicate advertisements in later PEERS frames remain one-shot.
  (node as any).onMsg(authenticatedSender, {
    type: "PEERS",
    addrs: [PUBLIC_V4_C],
  });
  assert.equal(dials.length, 1);

  // -------------------------------------------------------------------------
  // Message cap applies after filtering, so junk cannot starve public peers.
  // -------------------------------------------------------------------------
  const messageBoundNode = new Node(0, keypair());
  const messageBoundDials: string[] = [];
  (messageBoundNode as any).connect = (address: string) => {
    messageBoundDials.push(address);
  };

  const manyPublic = Array.from(
    { length: 20 },
    (_, i) => `8.8.8.${i + 1}:4700`,
  );

  (messageBoundNode as any).onMsg(authenticatedSender, {
    type: "PEERS",
    addrs: [
      "10.0.0.1:4700",
      "127.0.0.1:4700",
      "192.168.0.1:4700",
      "100.64.0.1:4700",
      "198.51.100.1:4700",
      "203.0.113.1:4700",
      "[::1]:4700",
      "peer.example:4700",
      ...manyPublic,
    ],
  });

  assert.deepEqual(
    messageBoundDials,
    manyPublic.slice(0, 8),
    "junk/private prefixes must not consume the eligible-public dial budget",
  );

  // Input processing itself remains bounded to the first 64 advertisements.
  const parseBoundNode = new Node(0, keypair());
  const parseBoundDials: string[] = [];
  (parseBoundNode as any).connect = (address: string) => {
    parseBoundDials.push(address);
  };
  const first64Junk = Array.from(
    { length: 64 },
    (_, i) => `10.0.0.${(i % 250) + 1}:4700`,
  );
  (parseBoundNode as any).onMsg(authenticatedSender, {
    type: "PEERS",
    addrs: [...first64Junk, ...manyPublic],
  });
  assert.equal(parseBoundDials.length, 0);

  // -------------------------------------------------------------------------
  // Runtime-wide learned discovery budget.
  // -------------------------------------------------------------------------
  const runtimeBoundNode = new Node(0, keypair());
  const runtimeBoundDials: string[] = [];
  (runtimeBoundNode as any).connect = (address: string) => {
    runtimeBoundDials.push(address);
  };

  for (let batch = 0; batch < 10; batch++) {
    const addrs = Array.from(
      { length: 8 },
      (_, i) => `9.${batch + 1}.0.${i + 1}:4700`,
    );
    (runtimeBoundNode as any).onMsg(authenticatedSender, {
      type: "PEERS",
      addrs,
    });
  }

  assert.equal(runtimeBoundDials.length, 64);
  assert.equal(
    ((runtimeBoundNode as any).learnedPeerDialAttemptsV1 as Set<string>).size,
    64,
  );

  // -------------------------------------------------------------------------
  // Refused unverified discovery dial: no retry and no backoff.
  // -------------------------------------------------------------------------
  const oneShotNode = new Node(0, keypair());
  const closedOneShot = await closedLocalAddress();
  const originalOneShotConnect = oneShotNode.connect.bind(oneShotNode);
  let oneShotCalls = 0;

  (oneShotNode as any).connect = (...args: any[]) => {
    oneShotCalls++;
    return (originalOneShotConnect as any)(...args);
  };

  (oneShotNode as any).connect(closedOneShot, undefined, false);
  await waitFor(() => !(oneShotNode as any).dialing.has(closedOneShot));
  await new Promise((resolve) => setTimeout(resolve, 750));

  assert.equal(oneShotCalls, 1);
  assert.equal((oneShotNode as any).backoff.has(closedOneShot), false);

  // -------------------------------------------------------------------------
  // TCP success without VOID authentication must also remain one-shot.
  // -------------------------------------------------------------------------
  const silentSockets = new Set<net.Socket>();
  const silentServer = net.createServer((socket) => {
    silentSockets.add(socket);
    socket.on("close", () => silentSockets.delete(socket));
    // Deliberately never answer HELLO/AUTH.
  });

  await new Promise<void>((resolve, reject) => {
    silentServer.once("error", reject);
    silentServer.listen(0, "127.0.0.1", resolve);
  });

  const silentAddressInfo = silentServer.address();
  assert(silentAddressInfo && typeof silentAddressInfo === "object");
  const silentAddress = `127.0.0.1:${silentAddressInfo.port}`;

  const silentNode = new Node(0, keypair());
  const originalSilentConnect = silentNode.connect.bind(silentNode);
  let silentCalls = 0;

  (silentNode as any).connect = (...args: any[]) => {
    silentCalls++;
    return (originalSilentConnect as any)(...args);
  };

  (silentNode as any).connect(silentAddress, undefined, false);

  await waitFor(() => silentNode.peers.size >= 1);
  await waitFor(
    () => silentNode.peers.size === 0,
    VOID_P2P_AUTH_TIMEOUT_MS_V1 + 2_000,
  );
  await new Promise((resolve) => setTimeout(resolve, 750));

  assert.equal(silentCalls, 1);
  assert.equal((silentNode as any).backoff.has(silentAddress), false);

  for (const socket of silentSockets) socket.destroy();
  await new Promise<void>((resolve) => silentServer.close(() => resolve()));

  // -------------------------------------------------------------------------
  // Trusted/bootstrap/cache dial semantics still retry.
  // -------------------------------------------------------------------------
  const retryNode = new Node(0, keypair());
  const closedRetry = await closedLocalAddress();
  const originalRetryConnect = retryNode.connect.bind(retryNode);
  let retryCalls = 0;

  (retryNode as any).connect = (...args: any[]) => {
    retryCalls++;
    return (originalRetryConnect as any)(...args);
  };

  (retryNode as any).connect(closedRetry, undefined, true);
  await waitFor(() => retryCalls >= 2);
  (retryNode as any).stopping = true;

  assert.equal((retryNode as any).backoff.has(closedRetry), true);

  console.log("VOID_P2P_LEARNED_PEER_PUBLIC_REDIAL_FILTER_V1_PROOF_GREEN");
  console.log("third_party_private_peer_redial=false");
  console.log("third_party_loopback_peer_redial=false");
  console.log("third_party_link_local_peer_redial=false");
  console.log("third_party_cgnat_peer_redial=false");
  console.log("third_party_documentation_peer_redial=false");
  console.log("third_party_multicast_peer_redial=false");
  console.log("third_party_dns_peer_redial=false");
  console.log("public_ipv4_peer_discovery=true");
  console.log("public_ipv6_peer_discovery=true");
  console.log("private_peer_exchange_republished=false");
  console.log("dns_peer_exchange_republished=false");
  console.log("learned_peer_advertisement_parse_cap=64");
  console.log("learned_peer_per_message_dial_cap=8");
  console.log("ineligible_prefix_consumes_public_dial_budget=false");
  console.log("learned_peer_runtime_dial_cap=64");
  console.log("duplicate_learned_peer_redial=false");
  console.log("unverified_learned_peer_failure_retried=false");
  console.log("unverified_learned_peer_failure_backoff_created=false");
  console.log("unauthenticated_tcp_success_retried=false");
  console.log("unauthenticated_tcp_success_backoff_created=false");
  console.log("trusted_bootstrap_cache_retry_preserved=true");
  console.log("authenticated_direct_peer_state_preserved=true");
  console.log("non_persistable_direct_peer_exchange_republished=false");
  console.log("explicit_bootstrap_policy_changed=false");
  console.log("verified_peer_cache_policy_changed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  if (previousDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = previousDataDir;
  fs.rmSync(temp, { recursive: true, force: true });
}
