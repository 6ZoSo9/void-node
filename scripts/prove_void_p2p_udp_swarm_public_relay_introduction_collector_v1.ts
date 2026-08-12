// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import type { Node } from "../src/node_core.js";
import {
  createVoidUdpSwarmNodeRuntimeMountV1,
  type VoidUdpSwarmNodeRuntimeEnvironmentV1,
} from "../src/p2p/udp_swarm_node_runtime_mount_v1.js";
import {
  VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_AUTHORITY_V1,
  VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1,
  VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_BYTES_V1,
  VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_SCHEMA_V1,
  VoidUdpSwarmPublicRelayIntroductionCollectorV1,
  composeVoidP2pUdpSwarmRoutesFromPublicRelayIntroductionV1,
  fetchVoidUdpSwarmPublicRelayIntroductionV1,
  type VoidUdpSwarmPublicRelayIntroductionNodeV1,
} from "../src/p2p/udp_swarm_public_relay_introduction_collector_v1.js";

const MARKER =
  "VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1_PROOF_GREEN";
const NOW = Date.now();
const RELAY_A = "1".repeat(32);
const RELAY_B = "2".repeat(32);
const TARGET = "3".repeat(32);
const DISCOVERY_ID = `voidpud1_${"4".repeat(64)}`;
const RECORD_ID = `voidpbr2_${"5".repeat(64)}`;
const MANIFEST_ID = `voidpbm1_${"6".repeat(64)}`;

function identity() {
  const pair = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = pair.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const nodeId = crypto
    .createHash("sha256")
    .update(publicKeyPem)
    .digest("hex")
    .slice(0, 32);
  return Object.freeze({
    nodeId,
    publicKeyPem,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
  });
}

function deepFreeze<T>(raw: T): T {
  if (!raw || typeof raw !== "object" || Object.isFrozen(raw)) return raw;
  for (const value of Object.values(raw)) deepFreeze(value);
  return Object.freeze(raw);
}

function envelope(discoveryId = DISCOVERY_ID) {
  return {
    schema: VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_SCHEMA_V1,
    signed_record_id: {
      schema: "synthetic_signed_record_id_v1",
      record_id: RECORD_ID,
    },
    locator_mirrors: [
      { transport: "https", base_url: "https://a.example/void/bootstrap/v2", failure_domain: "a" },
      { transport: "https", base_url: "https://b.example/void/bootstrap/v2", failure_domain: "b" },
      { transport: "https", base_url: "https://c.example/void/bootstrap/v2", failure_domain: "c" },
    ],
    discovery: { discovery_id: discoveryId },
  };
}

function composition(localNodeId: string) {
  assert.notEqual(localNodeId, RELAY_A);
  assert.notEqual(localNodeId, RELAY_B);
  assert.notEqual(localNodeId, TARGET);
  return deepFreeze({
    marker: "void_p2p_udp_swarm_verified_discovery_composition_v1",
    record_id: RECORD_ID,
    manifest_id: MANIFEST_ID,
    discovery_id: DISCOVERY_ID,
    expires_at: new Date(NOW + 5 * 60_000).toISOString(),
    route_count: 2,
    source_count: 3,
    relay_count: 2,
    target_count: 1,
    relay_failure_domain_count: 2,
    n_minus_one_relay_coverage_verified: true,
    environment: {
      VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED: "1",
      VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES:
        `${RELAY_A}/${TARGET},${RELAY_B}/${TARGET}`,
    },
    transport_is_authority: false,
    wallet_signer_validator_wc_money_authority: 0,
    network_io_implemented: false,
    environment_mutation_performed: false,
    launcher_activation_performed: false,
    deployment_performed: false,
    service_restart_performed: false,
  });
}

function peer(id: ReturnType<typeof identity>, listens: string[], transport = "direct") {
  return {
    id: id.nodeId,
    handshakeDone: true,
    authenticatedPublicPem: id.publicKeyPem,
    listens,
    transport,
  };
}

function fakeNode(
  local: ReturnType<typeof identity>,
  peers: Map<string, unknown>,
) {
  return {
    id: local.nodeId,
    peers,
    onUdpSwarmProbeAction: undefined,
    onUdpSwarmDirectUpgradeOffer: undefined,
    ingestUdpSwarmRendezvousProbeV1() {
      return { ok: false };
    },
    stageUdpSwarmAuthenticatedDirectCandidateV1() {
      return false;
    },
    udpSwarmAuthenticatedDirectCandidateSnapshotV1() {
      return { candidates: [] };
    },
    udpSwarmPromotedDirectRouteSnapshotV1() {
      return { routes: [] };
    },
    relaySnapshot() {
      return { client_reservations: [], streams: [] };
    },
    udpSwarmControlSnapshot() {
      return { pending_requests: [], active_routes: [] };
    },
    requestRelayReservation() {
      return null;
    },
    connectViaRelay() {
      return null;
    },
    requestUdpSwarmUpgradeV1() {
      return false;
    },
  };
}

