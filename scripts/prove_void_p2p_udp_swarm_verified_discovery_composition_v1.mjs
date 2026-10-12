#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
  VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
  VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
  voidBootstrapRecordReleaseKeyIdV1,
  voidBootstrapRecordReleaseRootIdV1,
  voidBootstrapRecordSigningPayloadV1,
} from "./lib/void_bootstrap_record_release_root_v1.mjs";
import {
  buildBootstrapRecordV2,
  contentId,
} from "./lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs";
import {
  VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1,
  VOID_P2P_UDP_SWARM_DISCOVERY_POLICY_V1,
  VOID_P2P_UDP_SWARM_DISCOVERY_SCHEMA_V1,
  VOID_P2P_UDP_SWARM_RELAY_INTRODUCTION_SCHEMA_V1,
  VOID_P2P_UDP_SWARM_RELAY_INTRODUCTION_SIGNATURE_DOMAIN_V1,
  VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_COMPOSITION_V1,
  composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1,
  voidP2pUdpSwarmDiscoveryIdV1,
  voidP2pUdpSwarmRelayIntroductionSigningPayloadV1,
} from "./lib/void_p2p_udp_swarm_verified_discovery_composition_v1.mjs";
import {
  parseVoidUdpSwarmRelayOrchestrationRoutesV1,
} from "../src/p2p/udp_swarm_relay_orchestrator_v1.js";

const MARKER =
  "VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_COMPOSITION_V1_PROOF_GREEN";
const NOW = Date.parse("2026-08-12T13:00:00.000Z");
const GENERATED_AT = new Date(NOW - 10_000).toISOString();
const OBSERVED_AT = new Date(NOW - 30_000).toISOString();
const EXPIRES_AT = new Date(NOW + 5 * 60_000).toISOString();
const RELAY_A = "a".repeat(32);
const RELAY_B = "b".repeat(32);
const TARGET = "c".repeat(32);
const LOCAL = "d".repeat(32);
const AUTHORITY = VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1;

function base32NoPadding(bytes) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += alphabet[(value >>> bits) & 31];
      value &= (1 << bits) - 1;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function torV3Hostname(label) {
  const publicKey = crypto
    .createHash("sha256")
    .update(`void-verified-discovery-composition:${label}`)
    .digest()
    .subarray(0, 32);
  const checksum = crypto
    .createHash("sha3-256")
    .update(Buffer.from(".onion checksum", "ascii"))
    .update(publicKey)
    .update(Buffer.from([3]))
    .digest()
    .subarray(0, 2);
  return `${base32NoPadding(Buffer.concat([
    publicKey,
    checksum,
    Buffer.from([3]),
  ]))}.onion`;
}

function publicKeyEntry(publicKey) {
  const der = publicKey.export({ type: "spki", format: "der" });
  return Object.freeze({
    key_id: voidBootstrapRecordReleaseKeyIdV1(der),
    algorithm: "ed25519",
    public_key_spki_base64: Buffer.from(der).toString("base64"),
  });
}

function activeRoot(keyEntries, threshold) {
  const root = {
    schema: VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
    network: "VOID Network",
    chain_id: 2050,
    status: "active",
    signature_domain: VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
    threshold,
    keys: [...keyEntries].sort((a, b) => a.key_id.localeCompare(b.key_id)),
    authority: AUTHORITY,
    root_id: "",
  };
  root.root_id = voidBootstrapRecordReleaseRootIdV1(root);
  return root;
}

function signedRecordEnvelope(root, recordId, signers) {
  const payload = voidBootstrapRecordSigningPayloadV1(root, recordId);
  return Object.freeze({
    schema: VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
    root_id: root.root_id,
    record_id: recordId,
    signatures: signers
      .map(({ keyId, privateKey }) => ({
        key_id: keyId,
        signature_base64: crypto
          .sign(null, payload, privateKey)
          .toString("base64"),
      }))
      .sort((a, b) => a.key_id.localeCompare(b.key_id)),
  });
}

function sourceIdentity() {
  const pair = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = pair.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  return Object.freeze({
    privateKey: pair.privateKey,
    publicKeyPem,
    nodeId: crypto
      .createHash("sha256")
      .update(publicKeyPem)
      .digest("hex")
      .slice(0, 32),
  });
}

