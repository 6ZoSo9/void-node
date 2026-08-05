#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { once } from "node:events";
import {
  AUTHORITY_KEYS,
  DECISION,
  MARKER,
  PROTOCOL,
  SOURCE_MARKER,
  canonicalJson,
  countVisiblePeers,
  sha256,
  validateObserverReport,
} from "../tools/void-public-earn-node-observer-floor-v1.mjs";

const ROOT = process.cwd();
const TOOL_PATH = "tools/void-public-earn-node-observer-floor-v1.mjs";
const SOURCE_TOOL_PATH = "tools/void-public-earn-validator-onboarding-v1.mjs";
const WRAPPER_PATH = "ops/public/verify-void-public-earn-node-observer-floor-v1.sh";
const DOC_PATH = "docs/operators/void-public-earn-node-observer-floor-v1.md";
const WORKFLOW_PATH = ".github/workflows/void-public-earn-node-observer-floor-v1.yml";
const NODE_ID = "9d89483769e469e0473b489dc50dba96";
const VALIDATED_AT = "2026-08-05T10:30:00.000Z";

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

function liveShapeReport({ connected = 2, expected = 1 } = {}) {
  const connectedPeers = Array.from({ length: connected }, (_, index) => ({
    id: `${String(index + 1).padStart(32, "0")}`,
    addr: `100.122.79.${39 + index}:4700`,
    listens: [`100.122.79.${39 + index}:4700`],
    outbound: true,
  }));
  return {
    marker: SOURCE_MARKER,
    node_base: "http://127.0.0.1:4100",
    health_reachable: true,
    health_contract_valid: true,
    readiness_reachable: true,
    readiness_contract_valid: true,
    ready: true,
    latest_block_reachable: true,
    latest_block_aligned: true,
    latest_block_number: 1_856_587,
    peer_route: "/p2p/peers",
    peer_count: connected,
    expected_peer_count: expected,
    peer_visibility_valid: connected >= expected,
    node_id: NODE_ID,
    observer_validation_ready: connected >= expected,
    consensus_validator_active: false,
    consensus_validator_activation_attempted: false,
    wallet_or_signer_accessed: false,
    details: {
      health: {
        ok: true,
        status: 200,
        error: null,
        body: { ok: true, nodeId: NODE_ID },
      },
      readiness: {
        ok: true,
        status: 200,
        error: null,
        body: {
          ready: true,
          head: 1_856_587,
          lastmile_seen: 1_856_587,
          gap: 0,
          txroot_live: 1,
          reasons: [],
        },
      },
      peers: {
        ok: true,
        status: 200,
        error: null,
        body: {
          ok: true,
          connected: connectedPeers,
          knownAddrs: [
            "100.122.245.125:4700",
            ...connectedPeers.map((entry) => entry.addr),
          ],
        },
      },
      latest: {
        ok: true,
        status: 200,
        error: null,
        body: { number: 1_856_587 },
      },
    },
  };
}

