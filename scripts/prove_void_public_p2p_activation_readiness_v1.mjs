#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
  VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
  VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
  voidBootstrapRecordReleaseKeyIdV1,
  voidBootstrapRecordReleaseRootIdV1,
  voidBootstrapRecordSigningPayloadV1,
} from "./lib/void_bootstrap_record_release_root_v1.mjs";
import {
  VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1,
} from "./lib/void_p2p_udp_swarm_verified_discovery_composition_v1.mjs";
import {
  VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SCHEMA_V1,
  VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SIGNATURE_DOMAIN_V1,
  voidP2pUdpSwarmObserverAuthorizationIdV1,
  voidP2pUdpSwarmObserverAuthorizationSigningPayloadV1,
} from "./lib/void_p2p_udp_swarm_signed_observer_authorization_v1.mjs";

import {
  VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1,
  classifyVoidPublicP2pActivationReadinessV1,
  evaluateVoidPublicP2pActivationReadinessV1,
} from "../tools/void-public-p2p-activation-readiness-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYNTHETIC_NOW = Date.parse("2026-09-21T15:00:00.000Z");
const AUTHORITY = VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1;

function releaseKeyEntry(pair) {
  const der = pair.publicKey.export({ type: "spki", format: "der" });
  return Object.freeze({
    key_id: voidBootstrapRecordReleaseKeyIdV1(der),
    algorithm: "ed25519",
    public_key_spki_base64: Buffer.from(der).toString("base64"),
  });
}

function activeRoot(entries, threshold = entries.length) {
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

function signedRecordEnvelope(root, recordId, signers) {
  const payload = voidBootstrapRecordSigningPayloadV1(root, recordId);
  return Object.freeze({
    schema: VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
    root_id: root.root_id,
    record_id: recordId,
    signatures: signers
      .map(({ keyId, privateKey }) => ({
        key_id: keyId,
        signature_base64: crypto.sign(null, payload, privateKey).toString("base64"),
      }))
      .sort((a, b) => a.key_id.localeCompare(b.key_id)),
  });
}

function observerIdentity() {
  const pair = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = pair.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  return Object.freeze({
    privateKey: pair.privateKey,
    publicKeyPem,
    nodeId: crypto.createHash("sha256").update(publicKeyPem).digest("hex").slice(0, 32),
  });
}

function observer(identity) {
  return Object.freeze({
    node_id: identity.nodeId,
    public_key_pem: identity.publicKeyPem,
  });
}

function signedObserverAuthorization(root, observers, signers) {
  const body = {
    schema: VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SCHEMA_V1,
    signature_domain:
      VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SIGNATURE_DOMAIN_V1,
    network: "VOID Network",
    chain_id: 2050,
    root_id: root.root_id,
    issued_at: new Date(SYNTHETIC_NOW - 60_000).toISOString(),
    not_before: new Date(SYNTHETIC_NOW - 30_000).toISOString(),
    expires_at: new Date(SYNTHETIC_NOW + 60 * 60_000).toISOString(),
    observers: [...observers].sort((a, b) => a.node_id.localeCompare(b.node_id)),
    authority: AUTHORITY,
    authorization_id: "",
  };
  body.authorization_id = voidP2pUdpSwarmObserverAuthorizationIdV1(body);
  const payload = voidP2pUdpSwarmObserverAuthorizationSigningPayloadV1(body);
  return Object.freeze({
    ...body,
    signatures: signers
      .map(({ keyId, privateKey }) => ({
        key_id: keyId,
        signature_base64: crypto.sign(null, payload, privateKey).toString("base64"),
      }))
      .sort((a, b) => a.key_id.localeCompare(b.key_id)),
  });
}

function writeJson(root, relativePath, value) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
}

function copyFixtureFile(root, relativePath) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.copyFileSync(path.join(ROOT, relativePath), target);
}

