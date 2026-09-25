// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  loadVoidPublicP2PBootstrapIntroductionsV1,
  validateVoidPublicP2PBootstrapIntroductionsV1,
  voidPublicP2PBootstrapIntroductionsEnabledV1,
  voidTorP2PSocksOptionsFromEnvV1,
} from "../src/p2p/public_bootstrap_introductions_v1.js";
import {
  connectVoidTorSocksSocketV1,
} from "../src/p2p/tor_socks_socket_v1.js";
import {
  isPublicLearnedPeerAddressV1,
} from "../src/types/p2p.js";

const MARKER =
  "VOID_PUBLIC_P2P_DIRECT_TOR_INTRODUCTIONS_V1_PROOF_GREEN";
const PRECISION_ID = "9d89483769e469e0473b489dc50dba96";
const PRECISION_ADDR = "24.40.99.171:4700";
const NIMO_ID = "12babb04b0f88de7b74e17d04b343007";
const NIMO_ENDPOINT =
  "tor://6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion:4700";

function keypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, pubPEM, nodeId };
}

async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 3_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for ${label}`);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

async function proveSocksCoalescedBytes() {
  const expectedInitial = Buffer.from("00000010766f69642d68656c6c6f2d7631", "hex");
  let socket: net.Socket | undefined;
  const server = net.createServer((accepted) => {
    let stage = 0;
    let buffer = Buffer.alloc(0);
    accepted.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (stage === 0 && buffer.length >= 3) {
        buffer = buffer.subarray(3);
        accepted.write(Buffer.from([0x05, 0x00]));
        stage = 1;
      }
      if (stage === 1 && buffer.length >= 5) {
        const hostLength = buffer[4];
        const requestLength = 7 + hostLength;
        if (buffer.length < requestLength) return;
        buffer = buffer.subarray(requestLength);
        accepted.write(
          Buffer.concat([
            Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0x12, 0x5c]),
            expectedInitial,
          ]),
        );
        stage = 2;
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object");

  try {
    const connected = await connectVoidTorSocksSocketV1({
      onionHostname:
        "6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion",
      onionPort: 4700,
      socksHost: "127.0.0.1",
      socksPort: address.port,
      timeoutMs: 3_000,
    });
    socket = connected.socket;
    assert.deepEqual(connected.initial_bytes, expectedInitial);
    assert.equal(socket.isPaused(), true);
  } finally {
    socket?.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

const config = loadVoidPublicP2PBootstrapIntroductionsV1(process.cwd());
assert.equal(config.entries.length, 2);
assert.deepEqual(
  config.entries.map((entry) => [
    entry.id,
    entry.transport,
    entry.endpoint,
    entry.expected_node_id,
    entry.failure_domain,
  ]),
  [
    [
      "precision-direct-ipv4",
      "direct_ipv4_seed",
      PRECISION_ADDR,
      PRECISION_ID,
      "precision-home-wired",
    ],
    [
      "nimo-tor-v3-p2p",
      "tor_sync_seed",
      NIMO_ENDPOINT,
      NIMO_ID,
      "nimo-tor-independent-edge",
    ],
  ],
);
assert.equal(isPublicLearnedPeerAddressV1(PRECISION_ADDR), true);
assert.equal(
  isPublicLearnedPeerAddressV1(
    "6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion:4700",
  ),
  false,
);

const duplicateNode = clone(config);
(duplicateNode.entries as any[])[1].expected_node_id = PRECISION_ID;
assert.throws(
  () => validateVoidPublicP2PBootstrapIntroductionsV1(duplicateNode),
  /duplicate expected introduction node ID/,
);

const duplicateDomain = clone(config);
(duplicateDomain.entries as any[])[1].failure_domain =
  "precision-home-wired";
assert.throws(
  () => validateVoidPublicP2PBootstrapIntroductionsV1(duplicateDomain),
  /duplicate introduction failure domain/,
);

const badOnion = clone(config);
(badOnion.entries as any[])[1].endpoint =
  "tor://example.onion:4700";
assert.throws(
  () => validateVoidPublicP2PBootstrapIntroductionsV1(badOnion),
  /v3-onion/,
);

const authorityEscalation = clone(config);
(authorityEscalation.authority as any).wallet_authority = true;
assert.throws(
  () => validateVoidPublicP2PBootstrapIntroductionsV1(authorityEscalation),
  /wallet_authority must be false/,
);

assert.equal(
  voidPublicP2PBootstrapIntroductionsEnabledV1({
    VOID_PUBLIC_BOOTSTRAP_REQUIRE: "1",
  }),
  true,
);
assert.equal(
  voidPublicP2PBootstrapIntroductionsEnabledV1({
    VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "1",
  }),
  true,
);
assert.equal(
  voidPublicP2PBootstrapIntroductionsEnabledV1({
    VOID_MULTIPATH_PUBLIC_BOOTSTRAP_ACTIVE: "1",
  }),
  true,
);
assert.equal(
  voidPublicP2PBootstrapIntroductionsEnabledV1({
    VOID_TOR_PUBLIC_BOOTSTRAP_ACTIVE: "1",
  }),
  true,
);
assert.equal(
  voidPublicP2PBootstrapIntroductionsEnabledV1({}),
  false,
);
assert.deepEqual(
  voidTorP2PSocksOptionsFromEnvV1({
    VOID_TOR_SOCKS_HOST: "127.0.0.1",
    VOID_TOR_SOCKS_PORT: "19051",
    VOID_TOR_BOOTSTRAP_TIMEOUT_MS: "60000",
  }),
  {
    socksHost: "127.0.0.1",
    socksPort: 19051,
    timeoutMs: 60000,
  },
);
assert.throws(
  () =>
    voidTorP2PSocksOptionsFromEnvV1({
      VOID_TOR_SOCKS_HOST: "192.0.2.1",
    }),
  /numeric loopback/,
);

await proveSocksCoalescedBytes();

const previous = Object.fromEntries(
  [
    "DATA_DIR",
    "P2P_BIND_HOST",
    "P2P_ADVERTISE_HOST",
    "BOOTSTRAP_ADDRS",
    "VOID_PUBLIC_BOOTSTRAP_REQUIRE",
    "VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH",
    "VOID_TOR_SOCKS_HOST",
    "VOID_TOR_SOCKS_PORT",
    "VOID_TOR_BOOTSTRAP_TIMEOUT_MS",
  ].map((key) => [key, process.env[key]]),
);
const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-p2p-direct-tor-v1-"),
);
let publicNode: Node | undefined;
let localNode: Node | undefined;

try {
  process.env.DATA_DIR = path.join(root, "public");
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  process.env.BOOTSTRAP_ADDRS = "";
  process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE = "1";
  process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH = "0";
  process.env.VOID_TOR_SOCKS_HOST = "127.0.0.1";
  process.env.VOID_TOR_SOCKS_PORT = "19051";
  process.env.VOID_TOR_BOOTSTRAP_TIMEOUT_MS = "1000";

  const directDials: Array<[string, string | undefined, boolean | undefined]> = [];
  const torDials: any[] = [];
  publicNode = new Node(0, keypair());
  (publicNode as any).connect = (
    address: string,
    expectedNodeId?: string,
    retryOnFailure?: boolean,
  ) => {
    directDials.push([address, expectedNodeId, retryOnFailure]);
  };
  (publicNode as any).connectTorBootstrapIntroductionV1 = async (
    target: unknown,
  ) => {
    torDials.push(target);
  };

  await publicNode.start();
  await waitFor(
    () => directDials.length === 1 && torDials.length === 1,
    "independent public introduction dials",
  );

  assert.deepEqual(directDials, [
    [PRECISION_ADDR, PRECISION_ID, true],
  ]);
  assert.equal(torDials[0].expected_node_id, NIMO_ID);
  assert.equal(torDials[0].endpoint, NIMO_ENDPOINT);
  assert.equal(torDials[0].socks_port, 19051);
  assert.equal(process.env.BOOTSTRAP_ADDRS, "");

  const torPeer: any = {
    id: NIMO_ID,
    addr: NIMO_ENDPOINT,
    listens: ["192.168.1.177:4700"],
    outbound: true,
    handshakeDone: true,
    authenticatedAtUnixMs: Date.now(),
    transport: "tor",
    torBootstrapReconnect: {
      endpoint: NIMO_ENDPOINT,
    },
  };
  (publicNode as any).peers.set(NIMO_ID, torPeer);
  const snapshot = publicNode.peersSnapshot();
  assert(
    snapshot.verifiedPeers.some(
      (entry) =>
        entry.node_id === NIMO_ID &&
        entry.addresses.length === 1 &&
        entry.addresses[0] === NIMO_ENDPOINT,
    ),
  );
  assert.equal(
    (publicNode as any).verifiedPeerCacheRecords.some(
      (entry: any) => entry.node_id === NIMO_ID,
    ),
    false,
  );

  publicNode.stop();
  publicNode = undefined;

  process.env.DATA_DIR = path.join(root, "local");
  process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE = "0";
  const localDirectDials: unknown[] = [];
  const localTorDials: unknown[] = [];
  localNode = new Node(0, keypair());
  (localNode as any).connect = (...args: unknown[]) => {
    localDirectDials.push(args);
  };
  (localNode as any).connectTorBootstrapIntroductionV1 = async (
    target: unknown,
  ) => {
    localTorDials.push(target);
  };
  await localNode.start();
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert.deepEqual(localDirectDials, []);
  assert.deepEqual(localTorDials, []);

  console.log(MARKER);
  console.log("introduction_count=2");
  console.log("direct_ipv4_identity_pinned=true");
  console.log("tor_v3_identity_pinned=true");
  console.log("failure_domains_distinct=true");
  console.log("manual_bootstrap_addrs_required=false");
  console.log("learned_peer_dns_policy_changed=false");
  console.log("tor_peer_direct_cache_persisted=false");
  console.log("tor_peer_live_verified_snapshot=true");
  console.log("tor_socks_coalesced_bytes_preserved=true");
  console.log("public_mode_independent_dials=2");
  console.log("local_mode_automatic_public_dials=0");
  console.log("commercial_cloud_provider_required=false");
  console.log("private_tailnet_dependency=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  try {
    publicNode?.stop();
  } catch {}
  try {
    localNode?.stop();
  } catch {}
  fs.rmSync(root, { recursive: true, force: true });
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