function signedIntroduction({
  source,
  recordId,
  manifestId,
  relayNodeId,
  targetNodeId = TARGET,
  relayFailureDomain,
  observedAt = OBSERVED_AT,
}) {
  const body = {
    schema: VOID_P2P_UDP_SWARM_RELAY_INTRODUCTION_SCHEMA_V1,
    signature_domain:
      VOID_P2P_UDP_SWARM_RELAY_INTRODUCTION_SIGNATURE_DOMAIN_V1,
    network: "VOID Network",
    chain_id: 2050,
    record_id: recordId,
    manifest_id: manifestId,
    source_node_id: source.nodeId,
    relay_node_id: relayNodeId,
    target_node_id: targetNodeId,
    relay_failure_domain: relayFailureDomain,
    observed_at: observedAt,
  };
  return Object.freeze({
    ...body,
    source_public_key_pem: source.publicKeyPem,
    signature_hex: crypto
      .sign(
        null,
        voidP2pUdpSwarmRelayIntroductionSigningPayloadV1(body),
        source.privateKey,
      )
      .toString("hex"),
  });
}

function discoveryFor(recordId, manifestId, observations, overrides = {}) {
  const discovery = {
    schema: VOID_P2P_UDP_SWARM_DISCOVERY_SCHEMA_V1,
    network: "VOID Network",
    chain_id: 2050,
    record_id: recordId,
    manifest_id: manifestId,
    generated_at: GENERATED_AT,
    expires_at: EXPIRES_AT,
    observations,
    policy: VOID_P2P_UDP_SWARM_DISCOVERY_POLICY_V1,
    authority: AUTHORITY,
    discovery_id: "",
    ...overrides,
  };
  discovery.discovery_id = voidP2pUdpSwarmDiscoveryIdV1(discovery);
  return discovery;
}

async function expectReject(run, pattern) {
  let failure;
  try {
    await run();
  } catch (error) {
    failure = error;
  }
  assert(failure, "expected verified discovery composition to reject");
  assert.match(String(failure.message || failure), pattern);
}

const stableManifest = {
  schema: "void_public_bootstrap_v1",
  network: "VOID Network",
  chain_id: 2050,
  status: "stable_https_seed",
  generated_at: new Date(NOW - 60_000).toISOString(),
  expires_at: new Date(NOW + 3 * 60 * 60_000).toISOString(),
  sync_endpoints: [
    {
      transport: "https",
      base: "https://seed-a.example",
      priority: 10,
      enabled: true,
      temporary: false,
      qualification_id: `voidpsq1_${"1".repeat(64)}`,
      qualified_at: new Date(NOW - 60_000).toISOString(),
      qualified_head: 1_856_587,
    },
  ],
  onion_endpoints: [],
  private_tailnet_endpoints_published: false,
  authority: AUTHORITY,
  notes: "Proof-only stable public HTTPS seed fixture.",
  manifest_id: "",
};
stableManifest.manifest_id = contentId("voidpbm1_", stableManifest, "manifest_id");
const manifestBytes = Buffer.from(`${JSON.stringify(stableManifest)}\n`);

const manifestMirrors = [
  {
    transport: "https",
    base_url: "https://manifest-a.example/void/bootstrap/v2",
    failure_domain: "manifest-a",
  },
  {
    transport: "https",
    base_url: "https://manifest-b.example/void/bootstrap/v2",
    failure_domain: "manifest-b",
  },
  {
    transport: "tor_http",
    base_url: `http://${torV3Hostname("manifest-tor")}/void/bootstrap/v2`,
    failure_domain: "manifest-tor",
  },
];
const locatorMirrors = [
  {
    transport: "https",
    base_url: "https://locator-a.example/void/bootstrap/v2",
    failure_domain: "locator-a",
  },
  {
    transport: "https",
    base_url: "https://locator-b.example/void/bootstrap/v2",
    failure_domain: "locator-b",
  },
  {
    transport: "tor_http",
    base_url: `http://${torV3Hostname("locator-tor")}/void/bootstrap/v2`,
    failure_domain: "locator-tor",
  },
];
const record = buildBootstrapRecordV2({
  manifestBytes,
  mirrors: manifestMirrors,
  generatedAt: new Date(NOW - 60_000).toISOString(),
  expiresAt: new Date(NOW + 3 * 60 * 60_000).toISOString(),
});

