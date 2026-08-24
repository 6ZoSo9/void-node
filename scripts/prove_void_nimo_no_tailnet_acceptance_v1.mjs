#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  assertNoTailnetMachineV1,
  isTailnetCgnatIpv4V1,
  validateBootstrapManifestNoTailnetV1,
  validateHeadSnapshotV1,
  validatePeersSnapshotV1,
  validateReadySnapshotV1,
} from "../tools/void-nimo-no-tailnet-acceptance-v1.mjs";

function throws(fn, pattern) {
  assert.throws(fn, pattern);
}

const authority = Object.freeze({
  private_routes_exposed: false,
  wallet_authority: false,
  signer_authority: false,
  validator_authority: false,
  treasury_authority: false,
  work_credit_authority: false,
  money_movement_authority: false,
});

const stable = {
  schema: "void_public_bootstrap_v1",
  network: "VOID Network",
  chain_id: 2050,
  status: "stable_https_seed",
  private_tailnet_endpoints_published: false,
  authority,
  sync_endpoints: [
    {
      transport: "https",
      base: "https://seed.voidchain.org",
      priority: 1,
      enabled: true,
      temporary: false,
      qualification_id: `voidpsq1_${"1".repeat(64)}`,
      qualified_at: "2026-08-24T12:00:00.000Z",
      qualified_head: 1951058,
    },
  ],
  onion_endpoints: [],
};

const stableDecision = validateBootstrapManifestNoTailnetV1(stable);
assert.equal(stableDecision.stable, true);
assert.equal(stableDecision.endpoint_count, 1);

const hold = {
  ...stable,
  status: "hold_no_stable_seed",
  sync_endpoints: [],
};
assert.deepEqual(
  validateBootstrapManifestNoTailnetV1(hold, { requireStable: false }),
  { stable: false, endpoint_count: 0 },
);
throws(
  () => validateBootstrapManifestNoTailnetV1(hold),
  /stable public HTTPS seed is not published/,
);

throws(
  () => validateBootstrapManifestNoTailnetV1({
    ...stable,
    private_tailnet_endpoints_published: true,
  }),
  /publishes private Tailnet endpoints/,
);

throws(
  () => validateBootstrapManifestNoTailnetV1({
    ...stable,
    sync_endpoints: [{ ...stable.sync_endpoints[0], base: "https://100.100.1.2" }],
  }),
  /not acceptable public HTTPS/,
);

throws(
  () => validateBootstrapManifestNoTailnetV1({
    ...stable,
    sync_endpoints: [{ ...stable.sync_endpoints[0], base: "https://seed.example.ts.net" }],
  }),
  /not acceptable public HTTPS/,
);

assert.equal(isTailnetCgnatIpv4V1("100.64.0.1"), true);
assert.equal(isTailnetCgnatIpv4V1("100.127.255.254"), true);
assert.equal(isTailnetCgnatIpv4V1("100.128.0.1"), false);
assert.equal(isTailnetCgnatIpv4V1("8.8.8.8"), false);

const cleanMachine = assertNoTailnetMachineV1({
  interfaces: [
    {
      ifname: "eth0",
      addr_info: [
        { family: "inet", local: "192.168.1.50" },
        { family: "inet6", local: "2001:4860:4860::8888" },
      ],
    },
  ],
  processText: "systemd\nnode void-node",
  tailscaleBinaryPresent: false,
  environment: {},
});
assert.equal(cleanMachine.tailnet_address_present, false);

throws(
  () => assertNoTailnetMachineV1({ tailscaleBinaryPresent: true }),
  /tailscale executable is present/,
);
throws(
  () => assertNoTailnetMachineV1({
    interfaces: [{ ifname: "tailscale0", addr_info: [] }],
  }),
  /Tailnet interface present/,
);
throws(
  () => assertNoTailnetMachineV1({
    interfaces: [{ ifname: "eth0", addr_info: [{ local: "100.88.2.3" }] }],
  }),
  /Tailnet\/CGNAT local address present/,
);
throws(
  () => assertNoTailnetMachineV1({
    environment: { BOOTSTRAP_ADDRS: "100.122.245.125:4700" },
  }),
  /BOOTSTRAP_ADDRS contains Tailnet\/Tailscale transport state/,
);
throws(
  () => assertNoTailnetMachineV1({
    environment: { VOID_MAIN_BASE: "https://node.example.ts.net" },
  }),
  /VOID_MAIN_BASE contains Tailnet\/Tailscale transport state/,
);

assert.equal(validateHeadSnapshotV1({ number: 1951058 }), 1951058);
throws(() => validateHeadSnapshotV1({ number: 0 }), /positive safe integer/);

validateReadySnapshotV1({ ready: true, gap: 0, txroot_live: 1, reasons: [] });
throws(
  () => validateReadySnapshotV1({ ready: true, gap: 1, txroot_live: 1, reasons: [] }),
  /gap is not zero/,
);
throws(
  () => validateReadySnapshotV1({ ready: true, gap: 0, txroot_live: 0, reasons: [] }),
  /txroot_live is not 1/,
);

assert.deepEqual(
  validatePeersSnapshotV1({
    connected: [{ id: "peer-a" }],
    verifiedPeers: [{ node_id: "peer-a" }],
  }),
  { connected_count: 1, verified_count: 1 },
);
throws(
  () => validatePeersSnapshotV1({ connected: [], verifiedPeers: [] }),
  /no connected P2P peer/,
);
throws(
  () => validatePeersSnapshotV1({ connected: [{ id: "peer-a" }], verifiedPeers: [] }),
  /no verified P2P peer/,
);

const toolText = fs.readFileSync("tools/void-nimo-no-tailnet-acceptance-v1.mjs", "utf8");
const docText = fs.readFileSync("docs/operations/void-nimo-no-tailnet-onboarding-v1.md", "utf8");
const workflowText = fs.readFileSync(".github/workflows/void-nimo-no-tailnet-acceptance-v1.yml", "utf8");

for (const forbidden of [
  "tailscale up",
  "systemctl restart",
  "systemctl start",
  "apt-get install tailscale",
  "100.122.245.125",
  "100.122.198.38",
  "100.122.79.39",
]) {
  assert.equal(toolText.includes(forbidden), false, `tool contains forbidden live dependency: ${forbidden}`);
}

assert.match(docText, /VOID_PUBLIC_BOOTSTRAP_REQUIRE=1 \.\/run-void-node\.sh/);
assert.match(docText, /Do not set `BOOTSTRAP_ADDRS` manually/);
assert.match(docText, /current canonical manifest remains `hold_no_stable_seed`/);
assert.match(workflowText, /node-version: \[22, 24, 26\]/);
assert.match(workflowText, /prove_void_nimo_no_tailnet_acceptance_v1\.mjs/);

console.log("VOID_NIMO_NO_TAILNET_ACCEPTANCE_V1_PROOF_GREEN");
console.log("tailscale_required=false");
console.log("private_100x_bootstrap_accepted=false");
console.log("stable_public_https_seed_required=true");
console.log("ready_gap_zero_required=true");
console.log("txroot_live_required=true");
console.log("verified_p2p_peer_required=true");
console.log("runtime_mutation_authority=false");
console.log("wallet_signer_validator_wc_money_authority=0");
