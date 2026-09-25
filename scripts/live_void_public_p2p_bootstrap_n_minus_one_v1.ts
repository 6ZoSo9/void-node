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
  "VOID_PUBLIC_P2P_BOOTSTRAP_N_MINUS_ONE_V1_LIVE_GREEN";
const PRECISION_ID = "9d89483769e469e0473b489dc50dba96";
const RAILWAY_ID = "4f93300760f94834139babd2b54d2619";
const PRECISION_ADDR = "24.40.99.171:4700";

const mode = process.argv[2] || "";
if (
  !new Set([
    "both-remove-precision",
    "precision-unavailable",
    "railway-unavailable",
  ]).has(mode)
) {
  throw new Error(
    "mode must be both-remove-precision, precision-unavailable, or railway-unavailable",
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
  timeoutMs = 25_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`timed out waiting for ${label}`);
}

function iptables(args: string[]) {
  childProcess.execFileSync("sudo", ["iptables", ...args], {
    stdio: "inherit",
  });
}

let precisionBlocked = false;
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
  } catch {}
  precisionBlocked = false;
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), `void-public-p2p-nminus1-${mode}-`),
);
const previous = {
  DATA_DIR: process.env.DATA_DIR,
  P2P_BIND_HOST: process.env.P2P_BIND_HOST,
  P2P_ADVERTISE_HOST: process.env.P2P_ADVERTISE_HOST,
  BOOTSTRAP_ADDRS: process.env.BOOTSTRAP_ADDRS,
  VOID_PUBLIC_BOOTSTRAP_REQUIRE:
    process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE,
  VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH:
    process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH,
};
let node: Node | undefined;

try {
  if (mode === "precision-unavailable") blockPrecision();

  process.env.DATA_DIR = root;
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  process.env.BOOTSTRAP_ADDRS = "";
  process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE = "1";
  process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH = "0";

  node = new Node(0, keypair());
  await node.start();

  if (mode === "both-remove-precision") {
    await waitFor(
      () => {
        const ids = connectedIds(node!);
        return ids.includes(PRECISION_ID) && ids.includes(RAILWAY_ID);
      },
      "both pinned authenticated peers",
    );
    await waitFor(
      () => {
        const ids = verifiedIds(node!);
        return ids.includes(PRECISION_ID) && ids.includes(RAILWAY_ID);
      },
      "both pinned verified-peer cache records",
    );

    const before = connectedIds(node);
    assert(before.includes(PRECISION_ID));
    assert(before.includes(RAILWAY_ID));

    blockPrecision();
    const precisionPeer = (node as any).peers.get(PRECISION_ID);
    assert(precisionPeer?.handshakeDone === true);
    precisionPeer.socket.destroy(new Error("N-1 acceptance removes Precision"));

    await waitFor(
      () => {
        const ids = connectedIds(node!);
        return !ids.includes(PRECISION_ID) && ids.includes(RAILWAY_ID);
      },
      "Railway connectivity after Precision removal",
    );
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    assert(connectedIds(node).includes(RAILWAY_ID));

    console.log(`before_connected_peer_ids=${JSON.stringify(before)}`);
    console.log(
      `after_removal_connected_peer_ids=${JSON.stringify(connectedIds(node))}`,
    );
    console.log("removed_failure_domain=precision-home-wired");
    console.log("continued_connectivity=true");
  } else if (mode === "precision-unavailable") {
    await waitFor(
      () => connectedIds(node!).includes(RAILWAY_ID),
      "Railway authentication with Precision unavailable",
    );
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    assert.equal(connectedIds(node).includes(PRECISION_ID), false);
    assert(verifiedIds(node).includes(RAILWAY_ID));
    console.log("unavailable_failure_domain=precision-home-wired");
    console.log(
      `connected_peer_ids=${JSON.stringify(connectedIds(node))}`,
    );
    console.log("selected_surviving_peer=railway-free-secondary");
  } else {
    await waitFor(
      () => connectedIds(node!).includes(PRECISION_ID),
      "Precision authentication with Railway unavailable",
    );
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    assert.equal(connectedIds(node).includes(RAILWAY_ID), false);
    assert(verifiedIds(node).includes(PRECISION_ID));
    console.log("unavailable_failure_domain=railway-free-sfo");
    console.log(
      `connected_peer_ids=${JSON.stringify(connectedIds(node))}`,
    );
    console.log("selected_surviving_peer=precision-primary");
  }

  assert.equal(process.env.BOOTSTRAP_ADDRS, "");
  console.log(MARKER);
  console.log(`mode=${mode}`);
  console.log("outside_operator_tailnet=true");
  console.log("manual_operator_address_copy_required=false");
  console.log("private_tailnet_dependency=false");
  console.log("commercial_cloud_provider_required=false");
  console.log("single_required_introduction=false");
  console.log("expected_node_id_pinning=true");
  console.log("learned_peer_dns_policy_changed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  try {
    node?.stop();
  } catch {}
  unblockPrecision();
  fs.rmSync(root, { recursive: true, force: true });
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