function buildSyntheticReadyRoot() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-p2p-readiness-"));
  fs.chmodSync(temp, 0o700);

  for (const relativePath of [
    "src/p2p/udp_swarm_public_relay_introduction_collector_v1.ts",
    "src/p2p/udp_swarm_node_runtime_mount_v1.ts",
    "ops/run-void-node-live-v1.sh",
    ".env.example",
    "public/bootstrap/v1.json",
  ]) {
    copyFixtureFile(temp, relativePath);
  }

  const entrypoint = [
    "const publicP2pMount = await createVoidUdpSwarmNodeRuntimeMountV1({",
    "  node,",
    "  identity,",
    "  config,",
    "});",
    "registerVoidUdpSwarmNodeRuntimeReadonlyRouteV1(app, publicP2pMount);",
    "await publicP2pMount.startPublicRelayIntroductionCollectorV1({",
    "  observerAuthorization,",
    "  releaseRoot,",
    "  fetchRecordBytes,",
    "  fetchManifestBytes,",
    "});",
    "",
  ].join("\n");
  fs.mkdirSync(path.join(temp, "src"), { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(temp, "src/index.ts"), entrypoint, { mode: 0o600 });

  const releaseA = crypto.generateKeyPairSync("ed25519");
  const releaseB = crypto.generateKeyPairSync("ed25519");
  const entryA = releaseKeyEntry(releaseA);
  const entryB = releaseKeyEntry(releaseB);
  const releaseRoot = activeRoot([entryA, entryB], 2);
  const signers = [
    { keyId: entryA.key_id, privateKey: releaseA.privateKey },
    { keyId: entryB.key_id, privateKey: releaseB.privateKey },
  ];

  const recordId = `voidpbr2_${"a".repeat(64)}`;
  const signedRecord = signedRecordEnvelope(releaseRoot, recordId, signers);
  const sourceA = observerIdentity();
  const sourceB = observerIdentity();
  const sourceC = observerIdentity();
  const authorization = signedObserverAuthorization(
    releaseRoot,
    [observer(sourceA), observer(sourceB), observer(sourceC)],
    signers,
  );

  const relayIntroduction = {
    schema: "void_p2p_udp_swarm_public_relay_introduction_v1",
    signed_record_id: signedRecord,
    locator_mirrors: [
      {
        transport: "https",
        base_url: "https://a.example/void/bootstrap/v2",
        failure_domain: "a",
      },
      {
        transport: "https",
        base_url: "https://b.example/void/bootstrap/v2",
        failure_domain: "b",
      },
      {
        transport: "https",
        base_url: "https://c.example/void/bootstrap/v2",
        failure_domain: "c",
      },
    ],
    discovery: { discovery_id: `voidpud1_${"b".repeat(64)}` },
  };

  writeJson(temp, "config/void-bootstrap-record-release-root-v1.json", releaseRoot);
  writeJson(temp, "config/signed-bootstrap-record-v1.json", signedRecord);
  writeJson(temp, "config/signed-observer-authorization-v1.json", authorization);
  writeJson(temp, "public/relay-introduction-v1.json", relayIntroduction);

  return temp;
}

const readySnapshot = Object.freeze({
  release_root_active: true,
  signed_bootstrap_record_id_valid: true,
  signed_observer_authorization_valid: true,
  relay_introduction_artifact_valid: true,
  collector_source_contract_present: true,
  runtime_mount_collector_support_present: true,
  entrypoint_runtime_mount_wired: true,
  defaults_fail_closed: true,
});

const ready = classifyVoidPublicP2pActivationReadinessV1(readySnapshot);
assert.equal(ready.marker, VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1);
assert.equal(ready.decision, "ACTIVATION_SOURCE_READY");
assert.equal(ready.ready, true);
assert.deepEqual(ready.blockers, []);
assert.equal(ready.production_activation_authorized, false);
assert.equal(ready.deployment_performed, false);
assert.equal(ready.service_restart_performed, false);
assert.equal(ready.private_key_generated_or_read, false);
assert.equal(ready.wallet_or_signer_access, false);
assert.equal(ready.transaction_or_broadcast, false);
assert.equal(ready.funds_moved, false);
assert.equal(ready.external_acceptance_required_after_deployment, true);

for (const gate of Object.keys(readySnapshot)) {
  const snapshot = { ...readySnapshot, [gate]: false };
  const held = classifyVoidPublicP2pActivationReadinessV1(snapshot);
  assert.equal(held.decision, "HOLD", gate);
  assert.equal(held.ready, false, gate);
  assert.equal(held.blockers.length, 1, gate);
}