function build(report = liveShapeReport(), expected = report.expected_peer_count) {
  const reportBytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
  return validateObserverReport({
    report,
    reportBytes,
    expectedPeerCount: expected,
    validatedAt: VALIDATED_AT,
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code, code);
}

assert.equal(MARKER, "VOID_PUBLIC_EARN_NODE_OBSERVER_FLOOR_V1");
assert.equal(PROTOCOL, "void-public-earn-node-observer-floor/1");
assert.equal(DECISION, "GREEN_MINIMUM_PEER_FLOOR_SATISFIED");

const realBody = liveShapeReport().details.peers.body;
assert.equal(countVisiblePeers(realBody), 2);
assert.equal(countVisiblePeers({ peers: [{}, {}] }), 2);
assert.equal(countVisiblePeers({ connected_count: 3 }), 3);
assert.equal(countVisiblePeers([]), 0);
assert.equal(countVisiblePeers({ unknown: [] }), null);

const packet = build();
assert.deepEqual(packet, build(), "validation packet must be deterministic");
assert.match(packet.validation_id, /^voidpenof1_[0-9a-f]{64}$/);
const { validation_id: validationId, ...idBody } = packet;
assert.equal(validationId, `voidpenof1_${sha256(canonicalJson(idBody))}`);
assert.equal(packet.marker, MARKER);
assert.equal(packet.protocol, PROTOCOL);
assert.equal(packet.node.peer_count, 2);
assert.equal(packet.node.expected_peer_count, 1);
assert.equal(packet.node.excess_peer_count, 1);
assert.equal(packet.node.minimum_peer_floor_semantics, true);
assert.equal(packet.evidence.connected_array_supported, true);
assert.equal(packet.decision.exact_peer_count_required, false);
assert.equal(packet.decision.minimum_peer_count_required, true);
assert.equal(packet.decision.peer_floor_met, true);
assert.equal(packet.decision.status, DECISION);
assert.equal(Object.keys(packet.authority).length, AUTHORITY_KEYS.length);
for (const key of AUTHORITY_KEYS) assert.equal(packet.authority[key], false, key);

const exactFloor = build(liveShapeReport({ connected: 2, expected: 2 }), 2);
assert.equal(exactFloor.node.excess_peer_count, 0);
assert.equal(exactFloor.decision.peer_floor_met, true);

const arrayPeerEvidence = liveShapeReport();
arrayPeerEvidence.details.peers.body =
  arrayPeerEvidence.details.peers.body.connected;
const arrayPacket = build(arrayPeerEvidence);
assert.equal(arrayPacket.node.peer_count, 2);
assert.equal(arrayPacket.evidence.connected_array_supported, false);
assert.equal(arrayPacket.decision.peer_floor_met, true);

const excessiveRequirement = liveShapeReport({ connected: 2, expected: 3 });
expectCode(() => build(excessiveRequirement, 3), "observer_contract_not_green");

const forgedGreenAboveEvidence = liveShapeReport({ connected: 2, expected: 3 });
forgedGreenAboveEvidence.peer_visibility_valid = true;
forgedGreenAboveEvidence.observer_validation_ready = true;
expectCode(() => build(forgedGreenAboveEvidence, 3), "peer_floor_not_met");

const requestedMismatch = liveShapeReport({ connected: 2, expected: 1 });
expectCode(() => build(requestedMismatch, 2), "expected_peer_count_mismatch");

const forgedCount = liveShapeReport();
forgedCount.peer_count = 1;
expectCode(() => build(forgedCount), "peer_count_evidence_mismatch");

const duplicateEvidenceLoss = liveShapeReport();
duplicateEvidenceLoss.details.peers.body.connected = [];
expectCode(() => build(duplicateEvidenceLoss), "peer_count_evidence_mismatch");

const badNode = liveShapeReport();
badNode.node_id = "11".repeat(16);
expectCode(() => build(badNode), "node_id_evidence_mismatch");

const badHead = liveShapeReport();
badHead.details.latest.body.number += 1;
expectCode(() => build(badHead), "node_readiness_evidence_mismatch");

const unsafeObserver = liveShapeReport();
unsafeObserver.consensus_validator_activation_attempted = true;
expectCode(() => build(unsafeObserver), "observer_contract_not_green");

const rawMismatch = liveShapeReport();
expectCode(
  () => validateObserverReport({
    report: rawMismatch,
    reportBytes: Buffer.from(`${JSON.stringify({ ...rawMismatch, peer_count: 7 })}\n`),
    expectedPeerCount: 1,
    validatedAt: VALIDATED_AT,
  }),
  "observer_report_bytes_object_mismatch",
);

const sourceTool = read(SOURCE_TOOL_PATH);
for (const required of [
  'for (const key of ["peers", "connected", "items", "nodes"])',
  "peerCount >= expectedPeerCount",
  "Minimum visible peers; default 1",
  "observer_validation_ready: Boolean(healthOk && readinessOk && headAligned && peersOk)",
]) {
  assert.ok(sourceTool.includes(required), `source observer missing ${required}`);
}
for (const forbidden of [
  "peerCount === expectedPeerCount",
  "peerCount == expectedPeerCount",
  "connected.length === expectedPeerCount",
]) {
  assert.equal(sourceTool.includes(forbidden), false, `exact-count regression: ${forbidden}`);
}

const tool = read(TOOL_PATH);
for (const forbidden of [
  "fetch(",
  "JsonRpcProvider",
  "systemctl",
  "sudo",
  "signTransaction(",
  "sendTransaction(",
  "broadcastTransaction(",
  "eth_sendRawTransaction",
  "forge create",
  "cast send",
  "/mnt/key",
  "workflow_dispatch",
]) {
  assert.equal(tool.includes(forbidden), false, `forbidden operation: ${forbidden}`);
}
for (const required of [
  "reportedPeerCount < floor",
  "evidencePeerCount < floor",
  "countVisiblePeers",
  "allowArrayBody: true",
  "peer_count_evidence_mismatch",
  "output_must_not_overwrite_report",
  "minimum_peer_floor_semantics: true",
  "exact_peer_count_required: false",
]) {
  assert.ok(tool.includes(required), `validator missing ${required}`);
}

const wrapper = read(WRAPPER_PATH);
for (const required of [
  "node-check",
  "--expected-peer-count",
  "void-public-earn-node-observer-floor-v1.mjs",
  "umask 077",
  "mktemp -d",
]) {
  assert.ok(wrapper.includes(required), `wrapper missing ${required}`);
}
for (const forbidden of [
  "systemctl",
  "sudo",
  "curl -X POST",
  "ticket",
  "wc_write",
  "cast send",
]) {
  assert.equal(wrapper.includes(forbidden), false, `wrapper forbidden ${forbidden}`);
}

const doc = read(DOC_PATH);
for (const required of [
  MARKER,
  DECISION,
  "minimum, not an exact cardinality",
  "`connected` array",
  "two connected peers",
  "does not enable",
]) {
  assert.ok(doc.includes(required), `documentation missing ${required}`);
}

const workflow = read(WORKFLOW_PATH);
for (const required of [
  "actions/checkout@v6",
  "actions/setup-node@v6",
  'node-version: "22"',
  "npm ci --ignore-scripts --no-audit --no-fund",
  "node --check tools/void-public-earn-node-observer-floor-v1.mjs",
  "node --check scripts/prove_void_public_earn_node_observer_floor_v1.mjs",
  "node scripts/prove_void_public_earn_node_observer_floor_v1.mjs",
  "npm run typecheck",
  "permissions:\n  contents: read",
]) {
  assert.ok(workflow.includes(required), `workflow missing ${required}`);
}
assert.equal(workflow.includes("workflow_dispatch"), false);
assert.equal(workflow.includes("contents: write"), false);


async function runFullObserverFixture() {
  const { inspectNode } = await import(
    "../tools/void-public-earn-validator-onboarding-v1.mjs"
  );
  const connectedPeers = [
    {
      id: "63521237c1a1fcf4027ff68e45677363",
      addr: "100.122.79.39:4700",
      listens: ["100.122.79.39:4700"],
      outbound: true,
    },
    {
      id: "befd84d4fe47341af81b1a8aef8bcb97",
      addr: "100.122.198.38:4701",
      listens: ["100.122.198.38:4701"],
      outbound: true,
    },
  ];
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/health") {
      response.end(JSON.stringify({ ok: true, nodeId: NODE_ID }));
    } else if (request.url === "/__void/ready.json") {
      response.end(JSON.stringify({
        ready: true,
        head: 1_856_587,
        lastmile_seen: 1_856_587,
        gap: 0,
        txroot_live: 1,
        reasons: [],
      }));
    } else if (request.url === "/blocks/latest/number2.json") {
      response.end(JSON.stringify({ number: 1_856_587 }));
    } else if (request.url === "/p2p/peers") {
      response.end(JSON.stringify({
        ok: true,
        connected: connectedPeers,
        knownAddrs: [
          "100.122.245.125:4700",
          "100.122.79.39:4700",
          "100.122.198.38:4701",
        ],
      }));
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({ error: "not_found" }));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    const base = `http://127.0.0.1:${address.port}`;
    const minimumOne = await inspectNode(base, { expectedPeerCount: 1 });
    assert.equal(minimumOne.peer_count, 2);
    assert.equal(minimumOne.expected_peer_count, 1);
    assert.equal(minimumOne.peer_visibility_valid, true);
    assert.equal(minimumOne.observer_validation_ready, true);

    const minimumTwo = await inspectNode(base, { expectedPeerCount: 2 });
    assert.equal(minimumTwo.peer_visibility_valid, true);
    assert.equal(minimumTwo.observer_validation_ready, true);

    const minimumThree = await inspectNode(base, { expectedPeerCount: 3 });
    assert.equal(minimumThree.peer_visibility_valid, false);
    assert.equal(minimumThree.observer_validation_ready, false);
  } finally {
    server.close();
    await once(server, "close");
  }
}

if (process.env.VOID_RUN_FULL_NODE_OBSERVER_FIXTURE === "1") {
  await runFullObserverFixture();
}

console.log(JSON.stringify({
  marker: MARKER,
  validation_id: packet.validation_id,
  source_report_sha256: packet.source.report_sha256,
  peer_count: packet.node.peer_count,
  expected_peer_count: packet.node.expected_peer_count,
  excess_peer_count: packet.node.excess_peer_count,
  connected_array_supported: packet.evidence.connected_array_supported,
  exact_peer_count_required: false,
  minimum_peer_count_required: true,
  observer_validation_ready: true,
  mutation_authorized: false,
  decision: DECISION,
  status: "GREEN",
}, null, 2));
console.log(`${MARKER}_PROOF_GREEN`);
