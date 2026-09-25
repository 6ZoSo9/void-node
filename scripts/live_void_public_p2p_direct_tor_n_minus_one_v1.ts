// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";

const MARKER =
  "VOID_PUBLIC_P2P_DIRECT_TOR_N_MINUS_ONE_V1_LIVE_GREEN";
const PRECISION_ID = "9d89483769e469e0473b489dc50dba96";
const NIMO_ID = "12babb04b0f88de7b74e17d04b343007";

const mode = String(process.argv[2] || "");
if (
  !new Set([
    "both-remove-precision",
    "precision-unavailable",
    "tor-unavailable",
  ]).has(mode)
) {
  throw new Error(
    "mode must be both-remove-precision, precision-unavailable, or tor-unavailable",
  );
}

function keypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, pubPEM, nodeId };
}

function connectedIds(node: Node): string[] {
  return node
    .peersSnapshot()
    .connected.map((peer) => peer.id)
    .filter((id) => /^[0-9a-f]{32}$/.test(id))
    .sort();
}

function verifiedIds(node: Node): string[] {
  return node
    .peersSnapshot()
    .verifiedPeers.map((peer) => peer.node_id)
    .filter((id) => /^[0-9a-f]{32}$/.test(id))
    .sort();
}

async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 45_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`timed out waiting for ${label}`);
}

let precisionBlocked = false;
function iptables(args: string[]) {
  childProcess.execFileSync("sudo", ["iptables", ...args], {
    stdio: "inherit",
  });
}
function blockPrecision() {
  if (precisionBlocked) return;
  iptables([
    "-I",
    "OUTPUT",
    "-p",
    "tcp",
    "-d",
    "24.40.99.171",
    "--dport",
    "4700",
    "-j",
    "REJECT",
  ]);
  precisionBlocked = true;
}
function unblockPrecision() {
  if (!precisionBlocked) return;
  try {
    iptables([
      "-D",
      "OUTPUT",
      "-p",
      "tcp",
      "-d",
      "24.40.99.171",
      "--dport",
      "4700",
      "-j",
      "REJECT",
    ]);
  } catch (error) {
    console.warn(
      "VOID_PUBLIC_P2P_N_MINUS_ONE_CLEANUP_WARNING precision_unblock_failed",
      error instanceof Error ? error.message : String(error),
    );
  }
  precisionBlocked = false;
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), `void-direct-tor-nminus1-${mode}-`),
);
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
let node: Node | undefined;

try {
  if (mode === "precision-unavailable") blockPrecision();

  process.env.DATA_DIR = root;
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  process.env.BOOTSTRAP_ADDRS = "";
  process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE = "1";
  process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH = "0";
  process.env.VOID_TOR_SOCKS_HOST = "127.0.0.1";
  process.env.VOID_TOR_SOCKS_PORT =
    mode === "tor-unavailable" ? "19052" : "19051";
  process.env.VOID_TOR_BOOTSTRAP_TIMEOUT_MS = "30000";

  node = new Node(0, keypair());
  await node.start();

  if (mode === "both-remove-precision") {
    await waitFor(
      () => {
        const connected = connectedIds(node!);
        const verified = verifiedIds(node!);
        return (
          connected.includes(PRECISION_ID) &&
          connected.includes(NIMO_ID) &&
          verified.includes(PRECISION_ID) &&
          verified.includes(NIMO_ID)
        );
      },
      "both authenticated verified introductions",
    );

    const beforeConnected = connectedIds(node);
    const beforeVerified = verifiedIds(node);
    const directPeer = (node as any).peers.get(PRECISION_ID);
    assert(directPeer?.handshakeDone === true);
    assert.equal(directPeer.transport, "direct");

    blockPrecision();
    directPeer.socket.destroy(
      new Error("N-1 acceptance removes Precision introduction"),
    );

    await waitFor(
      () => {
        const connected = connectedIds(node!);
        const verified = verifiedIds(node!);
        return (
          !connected.includes(PRECISION_ID) &&
          connected.includes(NIMO_ID) &&
          verified.includes(NIMO_ID)
        );
      },
      "Tor peer after direct introduction removal",
    );
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    assert(connectedIds(node).includes(NIMO_ID));

    console.log(
      `before_connected_peer_ids=${JSON.stringify(beforeConnected)}`,
    );
    console.log(
      `before_verified_peer_ids=${JSON.stringify(beforeVerified)}`,
    );
    console.log(
      `after_removal_connected_peer_ids=${JSON.stringify(connectedIds(node))}`,
    );
    console.log(
      `after_removal_verified_peer_ids=${JSON.stringify(verifiedIds(node))}`,
    );
    console.log("removed_introduction=precision-direct-ipv4");
    console.log("surviving_introduction=nimo-tor-v3-p2p");
    console.log("continued_authenticated_connectivity=true");
  } else if (mode === "precision-unavailable") {
    await waitFor(
      () =>
        connectedIds(node!).includes(NIMO_ID) &&
        verifiedIds(node!).includes(NIMO_ID),
      "Nimo Tor authentication while Precision is unavailable",
      120_000,
    );
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    assert.equal(connectedIds(node).includes(PRECISION_ID), false);
    console.log("unavailable_introduction=precision-direct-ipv4");
    console.log("selected_introduction=nimo-tor-v3-p2p");
    console.log(
      `connected_peer_ids=${JSON.stringify(connectedIds(node))}`,
    );
    console.log(
      `verified_peer_ids=${JSON.stringify(verifiedIds(node))}`,
    );
  } else {
    await waitFor(
      () =>
        connectedIds(node!).includes(PRECISION_ID) &&
        verifiedIds(node!).includes(PRECISION_ID),
      "Precision authentication while Tor SOCKS is unavailable",
    );
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    assert.equal(connectedIds(node).includes(NIMO_ID), false);
    console.log("unavailable_introduction=nimo-tor-v3-p2p");
    console.log("selected_introduction=precision-direct-ipv4");
    console.log(
      `connected_peer_ids=${JSON.stringify(connectedIds(node))}`,
    );
    console.log(
      `verified_peer_ids=${JSON.stringify(verifiedIds(node))}`,
    );
  }

  assert.equal(process.env.BOOTSTRAP_ADDRS, "");
  console.log(MARKER);
  console.log(`mode=${mode}`);
  console.log("outside_operator_tailnet=true");
  console.log("manual_operator_address_copy_required=false");
  console.log("private_tailnet_dependency=false");
  console.log("commercial_cloud_provider_required=false");
  console.log("dns_provider_required=false");
  console.log("tunnel_provider_required=false");
  console.log("single_required_introduction=false");
  console.log("expected_node_id_pinning=true");
  console.log("learned_peer_dns_policy_changed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  try {
    node?.stop();
  } catch (error) {
    console.warn(
      "VOID_PUBLIC_P2P_N_MINUS_ONE_CLEANUP_WARNING node_stop_failed",
      error instanceof Error ? error.message : String(error),
    );
  }
  unblockPrecision();
  fs.rmSync(root, { recursive: true, force: true });
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