const releaseKeyA = crypto.generateKeyPairSync("ed25519");
const releaseKeyB = crypto.generateKeyPairSync("ed25519");
const releaseEntryA = publicKeyEntry(releaseKeyA.publicKey);
const releaseEntryB = publicKeyEntry(releaseKeyB.publicKey);
const releaseRoot = activeRoot([releaseEntryA, releaseEntryB], 2);
const signedRecordId = signedRecordEnvelope(releaseRoot, record.record_id, [
  { keyId: releaseEntryA.key_id, privateKey: releaseKeyA.privateKey },
  { keyId: releaseEntryB.key_id, privateKey: releaseKeyB.privateKey },
]);

const sourceA = sourceIdentity();
const sourceB = sourceIdentity();
const sourceC = sourceIdentity();
const observations = [
  signedIntroduction({
    source: sourceA,
    recordId: record.record_id,
    manifestId: stableManifest.manifest_id,
    relayNodeId: RELAY_A,
    relayFailureDomain: "relay-a",
  }),
  signedIntroduction({
    source: sourceB,
    recordId: record.record_id,
    manifestId: stableManifest.manifest_id,
    relayNodeId: RELAY_A,
    relayFailureDomain: "relay-a",
  }),
  signedIntroduction({
    source: sourceB,
    recordId: record.record_id,
    manifestId: stableManifest.manifest_id,
    relayNodeId: RELAY_B,
    relayFailureDomain: "relay-b",
  }),
  signedIntroduction({
    source: sourceC,
    recordId: record.record_id,
    manifestId: stableManifest.manifest_id,
    relayNodeId: RELAY_B,
    relayFailureDomain: "relay-b",
  }),
];
const discovery = discoveryFor(
  record.record_id,
  stableManifest.manifest_id,
  observations,
);

let recordFetchCount = 0;
let manifestFetchCount = 0;
const common = {
  releaseRoot,
  signedRecordId,
  locatorMirrors,
  localNodeId: LOCAL,
  authenticatedDiscoverySources: [sourceA, sourceB, sourceC].map(
    (source) => ({
      node_id: source.nodeId,
      public_key_pem: source.publicKeyPem,
    }),
  ),
  nowMs: NOW,
  async fetchRecordBytes({ mirror }) {
    recordFetchCount += 1;
    if (mirror.failure_domain === "locator-a") {
      throw new Error("synthetic locator outage");
    }
    return `${JSON.stringify(record)}\n`;
  },
  async fetchManifestBytes({ mirror }) {
    manifestFetchCount += 1;
    if (mirror.failure_domain === "manifest-a") {
      throw new Error("synthetic manifest outage");
    }
    return manifestBytes;
  },
};

const composed =
  await composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1({
    ...common,
    discovery,
  });
assert.equal(
  composed.marker,
  VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_COMPOSITION_V1,
);
assert.equal(composed.expires_at, EXPIRES_AT);
assert.equal(composed.route_count, 2);
assert.equal(composed.source_count, 3);
assert.equal(composed.relay_count, 2);
assert.equal(composed.target_count, 1);
assert.equal(composed.relay_failure_domain_count, 2);
assert.equal(composed.n_minus_one_relay_coverage_verified, true);
assert.equal(recordFetchCount, 2);
assert.equal(manifestFetchCount, 2);
assert.deepEqual(
  parseVoidUdpSwarmRelayOrchestrationRoutesV1(
    composed.environment.VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES,
  ),
  [
    { relay_node_id: RELAY_A, target_node_id: TARGET },
    { relay_node_id: RELAY_B, target_node_id: TARGET },
  ],
);
assert.equal(
  composed.environment.VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED,
  "1",
);
assert.equal(composed.environment_mutation_performed, false);
assert.equal(composed.launcher_activation_performed, false);
assert.equal(composed.deployment_performed, false);
assert.equal(composed.service_restart_performed, false);
assert(Object.isFrozen(composed));
assert(Object.isFrozen(composed.environment));

const tamperedObservations = structuredClone(observations);
tamperedObservations[0].signature_hex = "0".repeat(128);
await expectReject(
  () =>
    composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1({
      ...common,
      discovery: discoveryFor(
        record.record_id,
        stableManifest.manifest_id,
        tamperedObservations,
      ),
    }),
  /signature is invalid/,
);

