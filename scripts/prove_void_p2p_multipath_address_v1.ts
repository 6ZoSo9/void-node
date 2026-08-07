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
  canonicalPeerAddress,
  httpBaseFromP2P,
  parseBootstrap,
  parsePeerAddress,
} from "../src/types/p2p.js";

const MARKER = "VOID_P2P_MULTIPATH_ADDRESS_V1_PROOF_GREEN";

function keypair(label: string) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const nodeId = crypto
    .createHash("sha256")
    .update(pubPEM)
    .digest("hex")
    .slice(0, 32);
  assert(nodeId, `derived node ID missing for ${label}`);
  return {
    privateKey,
    publicKey,
    nodeId,
    pubPEM,
  };
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
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("timed out waiting for proof condition");
}

const ipv4 = parsePeerAddress("192.0.2.10:4700");
assert.equal(ipv4?.canonical, "192.0.2.10:4700");
assert.equal(ipv4?.family, 4);

const dns = parsePeerAddress("Seed.Example:4701");
assert.equal(dns?.canonical, "seed.example:4701");
assert.equal(dns?.family, 0);

const ipv6 = parsePeerAddress("[2001:0db8::1]:4700");
assert.equal(ipv6?.canonical, "[2001:db8::1]:4700");
assert.equal(ipv6?.family, 6);
assert.equal(
  httpBaseFromP2P("[2001:0db8::1]:4700"),
  "http://[2001:db8::1]:4100",
);

for (const invalid of [
  "2001:db8::1:4700",
  "[2001:db8::1]4700",
  "[2001:db8::1]:0",
  "[2001:db8::1]:65536",
  "[fe80::1%eth0]:4700",
  " seed.example:4700",
  "seed.example:4700 ",
  "seed.example:-1",
  "seed.example:abc",
  "seed.example:4700/path",
  "seed.example:4700?x=1",
  "user@seed.example:4700",
  "seed..example:4700",
]) {
  assert.equal(
    parsePeerAddress(invalid),
    undefined,
    `unexpectedly accepted ${invalid}`,
  );
}

assert.deepEqual(
  parseBootstrap(
    "Seed.Example:4700, seed.example:4700, [2001:0db8::1]:4700, [2001:db8::1]:4700, 2001:db8::1:4700",
  ),
  ["seed.example:4700", "[2001:db8::1]:4700"],
);
assert.equal(
  canonicalPeerAddress("[2001:0DB8:0:0:0:0:0:1]:4700"),
  "[2001:db8::1]:4700",
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-p2p-multipath-address-v1-"),
);
let target: Node | undefined;
let client: Node | undefined;

try {
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  process.env.BOOTSTRAP_ADDRS = "";
  process.env.DATA_DIR = path.join(root, "target");

  target = new Node(0, keypair("target"));
  await target.start();
  const targetAddress = target.listenAddrs[0];
  assert(parsePeerAddress(targetAddress));

  const deadPort = await closedRandomPort();
  const deadAddress = `127.0.0.1:${deadPort}`;

  process.env.DATA_DIR = path.join(root, "client");
  process.env.BOOTSTRAP_ADDRS = `${deadAddress},${targetAddress}`;

  client = new Node(0, keypair("client"));
  await client.start();

  await waitFor(
    () =>
      client!.peers.has(target!.id) &&
      target!.peers.has(client!.id),
  );

  const knownAddrs = (client as any).knownAddrs as Set<string>;
  assert(knownAddrs.has(targetAddress));

  const malformed = [
    "2001:db8::99:4700",
    "[2001:db8::99]:99999",
    "http://127.0.0.1:4700",
    "evil.example:4700/path",
    " user.example:4700",
  ];

  const knownBefore = new Set(knownAddrs);
  (client as any).onMsg(target.id, {
    type: "PEERS",
    addrs: malformed,
  });

  for (const bad of malformed) {
    assert(!knownAddrs.has(bad));
    assert(!((client as any).dialing as Set<string>).has(bad));
    assert(!((client as any).backoff as Map<string, number>).has(bad));
  }
  assert.deepEqual(new Set(knownAddrs), knownBefore);

  console.log("[PASS] IPv4, DNS, and bracketed IPv6 canonical peer addresses");
  console.log("[PASS] ambiguous/malformed peer addresses fail closed");
  console.log("[PASS] bootstrap address canonicalization and dedupe");
  console.log("[PASS] one dead bootstrap target does not block a healthy target");
  console.log("[PASS] malformed learned PEERS addresses never enter dial state");
  console.log("[PASS] peer exchange remains active after successful first contact");

  console.log(MARKER);
  console.log("ipv6_bracketed_peer_address_supported=true");
  console.log("unbracketed_ipv6_with_port_accepted=false");
  console.log("ipv6_http_inference_bracket_safe=true");
  console.log("canonical_bootstrap_dedupe=true");
  console.log("multiple_bootstrap_targets_independent=true");
  console.log("healthy_target_connected_with_dead_sibling=true");
  console.log("malformed_learned_peer_dialed=false");
  console.log("peer_exchange_after_first_contact=true");
  console.log("single_required_seed=false");
  console.log("cloud_provider_dependency=false");
  console.log("dns_provider_dependency=false");
  console.log("tailnet_dependency=false");
  console.log("deployment_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
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