function directCollectorNode(
  localNodeId: string,
  peers: Map<string, unknown>,
): VoidUdpSwarmPublicRelayIntroductionNodeV1 {
  return { id: localNodeId, peers };
}

const local = identity();
const sourceA = identity();
const sourceB = identity();
const sourceC = identity();

const originalFetch = globalThis.fetch;
let fetchOptionsVerified = false;
globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
  assert.equal(init?.method, "GET");
  assert.equal(init?.redirect, "error");
  assert.deepEqual(init?.headers, { accept: "application/json" });
  fetchOptionsVerified = true;
  return new Response(JSON.stringify(envelope()), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}) as typeof fetch;
assert.deepEqual(
  await fetchVoidUdpSwarmPublicRelayIntroductionV1({
    source_node_id: sourceA.nodeId,
    url: "http://8.8.8.8:4100/.well-known/void-p2p-udp-swarm-relay-introductions-v1.json",
  }),
  envelope(),
);
assert.equal(fetchOptionsVerified, true);

let oversizedBodyCancelled = false;
let oversizedBodyPulls = 0;
globalThis.fetch = (async () =>
  new Response(
    new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          oversizedBodyPulls += 1;
          controller.enqueue(new Uint8Array(128 * 1024));
        },
        cancel() {
          oversizedBodyCancelled = true;
        },
      },
      { highWaterMark: 0 },
    ),
    { status: 200, headers: { "content-type": "application/json" } },
  )) as typeof fetch;
await assert.rejects(
  fetchVoidUdpSwarmPublicRelayIntroductionV1({
    source_node_id: sourceA.nodeId,
    url: "http://8.8.8.8:4100/.well-known/void-p2p-udp-swarm-relay-introductions-v1.json",
  }),
  /exceeds its bound/,
);
assert.equal(oversizedBodyCancelled, true);
assert.ok(oversizedBodyPulls <= 3);

globalThis.fetch = (async () =>
  new Response(JSON.stringify(envelope()), {
    status: 200,
    headers: { "content-type": "text/plain" },
  })) as typeof fetch;
await assert.rejects(
  fetchVoidUdpSwarmPublicRelayIntroductionV1({
    source_node_id: sourceA.nodeId,
    url: "http://8.8.8.8:4100/.well-known/void-p2p-udp-swarm-relay-introductions-v1.json",
  }),
  /content type is not JSON/,
);
globalThis.fetch = originalFetch;

const peers = new Map<string, unknown>([
  [sourceA.nodeId, peer(sourceA, ["8.8.8.8:4700"])],
  [sourceB.nodeId, peer(sourceB, ["9.9.9.9:4701"], "relay")],
  [sourceC.nodeId, peer(sourceC, ["192.168.1.20:4702"])],
]);
const node = fakeNode(local, peers);
const config: VoidUdpSwarmNodeRuntimeEnvironmentV1 = Object.freeze({
  enabled: true,
  relay_server_enabled: false,
  relay_public_endpoint: null,
  family: "udp4",
  bind_host: "127.0.0.1",
  bind_port: 0,
  allow_nonpublic_endpoints: true,
  orchestration_enabled: false,
  orchestration_routes: Object.freeze([]),
});
const mount = await createVoidUdpSwarmNodeRuntimeMountV1({
  node: node as unknown as Node,
  identity: {
    nodeId: local.nodeId,
    pubPEM: local.publicKeyPem,
    privateKey: local.privateKey,
  },
  config,
});