const syntheticRoot = buildSyntheticReadyRoot();
try {
  const syntheticReady = evaluateVoidPublicP2pActivationReadinessV1({
    rootDir: syntheticRoot,
    nowMs: SYNTHETIC_NOW,
  });
  assert.equal(syntheticReady.decision, "ACTIVATION_SOURCE_READY");
  assert.equal(syntheticReady.ready, true);
  assert.deepEqual(syntheticReady.blockers, []);
  assert.equal(syntheticReady.snapshot.release_root_active, true);
  assert.equal(syntheticReady.snapshot.release_root_threshold, 2);
  assert.equal(syntheticReady.snapshot.release_root_key_count, 2);
  assert.equal(syntheticReady.snapshot.signed_bootstrap_record_id_valid_count, 1);
  assert.equal(syntheticReady.snapshot.signed_observer_authorization_valid_count, 1);
  assert.equal(syntheticReady.snapshot.relay_introduction_artifact_valid_count, 1);
  assert.equal(syntheticReady.snapshot.collector_source_contract_present, true);
  assert.equal(syntheticReady.snapshot.runtime_mount_collector_support_present, true);
  assert.equal(syntheticReady.snapshot.entrypoint_runtime_mount_wired, true);
  assert.equal(syntheticReady.snapshot.defaults_fail_closed, true);
  assert.equal(syntheticReady.production_activation_authorized, false);
  assert.equal(syntheticReady.network_calls_performed, false);

  fs.writeFileSync(
    path.join(syntheticRoot, "src/index.ts"),
    [
      "createVoidUdpSwarmNodeRuntimeMountV1",
      "registerVoidUdpSwarmNodeRuntimeReadonlyRouteV1",
      "startPublicRelayIntroductionCollectorV1",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  const tokenOnlyEntrypoint = evaluateVoidPublicP2pActivationReadinessV1({
    rootDir: syntheticRoot,
    nowMs: SYNTHETIC_NOW,
  });
  assert.equal(tokenOnlyEntrypoint.decision, "HOLD");
  assert.deepEqual(tokenOnlyEntrypoint.blockers, ["entrypoint_runtime_mount_unwired"]);

  fs.writeFileSync(
    path.join(syntheticRoot, "src/index.ts"),
    [
      "// const fakeMount = await createVoidUdpSwarmNodeRuntimeMountV1({});",
      "/*",
      "registerVoidUdpSwarmNodeRuntimeReadonlyRouteV1(app, fakeMount);",
      "await fakeMount.startPublicRelayIntroductionCollectorV1({});",
      "*/",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  const commentOnlyEntrypoint = evaluateVoidPublicP2pActivationReadinessV1({
    rootDir: syntheticRoot,
    nowMs: SYNTHETIC_NOW,
  });
  assert.equal(commentOnlyEntrypoint.decision, "HOLD");
  assert.deepEqual(commentOnlyEntrypoint.blockers, ["entrypoint_runtime_mount_unwired"]);

  fs.writeFileSync(
    path.join(syntheticRoot, "src/index.ts"),
    [
      "const publicP2pMount = await createVoidUdpSwarmNodeRuntimeMountV1({});",
      "registerVoidUdpSwarmNodeRuntimeReadonlyRouteV1(app, otherMount);",
      "await publicP2pMount.startPublicRelayIntroductionCollectorV1({});",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  const mismatchedMountBinding = evaluateVoidPublicP2pActivationReadinessV1({
    rootDir: syntheticRoot,
    nowMs: SYNTHETIC_NOW,
  });
  assert.equal(mismatchedMountBinding.decision, "HOLD");
  assert.deepEqual(mismatchedMountBinding.blockers, ["entrypoint_runtime_mount_unwired"]);
} finally {
  fs.rmSync(syntheticRoot, { recursive: true, force: true });
}

const current = evaluateVoidPublicP2pActivationReadinessV1({ rootDir: ROOT });
assert.equal(current.marker, VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1);
assert.equal(current.decision, "HOLD");
assert.equal(current.ready, false);
assert.equal(current.mutation_attempted, false);
assert.equal(current.network_calls_performed, false);

assert.equal(current.snapshot.release_root_valid, true);
assert.equal(current.snapshot.release_root_status, "hold_no_signing_keys");
assert.equal(current.snapshot.release_root_threshold, 0);
assert.equal(current.snapshot.release_root_key_count, 0);
assert.equal(current.snapshot.release_root_active, false);

assert.equal(current.snapshot.signed_bootstrap_record_id_candidate_count, 0);
assert.equal(current.snapshot.signed_bootstrap_record_id_valid_count, 0);
assert.equal(current.snapshot.signed_observer_authorization_candidate_count, 0);
assert.equal(current.snapshot.signed_observer_authorization_valid_count, 0);
assert.equal(current.snapshot.relay_introduction_artifact_candidate_count, 0);
assert.equal(current.snapshot.relay_introduction_artifact_valid_count, 0);

assert.equal(current.snapshot.collector_source_contract_present, true);
assert.equal(current.snapshot.runtime_mount_collector_support_present, true);
assert.equal(current.snapshot.entrypoint_runtime_mount_wired, false);
assert.equal(current.snapshot.launcher_runtime_wiring_present, false);
assert.equal(current.snapshot.defaults_fail_closed, true);

assert.equal(current.snapshot.public_manifest.schema, "void_public_bootstrap_v1");
assert.equal(current.snapshot.public_manifest.status, "stable_https_seed");
assert.equal(current.snapshot.public_manifest.https_sync_endpoint_count, 1);
assert.equal(current.snapshot.public_manifest.private_tailnet_endpoints_published, false);
assert.equal(current.snapshot.public_manifest.authority_safe, true);
assert.equal(current.snapshot.public_manifest.public_https_sync_ready, true);

assert.deepEqual(current.blockers, [
  "entrypoint_runtime_mount_unwired",
  "relay_introduction_artifact_unavailable",
  "release_root_not_active",
  "signed_bootstrap_record_id_unavailable",
  "signed_observer_authorization_unavailable",
]);
assert(!current.blockers.includes("collector_source_contract_missing"));
assert(!current.blockers.includes("runtime_mount_collector_support_missing"));

console.log("VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1_PROOF_GREEN");
console.log("current_decision=HOLD");
console.log(`current_blockers=${current.blockers.join(",")}`);
console.log("release_root_status=hold_no_signing_keys");
console.log("synthetic_fixture_keys_generated=true");
console.log("production_private_key_generated_or_read=false");
console.log("entrypoint_token_only_false_positive_rejected=true");
console.log("entrypoint_comment_only_false_positive_rejected=true");
console.log("entrypoint_mount_binding_mismatch_rejected=true");
console.log("network_calls_performed=false");
console.log("deployment_performed=false");
console.log("service_restart_performed=false");
console.log("external_acceptance_required_after_deployment=true");
