#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repo = process.cwd();
const PACKET_RELATIVE_PATH = "config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json";
const DOC_RELATIVE_PATH = "docs/operations/authenticated-paid-work-production-activation-execution-packet-v1.md";
const METADATA_RELATIVE_PATH = "config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json";
const packetPath = path.join(repo, PACKET_RELATIVE_PATH);
const docPath = path.join(repo, DOC_RELATIVE_PATH);
const metadataPath = path.join(repo, METADATA_RELATIVE_PATH);

const packetBytes = fs.readFileSync(packetPath);
const packetText = packetBytes.toString("utf8");
const packet = JSON.parse(packetText);
const docText = fs.readFileSync(docPath, "utf8");
const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

const EXPECTED_PACKET_SHA256 = "fe17507808b256e63f92a6e3a6b86042e9880f7ae9f1f5dcd9b68b18c9ccccec";
const EXPECTED_REVIEWED_MAIN = "71767df629c1f0034c38ea441c6e2cefc7794820";
const EXPECTED_METADATA_COMMIT = "cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa";
const EXPECTED_CREDENTIAL_ID = "voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1";
const EXPECTED_REGISTRY_ID = "voidapwcr1_ce24175f3144131773f730d4989113b949998d79c48c3ddbd9752390122aac4f";
const EXPECTED_REGISTRY_SHA256 = "92e3149e560f7fa159d8fb5c59cd680cb6547a8a8f8010036bc02c4aa8d6e00e";
const EXPECTED_RECEIVER_CLASSIFICATION = "RECEIVER_ACTIVE_TARGET_REGISTRY";
const EXPECTED_RESTART_RECEIPT_SHA256 = "d488a4f35a32b1ba8c8a0a955ce28b095af585391ae34e87c41a7f6837e48a49";
const FORBIDDEN_OLD_METADATA_COMMIT = "9a8cfcbab14d5439e853d19575009ed3245e8b66";
const FORBIDDEN_OLD_REGISTRY_ID = "voidapwcr1_d5dafad265dc38237b11654142b9690c967f06e106e931d47dba2cf1eec996e5";
const FORBIDDEN_OLD_CLASSIFICATION = "RECEIVER_ACTIVE_STALE_REGISTRY";