const fetchedUrls: string[] = [];
let compositionCalls = 0;
let exactAuthenticatedSourceBinding = false;
const releaseRoot = Object.freeze({ marker: "synthetic_release_root" });
const collector = await mount.startPublicRelayIntroductionCollectorV1({
  releaseRoot,
  intervalMs: 10_000,
  nowMs: () => NOW,
  async fetchIntroduction(candidate) {
    fetchedUrls.push(candidate.url);
    return JSON.stringify(envelope(), null, candidate.source_node_id === sourceA.nodeId ? 0 : 2);
  },
  async fetchRecordBytes() {
    throw new Error("stub composition must not fetch a record");
  },
  async fetchManifestBytes() {
    throw new Error("stub composition must not fetch a manifest");
  },
  async composeVerifiedDiscovery(input) {
    compositionCalls += 1;
    assert.equal(input.releaseRoot, releaseRoot);
    assert.equal(input.localNodeId, local.nodeId);
    assert.equal(input.nowMs, NOW);
    assert.equal((input.discovery as { discovery_id: string }).discovery_id, DISCOVERY_ID);
    const sources = input.authenticatedDiscoverySources as Array<{
      node_id: string;
      public_key_pem: string;
    }>;
    assert.deepEqual(
      sources.map((entry) => entry.node_id).sort(),
      [sourceA.nodeId, sourceB.nodeId, sourceC.nodeId].sort(),
    );
    for (const source of [sourceA, sourceB, sourceC]) {
      assert.equal(
        sources.find((entry) => entry.node_id === source.nodeId)?.public_key_pem,
        source.publicKeyPem,
      );
    }
    exactAuthenticatedSourceBinding = true;
    return composition(local.nodeId);
  },
});

assert.equal(compositionCalls, 1);
assert.equal(exactAuthenticatedSourceBinding, true);
assert.deepEqual(fetchedUrls.sort(), [
  "http://8.8.8.8:4100/.well-known/void-p2p-udp-swarm-relay-introductions-v1.json",
  "http://9.9.9.9:4101/.well-known/void-p2p-udp-swarm-relay-introductions-v1.json",
]);
const collectorStatus = collector.status() as any;
assert.equal(collectorStatus.marker, VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1);
assert.equal(collectorStatus.last_outcome.status, "activated");
assert.equal(collectorStatus.last_outcome.authenticated_source_count, 3);
assert.equal(collectorStatus.last_outcome.transport_candidate_count, 2);
assert.equal(collectorStatus.last_outcome.successful_transport_count, 2);
assert.equal(collectorStatus.last_outcome.matching_transport_group_count, 1);
assert.equal(collectorStatus.last_outcome.route_count, 2);
const runtimeStatus = mount.status() as any;
assert.equal(runtimeStatus.verified_discovery.active, true);
assert.equal(runtimeStatus.orchestration.route_source, "verified_discovery");
assert.equal(runtimeStatus.orchestration.route_count, 2);
assert.equal(runtimeStatus.public_relay_introduction.last_outcome.activated, true);
assert.equal(
  JSON.stringify(runtimeStatus).includes(sourceA.nodeId) ||
    JSON.stringify(runtimeStatus).includes(sourceA.publicKeyPem) ||
    JSON.stringify(runtimeStatus).includes("8.8.8.8"),
  false,
);
assert.equal(
  runtimeStatus.authority.public_relay_introduction_transport_is_authority,
  false,
);
assert.equal(
  collectorStatus.authority,
  VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_AUTHORITY_V1,
);

const splitCollector = new VoidUdpSwarmPublicRelayIntroductionCollectorV1({
  node: directCollectorNode(local.nodeId, peers),
  releaseRoot,
  intervalMs: 10_000,
  nowMs: () => NOW,
  async fetchIntroduction(candidate) {
    return candidate.source_node_id === sourceA.nodeId
      ? envelope(DISCOVERY_ID)
      : envelope(`voidpud1_${"7".repeat(64)}`);
  },
  async fetchRecordBytes() {
    return "{}";
  },
  async fetchManifestBytes() {
    return "{}";
  },
  async composeVerifiedDiscovery() {
    assert.fail("split transport responses must not reach composition");
  },
  activateVerifiedComposition() {
    assert.fail("split transport responses must not reach activation");
  },
});
assert.equal(
  (await splitCollector.runOnce()).reason,
  "insufficient_matching_transport_responses",
);
splitCollector.stop();

const invalidPeers = new Map(peers);
invalidPeers.set(sourceB.nodeId, {
  ...peer(sourceB, ["9.9.9.9:4701"]),
  authenticatedPublicPem: sourceA.publicKeyPem,
});
let invalidFetches = 0;
const invalidPeerCollector = new VoidUdpSwarmPublicRelayIntroductionCollectorV1({
  node: directCollectorNode(local.nodeId, invalidPeers),
  releaseRoot,
  intervalMs: 10_000,
  async fetchIntroduction() {
    invalidFetches += 1;
    return envelope();
  },
  async fetchRecordBytes() {
    return "{}";
  },
  async fetchManifestBytes() {
    return "{}";
  },
  async composeVerifiedDiscovery() {
    assert.fail("invalid authenticated peer invariant must fail before composition");
  },
  activateVerifiedComposition() {
    assert.fail("invalid authenticated peer invariant must fail before activation");
  },
});
assert.equal(
  (await invalidPeerCollector.runOnce()).reason,
  "authenticated_peer_invariant_invalid",
);
assert.equal(invalidFetches, 0);
invalidPeerCollector.stop();