const weakObservations = [
  observations[0],
  ...[sourceA, sourceB, sourceC].map((source) =>
    signedIntroduction({
      source,
      recordId: record.record_id,
      manifestId: stableManifest.manifest_id,
      relayNodeId: RELAY_B,
      relayFailureDomain: "relay-b",
    }),
  ),
];
await expectReject(
  () =>
    composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1({
      ...common,
      discovery: discoveryFor(
        record.record_id,
        stableManifest.manifest_id,
        weakObservations,
      ),
    }),
  /lacks independent signed source quorum/,
);

const sameDomainObservations = observations.map((entry, index) =>
  signedIntroduction({
    source: [sourceA, sourceB, sourceB, sourceC][index],
    recordId: record.record_id,
    manifestId: stableManifest.manifest_id,
    relayNodeId: index < 2 ? RELAY_A : RELAY_B,
    relayFailureDomain: "relay-shared",
  }),
);
await expectReject(
  () =>
    composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1({
      ...common,
      discovery: discoveryFor(
        record.record_id,
        stableManifest.manifest_id,
        sameDomainObservations,
      ),
    }),
  /lacks N-1 relay failure-domain coverage/,
);

await expectReject(
  () =>
    composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1({
      ...common,
      discovery: discoveryFor(
        record.record_id,
        stableManifest.manifest_id,
        observations,
        { expires_at: new Date(NOW - 1).toISOString() },
      ),
    }),
  /discovery is expired/,
);

const wrongManifestId = `voidpbm1_${"f".repeat(64)}`;
const wrongManifestObservations = [
  signedIntroduction({
    source: sourceA,
    recordId: record.record_id,
    manifestId: wrongManifestId,
    relayNodeId: RELAY_A,
    relayFailureDomain: "relay-a",
  }),
  signedIntroduction({
    source: sourceB,
    recordId: record.record_id,
    manifestId: wrongManifestId,
    relayNodeId: RELAY_A,
    relayFailureDomain: "relay-a",
  }),
  signedIntroduction({
    source: sourceB,
    recordId: record.record_id,
    manifestId: wrongManifestId,
    relayNodeId: RELAY_B,
    relayFailureDomain: "relay-b",
  }),
  signedIntroduction({
    source: sourceC,
    recordId: record.record_id,
    manifestId: wrongManifestId,
    relayNodeId: RELAY_B,
    relayFailureDomain: "relay-b",
  }),
];
await expectReject(
  () =>
    composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1({
      ...common,
      discovery: discoveryFor(
        record.record_id,
        wrongManifestId,
        wrongManifestObservations,
      ),
    }),
  /escaped verified bootstrap resolution/,
);

const fetchCountBeforeLocalRejection = recordFetchCount + manifestFetchCount;
await expectReject(
  () =>
    composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1({
      ...common,
      localNodeId: RELAY_A,
      discovery,
    }),
  /invalid local or self route/,
);
assert.equal(
  recordFetchCount + manifestFetchCount,
  fetchCountBeforeLocalRejection,
);

const fetchCountBeforeUnauthenticatedRejection =
  recordFetchCount + manifestFetchCount;
await expectReject(
  () =>
    composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1({
      ...common,
      authenticatedDiscoverySources:
        common.authenticatedDiscoverySources.slice(0, 2),
      discovery,
  }),
  /not bound to an authenticated peer identity/,
);
assert.equal(
  recordFetchCount + manifestFetchCount,
  fetchCountBeforeUnauthenticatedRejection,
);

console.log(`marker=${MARKER}`);
console.log(`record_id=${composed.record_id}`);
console.log(`manifest_id=${composed.manifest_id}`);
console.log(`discovery_id=${composed.discovery_id}`);
console.log(`expires_at=${composed.expires_at}`);
console.log(`route_count=${composed.route_count}`);
console.log(`signed_source_count=${composed.source_count}`);
console.log(`relay_count=${composed.relay_count}`);
console.log(`target_count=${composed.target_count}`);
console.log(
  `relay_failure_domain_count=${composed.relay_failure_domain_count}`,
);
console.log("release_threshold_verified=yes");
console.log("signed_introduction_quorum_verified=yes");
console.log("n_minus_one_relay_coverage_verified=yes");
console.log("orchestrator_route_parser_bridge_verified=yes");
console.log("environment_mutation=none");
console.log("launcher_activation=none");
console.log("deployment=none");
console.log("service_restart=none");
