#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
  VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
  voidBootstrapRecordReleaseKeyIdV1,
  voidBootstrapRecordReleaseRootIdV1,
} from "./lib/void_bootstrap_record_release_root_v1.mjs";
import {
  VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1,
} from "./lib/void_p2p_udp_swarm_verified_discovery_composition_v1.mjs";
import {
  VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SCHEMA_V1,
  VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SIGNATURE_DOMAIN_V1,
  authorizeVoidP2pUdpSwarmDiscoverySourcesV1,
  composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1,
  validateVoidP2pUdpSwarmObserverAuthorizationV1,
  voidP2pUdpSwarmObserverAuthorizationIdV1,
  voidP2pUdpSwarmObserverAuthorizationSigningPayloadV1,
} from "./lib/void_p2p_udp_swarm_signed_observer_authorization_v1.mjs";

const MARKER =
  "VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_V1_PROOF_GREEN";
const NOW = Date.parse("2026-08-12T16:45:00.000Z");
const AUTHORITY = VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1;

function identity() {
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

function releaseKeyEntry(pair) {
  const der = pair.publicKey.export({ type: "spki", format: "der" });
  return Object.freeze({
    key_id: voidBootstrapRecordReleaseKeyIdV1(der),
    algorithm: "ed25519",
    public_key_spki_base64: Buffer.from(der).toString("base64"),
  });
}

function activeRoot(entries, threshold) {
  const root = {
    schema: VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
    network: "VOID Network",
    chain_id: 2050,
    status: "active",
    signature_domain: VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
    threshold,
    keys: [...entries].sort((a, b) => a.key_id.localeCompare(b.key_id)),
    authority: AUTHORITY,
    root_id: "",
  };
  root.root_id = voidBootstrapRecordReleaseRootIdV1(root);
  return root;
}

function observer(identityValue) {
  return Object.freeze({
    node_id: identityValue.nodeId,
    public_key_pem: identityValue.publicKeyPem,
  });
}

function buildAuthorization({
  root,
  observers,
  signers,
  issuedAt = new Date(NOW - 60_000).toISOString(),
  notBefore = new Date(NOW - 30_000).toISOString(),
  expiresAt = new Date(NOW + 60 * 60_000).toISOString(),
  authority = AUTHORITY,
}) {
  const body = {
    schema: VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SCHEMA_V1,
    signature_domain:
      VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SIGNATURE_DOMAIN_V1,
    network: "VOID Network",
    chain_id: 2050,
    root_id: root.root_id,
    issued_at: issuedAt,
    not_before: notBefore,
    expires_at: expiresAt,
    observers: [...observers].sort((a, b) =>
      a.node_id.localeCompare(b.node_id),
    ),
    authority,
    authorization_id: "",
  };
  body.authorization_id = voidP2pUdpSwarmObserverAuthorizationIdV1(body);
  const payload = voidP2pUdpSwarmObserverAuthorizationSigningPayloadV1(body);
  return Object.freeze({
    ...body,
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

function expectReject(run, pattern) {
  let failure;
  try {
    run();
  } catch (error) {
    failure = error;
  }
  assert(failure, "expected signed observer authorization rejection");
  assert.match(String(failure.message || failure), pattern);
}

async function expectRejectAsync(run, pattern) {
  let failure;
  try {
    await run();
  } catch (error) {
    failure = error;
  }
  assert(failure, "expected authorized discovery composition rejection");
  assert.match(String(failure.message || failure), pattern);
}

const releaseA = crypto.generateKeyPairSync("ed25519");
const releaseB = crypto.generateKeyPairSync("ed25519");
const releaseEntryA = releaseKeyEntry(releaseA);
const releaseEntryB = releaseKeyEntry(releaseB);
const releaseRoot = activeRoot([releaseEntryA, releaseEntryB], 2);
const releaseSigners = [
  { keyId: releaseEntryA.key_id, privateKey: releaseA.privateKey },
  { keyId: releaseEntryB.key_id, privateKey: releaseB.privateKey },
];

const sourceA = identity();
const sourceB = identity();
const sourceC = identity();
const attackerA = identity();
const attackerB = identity();
const local = identity();

const authorization = buildAuthorization({
  root: releaseRoot,
  observers: [observer(sourceA), observer(sourceB), observer(sourceC)],
  signers: releaseSigners,
});
const validated = validateVoidP2pUdpSwarmObserverAuthorizationV1(
  authorization,
  releaseRoot,
  { nowMs: NOW },
);
assert.equal(validated.observer_count, 3);
assert.equal(validated.threshold, 2);
assert.equal(validated.signer_key_ids.length, 2);
assert.equal(validated.transport_is_authority, false);
assert.equal(validated.wallet_signer_validator_wc_money_authority, 0);
assert.equal(validated.authorization.authorization_id, authorization.authorization_id);
assert(Object.isFrozen(validated));
assert(Object.isFrozen(validated.authorization));

const eligible = authorizeVoidP2pUdpSwarmDiscoverySourcesV1({
  observerAuthorization: authorization,
  releaseRoot,
  authenticatedDiscoverySources: [
    observer(attackerA),
    observer(sourceC),
    observer(sourceA),
    observer(attackerB),
    observer(sourceB),
  ],
  localNodeId: local.nodeId,
  nowMs: NOW,
});
assert.deepEqual(
  eligible.map((entry) => entry.node_id),
  [sourceA.nodeId, sourceB.nodeId, sourceC.nodeId].sort(),
);
assert.equal(
  eligible.some((entry) => entry.node_id === attackerA.nodeId),
  false,
);
assert.equal(
  eligible.some((entry) => entry.node_id === attackerB.nodeId),
  false,
);

expectReject(
  () =>
    authorizeVoidP2pUdpSwarmDiscoverySourcesV1({
      observerAuthorization: authorization,
      releaseRoot,
      authenticatedDiscoverySources: [observer(attackerA), observer(attackerB)],
      localNodeId: local.nodeId,
      nowMs: NOW,
    }),
  /insufficient live signed-observer authorization/,
);

let recordFetchCount = 0;
let manifestFetchCount = 0;
await expectRejectAsync(
  () =>
    composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1({
      observerAuthorization: authorization,
      releaseRoot,
      authenticatedDiscoverySources: [observer(attackerA), observer(attackerB)],
      localNodeId: local.nodeId,
      nowMs: NOW,
      signedRecordId: {},
      locatorMirrors: [],
      discovery: {},
      async fetchRecordBytes() {
        recordFetchCount += 1;
        return Buffer.from("{}");
      },
      async fetchManifestBytes() {
        manifestFetchCount += 1;
        return Buffer.from("{}");
      },
    }),
  /insufficient live signed-observer authorization/,
);
assert.equal(recordFetchCount, 0);
assert.equal(manifestFetchCount, 0);

let leaseRecordFetchCount = 0;
let leaseManifestFetchCount = 0;
await expectRejectAsync(
  () =>
    composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1({
      observerAuthorization: authorization,
      releaseRoot,
      authenticatedDiscoverySources: [observer(sourceA), observer(sourceB)],
      localNodeId: local.nodeId,
      nowMs: NOW,
      signedRecordId: {},
      locatorMirrors: [],
      discovery: {
        generated_at: new Date(NOW).toISOString(),
        expires_at: new Date(NOW + 2 * 60 * 60_000).toISOString(),
        observations: [],
      },
      async fetchRecordBytes() {
        leaseRecordFetchCount += 1;
        return Buffer.from("{}");
      },
      async fetchManifestBytes() {
        leaseManifestFetchCount += 1;
        return Buffer.from("{}");
      },
    }),
  /lease exceeds observer authorization/,
);
assert.equal(leaseRecordFetchCount, 0);
assert.equal(leaseManifestFetchCount, 0);

let staleRecordFetchCount = 0;
let staleManifestFetchCount = 0;
await expectRejectAsync(
  () =>
    composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1({
      observerAuthorization: authorization,
      releaseRoot,
      authenticatedDiscoverySources: [observer(sourceA), observer(sourceB)],
      localNodeId: local.nodeId,
      nowMs: NOW,
      signedRecordId: {},
      locatorMirrors: [],
      discovery: {
        generated_at: new Date(NOW).toISOString(),
        expires_at: new Date(NOW + 10 * 60_000).toISOString(),
        observations: [
          { observed_at: new Date(NOW - 60_000).toISOString() },
        ],
      },
      async fetchRecordBytes() {
        staleRecordFetchCount += 1;
        return Buffer.from("{}");
      },
      async fetchManifestBytes() {
        staleManifestFetchCount += 1;
        return Buffer.from("{}");
      },
    }),
  /observation falls outside observer authorization/,
);
assert.equal(staleRecordFetchCount, 0);
assert.equal(staleManifestFetchCount, 0);

const oneSignerAuthorization = buildAuthorization({
  root: releaseRoot,
  observers: [observer(sourceA), observer(sourceB)],
  signers: [releaseSigners[0]],
});
expectReject(
  () =>
    validateVoidP2pUdpSwarmObserverAuthorizationV1(
      oneSignerAuthorization,
      releaseRoot,
      { nowMs: NOW },
    ),
  /signature count is invalid|lacks release-root quorum/,
);

const forgedAuthorization = buildAuthorization({
  root: releaseRoot,
  observers: [observer(attackerA), observer(attackerB)],
  signers: [
    { keyId: releaseEntryA.key_id, privateKey: attackerA.privateKey },
    { keyId: releaseEntryB.key_id, privateKey: attackerB.privateKey },
  ],
});
expectReject(
  () =>
    validateVoidP2pUdpSwarmObserverAuthorizationV1(
      forgedAuthorization,
      releaseRoot,
      { nowMs: NOW },
    ),
  /signature is invalid/,
);

const mismatchedIdentityAuthorization = buildAuthorization({
  root: releaseRoot,
  observers: [
    {
      node_id: sourceA.nodeId,
      public_key_pem: attackerA.publicKeyPem,
    },
    observer(sourceB),
  ],
  signers: releaseSigners,
});
expectReject(
  () =>
    validateVoidP2pUdpSwarmObserverAuthorizationV1(
      mismatchedIdentityAuthorization,
      releaseRoot,
      { nowMs: NOW },
    ),
  /identity does not match its key/,
);

const expiredAuthorization = buildAuthorization({
  root: releaseRoot,
  observers: [observer(sourceA), observer(sourceB)],
  signers: releaseSigners,
  issuedAt: new Date(NOW - 5 * 60_000).toISOString(),
  notBefore: new Date(NOW - 4 * 60_000).toISOString(),
  expiresAt: new Date(NOW - 60_000).toISOString(),
});
expectReject(
  () =>
    validateVoidP2pUdpSwarmObserverAuthorizationV1(
      expiredAuthorization,
      releaseRoot,
      { nowMs: NOW },
    ),
  /is expired/,
);

const authorityEscalationAuthorization = buildAuthorization({
  root: releaseRoot,
  observers: [observer(sourceA), observer(sourceB)],
  signers: releaseSigners,
  authority: {
    ...AUTHORITY,
    wallet_authority: true,
  },
});
expectReject(
  () =>
    validateVoidP2pUdpSwarmObserverAuthorizationV1(
      authorityEscalationAuthorization,
      releaseRoot,
      { nowMs: NOW },
    ),
  /grants forbidden authority/,
);

const changedObserverSet = structuredClone(authorization);
changedObserverSet.observers = changedObserverSet.observers.slice(0, 2);
expectReject(
  () =>
    validateVoidP2pUdpSwarmObserverAuthorizationV1(
      changedObserverSet,
      releaseRoot,
      { nowMs: NOW },
    ),
  /ID does not match its content/,
);

console.log(MARKER);