const privatePeers = new Map<string, unknown>([
  [sourceA.nodeId, peer(sourceA, ["8.8.8.8:4700"])],
  [sourceB.nodeId, peer(sourceB, ["192.168.1.21:4701"])],
]);
const singleTransportCollector = new VoidUdpSwarmPublicRelayIntroductionCollectorV1({
  node: directCollectorNode(local.nodeId, privatePeers),
  releaseRoot,
  intervalMs: 10_000,
  async fetchIntroduction() {
    assert.fail("one public transport source must hold before fetching");
  },
  async fetchRecordBytes() {
    return "{}";
  },
  async fetchManifestBytes() {
    return "{}";
  },
  async composeVerifiedDiscovery() {
    assert.fail("one public transport source must hold before composition");
  },
  activateVerifiedComposition() {
    assert.fail("one public transport source must hold before activation");
  },
});
assert.equal(
  (await singleTransportCollector.runOnce()).reason,
  "insufficient_public_transport_sources",
);
singleTransportCollector.stop();

const rejectedCompositionCollector = new VoidUdpSwarmPublicRelayIntroductionCollectorV1({
  node: directCollectorNode(local.nodeId, peers),
  releaseRoot,
  intervalMs: 10_000,
  nowMs: () => NOW,
  async fetchIntroduction() {
    return envelope();
  },
  async fetchRecordBytes() {
    return "{}";
  },
  async fetchManifestBytes() {
    return "{}";
  },
  async composeVerifiedDiscovery() {
    throw new Error("proof composition rejection");
  },
  activateVerifiedComposition() {
    assert.fail("rejected composition must not reach activation");
  },
});
assert.equal(
  (await rejectedCompositionCollector.runOnce()).reason,
  "verified_composition_rejected",
);
rejectedCompositionCollector.stop();

const rejectedActivationCollector = new VoidUdpSwarmPublicRelayIntroductionCollectorV1({
  node: directCollectorNode(local.nodeId, peers),
  releaseRoot,
  intervalMs: 10_000,
  nowMs: () => NOW,
  async fetchIntroduction() {
    return envelope();
  },
  async fetchRecordBytes() {
    return "{}";
  },
  async fetchManifestBytes() {
    return "{}";
  },
  async composeVerifiedDiscovery() {
    return composition(local.nodeId);
  },
  activateVerifiedComposition() {
    throw new Error("proof activation rejection");
  },
});
assert.equal(
  (await rejectedActivationCollector.runOnce()).reason,
  "runtime_activation_rejected",
);
rejectedActivationCollector.stop();

let defaultCompositionError = "";
try {
  await composeVoidP2pUdpSwarmRoutesFromPublicRelayIntroductionV1(
    {
      signedRecordId: envelope().signed_record_id,
      locatorMirrors: envelope().locator_mirrors,
      discovery: envelope().discovery,
      localNodeId: local.nodeId,
      authenticatedDiscoverySources: [
        { node_id: sourceA.nodeId, public_key_pem: sourceA.publicKeyPem },
        { node_id: sourceB.nodeId, public_key_pem: sourceB.publicKeyPem },
      ],
      nowMs: NOW,
    },
    {
      releaseRoot: {},
      async fetchRecordBytes() {
        return "{}";
      },
      async fetchManifestBytes() {
        return "{}";
      },
    },
  );
} catch (error) {
  defaultCompositionError = error instanceof Error ? error.message : String(error);
}
assert.ok(defaultCompositionError);
assert.doesNotMatch(defaultCompositionError, /module is unavailable|Cannot find module/);

await mount.stop();
assert.equal(collector.status().stopped, true);

console.log(`marker=${VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1}`);
console.log("authenticated_source_count=3");
console.log("independent_transport_source_count=2");
console.log("manual_transport_addresses_required=false");
console.log("matching_transport_quorum_required=true");
console.log(`transport_response_max_bytes=${VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_BYTES_V1}`);
console.log("bounded_streaming_fetch_verified=true");
console.log("existing_verified_composition_invoked=true");
console.log("existing_runtime_activation_invoked=true");
console.log("peer_identity_exposed_in_status=false");
console.log("deployment=none");
console.log("service_restart=none");
console.log(MARKER);
