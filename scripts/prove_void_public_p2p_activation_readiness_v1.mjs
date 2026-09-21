#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_PUBLIC_P2P_ACTIVATION_READINESS_V1,
  classifyVoidPublicP2pActivationReadinessV1,
  evaluateVoidPublicP2pActivationReadinessV1,
} from "../tools/void-public-p2p-activation-readiness-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
console.log("production_private_key_generated_or_read=false");
console.log("network_calls_performed=false");
console.log("deployment_performed=false");
console.log("service_restart_performed=false");
console.log("external_acceptance_required_after_deployment=true");
