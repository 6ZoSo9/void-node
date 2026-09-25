// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  loadVoidPublicP2PBootstrapIntroductionsV1,
  validateVoidPublicP2PBootstrapIntroductionsV1,
  voidPublicP2PBootstrapIntroductionsEnabledV1,
} from "../src/p2p/public_bootstrap_introductions_v1.js";
import {
  isPublicLearnedPeerAddressV1,
  parseBootstrap,
} from "../src/types/p2p.js";

const MARKER =
  "VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_V1_PROOF_GREEN";
const PRECISION_ID = "9d89483769e469e0473b489dc50dba96";
const PRECISION_ADDR = "24.40.99.171:4700";
const RAILWAY_ID = "4f93300760f94834139babd2b54d2619";
const RAILWAY_ADDR = "iriguchi.proxy.rlwy.net:58979";

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
  timeoutMs = 2_500,
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

const config = loadVoidPublicP2PBootstrapIntroductionsV1(process.cwd());
assert.equal(config.entries.length, 2);
assert.deepEqual(
  config.entries.map((entry) => ({
    id: entry.id,
    priority: entry.priority,
    address: entry.address,
    expected_node_id: entry.expected_node_id,
    introduction_transport: entry.introduction_transport,
    failure_domain: entry.failure_domain,
  })),
  [
    {
      id: "precision-primary",
      priority: 10,
      address: PRECISION_ADDR,
      expected_node_id: PRECISION_ID,
      introduction_transport: "direct_ipv4_seed",
      failure_domain: "precision-home-wired",
    },
    {
      id: "railway-free-secondary",
      priority: 20,
      address: RAILWAY_ADDR,
      expected_node_id: RAILWAY_ID,
      introduction_transport: "relay",
      failure_domain: "railway-free-sfo",
    },
  ],
);

assert.equal(isPublicLearnedPeerAddressV1(RAILWAY_ADDR), false);
assert.deepEqual(parseBootstrap(RAILWAY_ADDR), [RAILWAY_ADDR]);

const duplicateIdentity = clone(config);
(duplicateIdentity.entries as any[])[1].expected_node_id = PRECISION_ID;
assert.throws(
  () => validateVoidPublicP2PBootstrapIntroductionsV1(duplicateIdentity),
  /duplicate expected introduction node ID/,
);

const privateNumeric = clone(config);
(privateNumeric.entries as any[])[0].address = "192.168.1.20:4700";
assert.throws(
  () => validateVoidPublicP2PBootstrapIntroductionsV1(privateNumeric),
  /globally routable/,
);

const privateDns = clone(config);
(privateDns.entries as any[])[1].address = "relay.local:58979";
assert.throws(
  () => validateVoidPublicP2PBootstrapIntroductionsV1(privateDns),
  /public-shaped/,
);

const wrongFamily = clone(config);
(wrongFamily.entries as any[])[1].introduction_transport =
  "direct_ipv4_seed";
assert.throws(
  () => validateVoidPublicP2PBootstrapIntroductionsV1(wrongFamily),
  /requires a numeric IPv4/,
);

const authorityEscalation = clone(config);
(authorityEscalation.authority as any).wallet_authority = true;
assert.throws(
  () => validateVoidPublicP2PBootstrapIntroductionsV1(authorityEscalation),
  /wallet_authority must be false/,
);

const dependencyEscalation = clone(config);
(dependencyEscalation.requirements as any).commercial_cloud_provider_required =
  true;
assert.throws(
  () => validateVoidPublicP2PBootstrapIntroductionsV1(dependencyEscalation),
  /commercial_cloud_provider_required must be false/,
);

assert.equal(
  voidPublicP2PBootstrapIntroductionsEnabledV1({
    VOID_PUBLIC_BOOTSTRAP_REQUIRE: "1",
  }),
  true,
);
assert.equal(
  voidPublicP2PBootstrapIntroductionsEnabledV1({
    VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH: "1",
  }),
  true,
);
assert.equal(
  voidPublicP2PBootstrapIntroductionsEnabledV1({}),
  false,
);
assert.throws(
  () =>
    voidPublicP2PBootstrapIntroductionsEnabledV1({
      VOID_PUBLIC_BOOTSTRAP_REQUIRE: "yes",
    }),
  /must be exactly 0 or 1/,
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
const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-p2p-introductions-v1-"),
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

  const publicDials: Array<{
    address: string;
    expectedNodeId: string | undefined;
    retryOnFailure: boolean | undefined;
  }> = [];
  publicNode = new Node(0, keypair());
  (publicNode as any).connect = (
    address: string,
    expectedNodeId?: string,
    retryOnFailure?: boolean,
  ) => {
    publicDials.push({ address, expectedNodeId, retryOnFailure });
  };
  await publicNode.start();
  await waitFor(
    () => publicDials.length === 2,
    "two pinned public bootstrap dials",
  );

  assert.deepEqual(publicDials, [
    {
      address: PRECISION_ADDR,
      expectedNodeId: PRECISION_ID,
      retryOnFailure: true,
    },
    {
      address: RAILWAY_ADDR,
      expectedNodeId: RAILWAY_ID,
      retryOnFailure: true,
    },
  ]);
  assert.equal(process.env.BOOTSTRAP_ADDRS, "");

  publicNode.stop();
  publicNode = undefined;

  process.env.DATA_DIR = path.join(root, "local");
  process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE = "0";
  process.env.VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH = "0";

  const localDials: string[] = [];
  localNode = new Node(0, keypair());
  (localNode as any).connect = (address: string) => {
    localDials.push(address);
  };
  await localNode.start();
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.deepEqual(localDials, []);

  console.log(MARKER);
  console.log("pinned_introduction_count=2");
  console.log("precision_identity_pinned=true");
  console.log("railway_identity_pinned=true");
  console.log("failure_domains_distinct=true");
  console.log("manual_bootstrap_addrs_required=false");
  console.log("learned_peer_dns_policy_changed=false");
  console.log("railway_dns_learned_via_peers_allowed=false");
  console.log("railway_dns_explicit_pinned_bootstrap_allowed=true");
  console.log("public_mode_automatic_dials=2");
  console.log("local_mode_automatic_public_dials=0");
  console.log("retry_independent=true");
  console.log("single_required_introduction=false");
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