const EXPECTED_SOURCE_COMMITS = Object.freeze({
  "activation_configuration_instance": "27dc14a7e59967744ef5c65e6b28e84b265b1565",
  "trusted_context_reference_metadata": "ac074d53ab937d302c69b6bff54f02d064e37d57",
  "rollback_plan": "cb57842cbb53fcad7ed6861d829058635af9308c",
  "service_unit_design": "09ddef7d672b57484bbf853d500fd47d9537c5fb",
  "credential_reference_metadata": "cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa",
  "bounded_replay_snapshot": "54795a9e35a19067559d0cb315b0ea2669c59088",
  "execution_confirmation": "b32a13792bb4d94fb0da52c175930e9ccf03d631",
  "live_canary_scope": "92daf8ec4668c78768f97876a039f8301909573e",
  "direct_authentication": "97dd668fdbe8e3329cc5a083df010a1ffd6050c8",
  "direct_activation_persistence": "2bf85f63e7f49a87e3e4e5f8450076b05078369f",
  "fresh_direct_quote_authentication_preparation": "a371372213782e8b55d678d28dc5291559ad02ee",
  "fresh_direct_quote_signing_handoff": "32cd4883b95354ab979d12640ffd2e2ac1279e57"
});
const EXPECTED_GATES = Object.freeze([
  "capture_current_origin_main",
  "verify_required_source_artifacts",
  "verify_disabled_runtime_preimage",
  "verify_fresh_persistence_state",
  "privately_verify_trusted_context_reference",
  "privately_verify_fresh_credential_reference",
  "materialize_fresh_direct_provider_signing_request",
  "verify_provider_signature_and_materialize_requester_signing_request",
  "verify_requester_signature_and_finalize_direct_authentication_preparation",
  "independently_verify_final_direct_authentication_packet",
  "materialize_non_secret_execution_plan",
  "compute_canonical_execution_plan_sha256",
  "obtain_fresh_operation_bound_confirmation_from_zoso",
  "revalidate_origin_main_and_all_prestates",
  "perform_reviewed_one_shot_activation",
  "execute_exactly_one_fresh_paid_work_canary",
  "capture_sanitized_post_execution_evidence",
  "make_separate_post_execution_readiness_decision"
]);
const EXPECTED_INPUTS = Object.freeze({
  "fresh_origin_main": null,
  "trusted_context_reference_verified": false,
  "credential_reference_verified_and_fresh": false,
  "provider_signature_verified": false,
  "requester_signature_verified": false,
  "fresh_direct_authentication_packet_sha256": null,
  "execution_plan_sha256": null,
  "fresh_zoso_confirmation": null,
  "fresh_quote_required": true
});
const EXPECTED_FAILURES = Object.freeze([
  "origin_main_changes_after_plan_digest",
  "source_artifact_mismatch",
  "runtime_preimage_drift",
  "non_fresh_or_revoked_credential",
  "trusted_context_reference_mismatch",
  "non_empty_or_unexpected_replay_state",
  "provider_or_requester_signature_binding_mismatch",
  "fresh_direct_authentication_packet_mismatch",
  "confirmation_missing_expired_or_mismatched",
  "quote_expired_or_previously_consumed",
  "any_unreviewed_mutation_required"
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(sha256(packetBytes), EXPECTED_PACKET_SHA256);
assert.equal(packet.marker, "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1");
assert.equal(packet.version, 1);
assert.equal(packet.status, "source_ready_execution_not_authorized");
assert.equal(packet.reviewed_source_main, EXPECTED_REVIEWED_MAIN);
assert.deepEqual(packet.target, {
  host: "zoso-Precision-Tower-7810",
  runtime_user: "zoso",
  manager_scope: "systemd_user",
  start_mode: "manual_oneshot",
});
assert.deepEqual(packet.required_source_commits, EXPECTED_SOURCE_COMMITS);
assert.equal(packet.required_source_commits.credential_reference_metadata, EXPECTED_METADATA_COMMIT);
assert.equal(Object.values(packet.required_source_commits).includes(FORBIDDEN_OLD_METADATA_COMMIT), false);

assert.equal(metadata.marker, "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CREDENTIAL_REFERENCE_METADATA_V1");
assert.equal(metadata.version, 1);
assert.equal(metadata.status, "source_reference_only_credential_read_forbidden");
assert.equal(metadata.credential_reference.reference_id, EXPECTED_CREDENTIAL_ID);
assert.equal(metadata.credential_reference.credential_id, EXPECTED_CREDENTIAL_ID);
assert.equal(metadata.credential_reference.registry_id, EXPECTED_REGISTRY_ID);
assert.equal(metadata.registry_snapshot.registry_sha256, EXPECTED_REGISTRY_SHA256);
assert.equal(metadata.registry_snapshot.credential_count, 9);
assert.equal(metadata.evidence_binding.receiver_restart_receipt_sha256, EXPECTED_RESTART_RECEIPT_SHA256);

const runtimeTruth = packet.credential_runtime_truth;
assert.deepEqual(runtimeTruth, {
  credential_reference_id: metadata.credential_reference.reference_id,
  target_registry_id: metadata.credential_reference.registry_id,
  receiver_classification: metadata.evidence_binding.receiver_classification,
  receiver_loaded_target_registry: metadata.evidence_binding.receiver_loaded_target_registry,
  receiver_restart_required: metadata.evidence_binding.receiver_restart_required,
  receiver_configuration_revalidation_required: metadata.evidence_binding.receiver_configuration_revalidation_required,
  live_authentication_observed: metadata.evidence_binding.live_authentication_observed,
  current_runtime_freshness_proven_by_source: metadata.revalidation.current_runtime_freshness_proven_by_source,
});
assert.deepEqual(runtimeTruth, {
  credential_reference_id: EXPECTED_CREDENTIAL_ID,
  target_registry_id: EXPECTED_REGISTRY_ID,
  receiver_classification: EXPECTED_RECEIVER_CLASSIFICATION,
  receiver_loaded_target_registry: true,
  receiver_restart_required: false,
  receiver_configuration_revalidation_required: true,
  live_authentication_observed: false,
  current_runtime_freshness_proven_by_source: false,
});

assert.equal(metadata.evidence_binding.receiver_loaded_credential_count, 9);
assert.equal(metadata.evidence_binding.receiver_health_observed, true);
assert.equal(metadata.evidence_binding.receiver_health_http_status, 200);
assert.equal(metadata.evidence_binding.reviewed_eight_record_prefix_preserved_exactly, true);
assert.equal(metadata.evidence_binding.safe_ninth_credential_append_exact, true);
assert.equal(metadata.evidence_binding.fresh_direct_requester_used_as_activation_credential, false);
for (const key of [
  "payment_execution_observed",
  "work_dispatch_observed",
  "work_credit_write_observed",
  "wallet_or_signer_access_observed",
  "fund_movement_observed",
]) {
  assert.equal(metadata.evidence_binding[key], false);
}

assert.deepEqual(packet.ordered_execution_gates, EXPECTED_GATES);
assert.deepEqual(packet.mandatory_runtime_inputs, EXPECTED_INPUTS);
assert.deepEqual(packet.fail_closed_conditions, EXPECTED_FAILURES);
assert.equal(new Set(packet.ordered_execution_gates).size, 18);
assert.equal(Object.keys(packet.authority).length, 12);
for (const [key, value] of Object.entries(packet.authority)) {
  assert.equal(value, false, `authority must remain false: ${key}`);
}

assert.equal(packetText.includes(FORBIDDEN_OLD_REGISTRY_ID), false);
assert.equal(packetText.includes(FORBIDDEN_OLD_CLASSIFICATION), false);
assert.equal(packetText.includes(FORBIDDEN_OLD_METADATA_COMMIT), false);
for (const required of [
  EXPECTED_REVIEWED_MAIN,
  EXPECTED_METADATA_COMMIT,
  EXPECTED_CREDENTIAL_ID,
  EXPECTED_REGISTRY_ID,
  EXPECTED_REGISTRY_SHA256,
  EXPECTED_RECEIVER_CLASSIFICATION,
  EXPECTED_RESTART_RECEIPT_SHA256,
  "receiver loaded target registry: true",
  "receiver restart required: false",
  "current runtime freshness proven by source: false",
  "SOURCE_READY_EXECUTION_NOT_AUTHORIZED",
]) {
  assert.ok(docText.includes(required), `document missing: ${required}`);
}

const combinedDataText = `${packetText}\n${docText}`;
for (const forbidden of ["/home/", "Bearer ", "Authorization:", "-----BEGIN"]) {
  assert.equal(combinedDataText.includes(forbidden), false, `private material literal present: ${forbidden}`);
}
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
assert.equal(nodeMajor, 22, `proof requires Node.js 22.x, observed ${process.versions.node}`);

console.log("packet_status=source_ready_execution_not_authorized");
console.log(`reviewed_source_main=${EXPECTED_REVIEWED_MAIN}`);
console.log(`credential_reference_metadata_commit=${EXPECTED_METADATA_COMMIT}`);
console.log(`credential_reference_id=${EXPECTED_CREDENTIAL_ID}`);
console.log(`target_registry_id=${EXPECTED_REGISTRY_ID}`);
console.log(`target_registry_sha256=${EXPECTED_REGISTRY_SHA256}`);
console.log("target_registry_credential_count=9");
console.log(`receiver_classification=${EXPECTED_RECEIVER_CLASSIFICATION}`);
console.log("receiver_loaded_target_registry=true");
console.log("receiver_restart_required=false");
console.log("receiver_configuration_revalidation_required=true");
console.log("receiver_health_observed=true");
console.log("live_authentication_observed=false");
console.log("current_runtime_freshness_proven_by_source=false");
console.log(`ordered_execution_gates=${EXPECTED_GATES.length}`);
console.log(`fail_closed_conditions=${EXPECTED_FAILURES.length}`);
console.log("denied_authorities=12");
console.log("fresh_quote_required=true");
console.log("provider_signature_verified=false");
console.log("requester_signature_verified=false");
console.log("fresh_zoso_confirmation_required=true");
console.log("service_restart_authorized=false");
console.log("activation_authorized=false");
console.log("VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1_PROOF_GREEN=true");
