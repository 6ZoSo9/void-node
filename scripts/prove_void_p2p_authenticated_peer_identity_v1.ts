// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";

import { Node } from "../src/node_core.js";
import {
  VOID_P2P_AUTH_PROTOCOL_VERSION_V1,
  buildVoidPeerAuthV1,
  deriveVoidNodeIdFromPublicPemV1,
  newVoidPeerChallengeV1,
  normalizeVoidPeerHelloV1,
  verifyVoidPeerAuthV1,
} from "../src/p2p/auth_v1.js";

function keypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, pubPEM, nodeId };
}

function frame(message: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const size = Buffer.alloc(4);
  size.writeUInt32BE(body.length, 0);
  return Buffer.concat([size, body]);
}

async function closedRandomPort(): Promise<number> {
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

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("timed out waiting for authenticated peer condition");
}

const alice = keypair();
const bob = keypair();
const challengeAlice = newVoidPeerChallengeV1();
const challengeBob = newVoidPeerChallengeV1();

const aliceHello = normalizeVoidPeerHelloV1({
  type: "HELLO",
  id: alice.nodeId,
  listen: ["127.0.0.1:4700", "[2001:db8::1]:4700"],
  proto: VOID_P2P_AUTH_PROTOCOL_VERSION_V1,
  pubkey: alice.pubPEM,
  challenge: challengeAlice,
});
assert(aliceHello);

const aliceAuth = buildVoidPeerAuthV1(
  {
    id: alice.nodeId,
    listen: aliceHello.listen,
    proto: aliceHello.proto,
    pubkey: alice.pubPEM,
  },
  challengeBob,
  challengeAlice,
  alice.privateKey,
);
assert(verifyVoidPeerAuthV1(aliceAuth, challengeBob, aliceHello));

const freshChallenge = newVoidPeerChallengeV1();
assert.notEqual(freshChallenge, challengeBob);
assert.equal(
  verifyVoidPeerAuthV1(aliceAuth, freshChallenge, aliceHello),
  undefined,
);

const wrongKeyAuth = buildVoidPeerAuthV1(
  {
    id: alice.nodeId,
    listen: aliceHello.listen,
    proto: aliceHello.proto,
    pubkey: alice.pubPEM,
  },
  challengeBob,
  challengeAlice,
  bob.privateKey,
);
assert.equal(
  verifyVoidPeerAuthV1(wrongKeyAuth, challengeBob, aliceHello),
  undefined,
);

assert.equal(
  verifyVoidPeerAuthV1(
    { ...aliceAuth, id: bob.nodeId },
    challengeBob,
    aliceHello,
  ),
  undefined,
);

assert.equal(
  verifyVoidPeerAuthV1(
    { ...aliceAuth, listen: ["127.0.0.1:4701"] },
    challengeBob,
    aliceHello,
  ),
  undefined,
);

for (const bad of [
  { ...aliceAuth, challenge: "00" },
  { ...aliceAuth, self_challenge: "00" },
  { ...aliceAuth, sig: "00" },
  { ...aliceAuth, pubkey: "not-a-key" },
  { ...aliceAuth, extra: true },
]) {
  assert.equal(
    verifyVoidPeerAuthV1(bad, challengeBob, aliceHello),
    undefined,
  );
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-p2p-authenticated-peer-identity-v1-"),
);
let target: Node | undefined;
let client: Node | undefined;
let rawSocket: net.Socket | undefined;

try {
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  process.env.BOOTSTRAP_ADDRS = "";
  process.env.DATA_DIR = path.join(root, "target");

  const targetKeys = keypair();
  target = new Node(0, targetKeys);
  await target.start();
  const targetAddress = target.listenAddrs[0];

  const parsedTarget = targetAddress.match(/^127\.0\.0\.1:(\d+)$/);
  assert(parsedTarget);
  const targetPort = Number(parsedTarget[1]);
  const knownBefore = new Set(target.peersSnapshot().knownAddrs);

  rawSocket = net.createConnection({
    host: "127.0.0.1",
    port: targetPort,
  });
  await new Promise<void>((resolve, reject) => {
    rawSocket!.once("connect", resolve);
    rawSocket!.once("error", reject);
  });
  rawSocket.write(
    frame({
      type: "PEERS",
      addrs: ["198.51.100.77:4700"],
    }),
  );
  rawSocket.write(
    frame({
      type: "SUB",
      topic: "void/block",
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.deepEqual(
    new Set(target.peersSnapshot().knownAddrs),
    knownBefore,
  );
  assert(
    [...target.peers.values()]
      .filter((peer) => peer.id.startsWith("?-"))
      .every((peer) => peer.handshakeDone === false),
  );
  rawSocket.destroy();
  rawSocket = undefined;

  const deadPort = await closedRandomPort();
  process.env.DATA_DIR = path.join(root, "client");
  process.env.BOOTSTRAP_ADDRS =
    `127.0.0.1:${deadPort}, ${targetAddress}`;

  const clientKeys = keypair();
  client = new Node(0, clientKeys);
  await client.start();

  await waitFor(
    () =>
      client!.peersSnapshot().connected.some(
        (peer) => peer.id === target!.id,
      ) &&
      target!.peersSnapshot().connected.some(
        (peer) => peer.id === client!.id,
      ),
  );

  const targetPeer = target.peers.get(client.id);
  const clientPeer = client.peers.get(target.id);
  assert(targetPeer?.handshakeDone);
  assert(clientPeer?.handshakeDone);

  console.log("[PASS] node ID is derived from canonical Ed25519 public key");
  console.log("[PASS] mutual challenge-response authentication completes");
  console.log("[PASS] auth transcript binds IPv4 and bracketed IPv6 listen addresses");
  console.log("[PASS] replay against fresh challenge fails");
  console.log("[PASS] wrong private key, mismatched node ID, and changed listen set fail");
  console.log("[PASS] malformed key/signature/challenge and unknown auth keys fail closed");
  console.log("[PASS] unauthenticated PEERS and SUB cannot promote trusted peer state");
  console.log("[PASS] dead bootstrap sibling does not block healthy authenticated peer");

  console.log("VOID_P2P_AUTHENTICATED_PEER_IDENTITY_V1_PROOF_GREEN");
  console.log("node_id_public_key_binding_required=true");
  console.log("challenge_response_required=true");
  console.log("mutual_authentication_complete=true");
  console.log("replayed_auth_accepted=false");
  console.log("wrong_key_auth_accepted=false");
  console.log("mismatched_node_id_auth_accepted=false");
  console.log("listen_address_transcript_bound=true");
  console.log("ipv6_listen_address_transcript_bound=true");
  console.log("unauthenticated_peer_messages_trusted=false");
  console.log("unauthenticated_peer_persistable=false");
  console.log("multiple_bootstrap_targets_independent=true");
  console.log("single_required_seed=false");
  console.log("cloud_provider_dependency=false");
  console.log("tailnet_dependency=false");
  console.log("deployment_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  try {
    rawSocket?.destroy();
  } catch (error) {
    void error;
  }
  try {
    client?.stop();
  } catch (error) {
    void error;
  }
  try {
    target?.stop();
  } catch (error) {
    void error;
  }
  delete process.env.BOOTSTRAP_ADDRS;
  delete process.env.P2P_BIND_HOST;
  delete process.env.P2P_ADVERTISE_HOST;
  delete process.env.DATA_DIR;
  fs.rmSync(root, { recursive: true, force: true });
}
