#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repo = process.cwd();
const packetPath = path.join(
  repo,
  "config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json",
);
const credentialMetadataPath = path.join(
  repo,
  "config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json",
);

const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
const credentialMetadata = JSON.parse(
  fs.readFileSync(credentialMetadataPath, "utf8"),
);

const EXPECTED_REVIEWED_MAIN =
  "71767df629c1f0034c38ea441c6e2cefc7794820";
const EXPECTED_CREDENTIAL_METADATA_COMMIT =
  "cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa";
const EXPECTED_CREDENTIAL_ID =
  "voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1";
const EXPECTED_TARGET_REGISTRY_ID =
  "voidapwcr1_ce24175f3144131773f730d4989113b949998d79c48c3ddbd9752390122aac4f";
const EXPECTED_TARGET_REGISTRY_SHA256 =
  "92e3149e560f7fa159d8fb5c59cd680cb6547a8a8f8010036bc02c4aa8d6e00e";
const EXPECTED_TARGET_CREDENTIAL_COUNT = 9;
const EXPECTED_RECEIVER_CLASSIFICATION =
  "RECEIVER_ACTIVE_TARGET_REGISTRY";

const EXPECTED_SOURCE_COMMITS = Object.freeze({
  activation_configuration_instance:
    "27dc14a7e59967744ef5c65e6b28e84b265b1565",
  trusted_context_reference_metadata:
    "ac074d53ab937d302c69b6bff54f02d064e37d57",
  rollback_plan:
    "cb57842cbb53fcad7ed6861d829058635af9308c",
  service_unit_design:
    "09ddef7d672b57484bbf853d500fd47d9537c5fb",
  credential_reference_metadata: EXPECTED_CREDENTIAL_METADATA_COMMIT,
  bounded_replay_snapshot:
    "54795a9e35a19067559d0cb315b0ea2669c59088",
  execution_confirmation:
    "b32a13792bb4d94fb0da52c175930e9ccf03d631",
  live_canary_scope:
    "92daf8ec4668c78768f97876a039f8301909573e",
  direct_authentication:
    "97dd668fdbe8e3329cc5a083df010a1ffd6050c8",
  direct_activation_persistence:
    "2bf85f63e7f49a87e3e4e5f8450076b05078369f",
  fresh_direct_quote_authentication_preparation:
    "a371372213782e8b55d678d28dc5291559ad02ee",
  fresh_direct_quote_signing_handoff:
    "32cd4883b95354ab979d12640ffd2e2ac1279e57",
});

const EXPECTED_ORDERED_EXECUTION_GATES = Object.freeze([
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
  "make_separate_post_execution_readiness_decision",
]);

const EXPECTED_DENIED_AUTHORITY = Object.freeze({
  execution_authorized: false,
  deployment_authorized: false,
  service_start_authorized: false,
  credential_access_authorized: false,
  quote_acceptance_authorized: false,
  payment_authority_granted: false,
  payment_execution_authorized: false,
  work_dispatch_authorized: false,
  work_credit_write_authorized: false,
  wallet_or_signer_access_authorized: false,
  transaction_broadcast_authorized: false,
  fund_movement_authorized: false,
});

const FORBIDDEN_UNRELATED_COMMIT =
  "44d9a95e335e9ebabd65e60f7e388385e0d14abe";
const FORBIDDEN_EXPIRED_CREDENTIAL_METADATA_COMMIT =
  "1c0d4d842210158aeac466deb8e0918aa7443997";
const FORBIDDEN_PRE_RESTART_CREDENTIAL_METADATA_COMMIT =
  "9a8cfcbab14d5439e853d19575009ed3245e8b66";

function check(value, message) {
  if (!value) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectRejected(label, operation) {
  try {
    operation();
  } catch (error) {
    check(error instanceof Error, `${label} must throw an Error`);
    return;
  }
  throw new Error(`${label} did not reject`);
}

function verifyOrderedExecutionGates(value) {
  assert.deepEqual(
    value,
    EXPECTED_ORDERED_EXECUTION_GATES,
    "ordered execution gate sequence mismatch",
  );
}

function verifyDeniedAuthority(value) {
  assert.deepEqual(
    value,
    EXPECTED_DENIED_AUTHORITY,
    "denied authority map mismatch",
  );
}

check(
  packet.marker ===
    "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1",
  "marker mismatch",
);
check(packet.version === 1, "version mismatch");
check(
  packet.status === "source_ready_execution_not_authorized",
  "status mismatch",
);
check(
  packet.reviewed_source_main === EXPECTED_REVIEWED_MAIN,
  "reviewed source main mismatch",
);
assert.deepEqual(packet.target, {
  host: "zoso-Precision-Tower-7810",
  runtime_user: "zoso",
  manager_scope: "systemd_user",
  start_mode: "manual_oneshot",
});

const required = packet.required_source_commits;
check(
  required !== null &&
    typeof required === "object" &&
    !Array.isArray(required),
  "required source commits must be an object",
);
assert.deepEqual(
  Object.keys(required).sort(),
  Object.keys(EXPECTED_SOURCE_COMMITS).sort(),
  "required source commit keys mismatch",
);
for (const [name, expectedCommit] of Object.entries(
  EXPECTED_SOURCE_COMMITS,
)) {
  check(
    required[name] === expectedCommit,
    `${name} source binding mismatch`,
  );
}
check(
  packet.reviewed_source_main !== required.credential_reference_metadata,
  "reviewed current-main baseline collapsed into semantic metadata binding",
);

const commits = Object.values(required);
check(commits.length === 12, "required source commit count mismatch");
check(
  commits.every(
    (value) =>
      typeof value === "string" && /^[0-9a-f]{40}$/.test(value),
  ),
  "invalid source commit",
);
check(
  new Set(commits).size === commits.length,
  "unexpected source commit collapse",
);
for (const forbidden of [
  FORBIDDEN_UNRELATED_COMMIT,
  FORBIDDEN_EXPIRED_CREDENTIAL_METADATA_COMMIT,
  FORBIDDEN_PRE_RESTART_CREDENTIAL_METADATA_COMMIT,
]) {
  check(
    !commits.includes(forbidden),
    `forbidden source commit remains bound: ${forbidden}`,
  );
}

check(
  credentialMetadata.marker ===
    "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CREDENTIAL_REFERENCE_METADATA_V1",
  "credential metadata marker mismatch",
);
check(credentialMetadata.version === 1, "credential metadata version mismatch");
check(
  credentialMetadata.status ===
    "source_reference_only_credential_read_forbidden",
  "credential metadata status mismatch",
);

const reference = credentialMetadata.credential_reference;
const snapshot = credentialMetadata.registry_snapshot;
const evidence = credentialMetadata.evidence_binding;
const revalidation = credentialMetadata.revalidation;
const readiness = credentialMetadata.readiness_effect;
const metadataAuthority = credentialMetadata.authority;

check(
  reference.reference_id === EXPECTED_CREDENTIAL_ID,
  "credential reference mismatch",
);
check(
  reference.credential_id === EXPECTED_CREDENTIAL_ID,
  "credential identity mismatch",
);
check(
  reference.registry_id === EXPECTED_TARGET_REGISTRY_ID,
  "target registry mismatch",
);
check(
  snapshot.registry_sha256 === EXPECTED_TARGET_REGISTRY_SHA256,
  "registry digest mismatch",
);
check(
  snapshot.credential_count === EXPECTED_TARGET_CREDENTIAL_COUNT,
  "registry count mismatch",
);

check(
  evidence.receiver_classification === EXPECTED_RECEIVER_CLASSIFICATION,
  "receiver classification mismatch",
);
check(
  evidence.receiver_loaded_registry_id === EXPECTED_TARGET_REGISTRY_ID,
  "loaded registry ID mismatch",
);
check(
  evidence.receiver_loaded_credential_count === EXPECTED_TARGET_CREDENTIAL_COUNT,
  "loaded credential count mismatch",
);
check(
  evidence.receiver_loaded_target_registry === true,
  "target registry not loaded",
);
check(
  evidence.receiver_restart_required === false,
  "obsolete restart requirement remains",
);
check(
  evidence.receiver_configuration_revalidation_required === true,
  "configuration revalidation must remain required",
);
check(
  evidence.receiver_health_observed === true,
  "receiver health not observed",
);
check(
  evidence.receiver_health_http_status === 200,
  "receiver health status mismatch",
);
check(
  evidence.live_authentication_observed === false,
  "live authentication overclaimed",
);
check(
  evidence.payment_execution_observed === false,
  "payment execution overclaimed",
);
check(
  evidence.work_dispatch_observed === false,
  "work dispatch overclaimed",
);
check(
  evidence.work_credit_write_observed === false,
  "Work Credit write overclaimed",
);
check(
  evidence.wallet_or_signer_access_observed === false,
  "wallet/signer access overclaimed",
);
check(
  evidence.fund_movement_observed === false,
  "fund movement overclaimed",
);
check(
  revalidation.current_runtime_freshness_proven_by_source === false,
  "source overclaims current runtime freshness",
);
check(
  readiness.decision_after_publication === "HOLD",
  "readiness must remain HOLD",
);
check(
  readiness.activation_authorized === false,
  "readiness grants activation",
);
check(
  metadataAuthority.activation_authorized === false,
  "metadata grants activation",
);
check(
  metadataAuthority.service_restart === false,
  "metadata grants service restart",
);

const runtimeTruth = packet.credential_runtime_truth;
assert.deepEqual(
  runtimeTruth,
  {
    credential_reference_id: reference.reference_id,
    target_registry_id: reference.registry_id,
    receiver_classification: evidence.receiver_classification,
    receiver_loaded_target_registry: evidence.receiver_loaded_target_registry,
    receiver_restart_required: evidence.receiver_restart_required,
    receiver_configuration_revalidation_required:
      evidence.receiver_configuration_revalidation_required,
    live_authentication_observed: evidence.live_authentication_observed,
    current_runtime_freshness_proven_by_source:
      revalidation.current_runtime_freshness_proven_by_source,
  },
  "packet runtime truth must exactly mirror credential metadata",
);
assert.deepEqual(
  runtimeTruth,
  {
    credential_reference_id: EXPECTED_CREDENTIAL_ID,
    target_registry_id: EXPECTED_TARGET_REGISTRY_ID,
    receiver_classification: EXPECTED_RECEIVER_CLASSIFICATION,
    receiver_loaded_target_registry: true,
    receiver_restart_required: false,
    receiver_configuration_revalidation_required: true,
    live_authentication_observed: false,
    current_runtime_freshness_proven_by_source: false,
  },
  "credential runtime truth mismatch",
);

const gates = packet.ordered_execution_gates;
verifyOrderedExecutionGates(gates);
const alteredUncheckedGate = clone(gates);
alteredUncheckedGate[10] = "materialize_unreviewed_execution_plan";
expectRejected("altered previously unchecked execution gate", () =>
  verifyOrderedExecutionGates(alteredUncheckedGate),
);

assert.deepEqual(packet.mandatory_runtime_inputs, {
  fresh_origin_main: null,
  trusted_context_reference_verified: false,
  credential_reference_verified_and_fresh: false,
  provider_signature_verified: false,
  requester_signature_verified: false,
  fresh_direct_authentication_packet_sha256: null,
  execution_plan_sha256: null,
  fresh_zoso_confirmation: null,
  fresh_quote_required: true,
});

const failures = packet.fail_closed_conditions;
check(
  Array.isArray(failures) && failures.length === 11,
  "fail-closed condition count mismatch",
);
for (const requiredFailure of [
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
  "any_unreviewed_mutation_required",
]) {
  check(
    failures.includes(requiredFailure),
    `fail-closed condition missing: ${requiredFailure}`,
  );
}

const authority = packet.authority;
verifyDeniedAuthority(authority);
const removedAuthorityKey = clone(authority);
delete removedAuthorityKey.payment_execution_authorized;
expectRejected("removed denied-authority key", () =>
  verifyDeniedAuthority(removedAuthorityKey),
);
const replacedAuthorityKey = clone(authority);
delete replacedAuthorityKey.payment_execution_authorized;
replacedAuthorityKey.payment_execution_reviewed = false;
expectRejected("replaced denied-authority key", () =>
  verifyDeniedAuthority(replacedAuthorityKey),
);
const authorityValues = Object.values(authority);

const source = fs.readFileSync(packetPath, "utf8");
check(
  !/(private[_ -]?key|seed phrase|bearer |authorization:|sk-[a-z0-9])/i.test(
    source,
  ),
  "secret-like content detected",
);
check(
  Number.parseInt(process.versions.node.split(".")[0], 10) === 22,
  "Node.js 22 required",
);

console.log("packet_status=source_ready_execution_not_authorized");
console.log(`reviewed_source_main=${packet.reviewed_source_main}`);
console.log(`required_source_commits=${commits.length}`);
console.log(
  `credential_reference_metadata_commit=${required.credential_reference_metadata}`,
);
console.log("reviewed_main_and_semantic_prerequisite_distinct=true");
console.log(`credential_reference_id=${runtimeTruth.credential_reference_id}`);
console.log(`target_registry_id=${runtimeTruth.target_registry_id}`);
console.log(`target_registry_sha256=${snapshot.registry_sha256}`);
console.log(`target_credential_count=${snapshot.credential_count}`);
console.log(`receiver_classification=${runtimeTruth.receiver_classification}`);
console.log("source_binding_semantic_map_exact=true");
console.log("credential_metadata_postrestart_source_bound=true");
console.log("expired_credential_metadata_source_absent=true");
console.log("pre_restart_credential_metadata_source_absent=true");
console.log("unrelated_wc_preflight_source_absent=true");
console.log("receiver_loaded_target_registry=true");
console.log("receiver_restart_required=false");
console.log("receiver_configuration_revalidation_required=true");
console.log("receiver_health_observed=true");
console.log("live_authentication_observed=false");
console.log("current_runtime_freshness_proven_by_source=false");
console.log(`ordered_execution_gates=${gates.length}`);
console.log("ordered_execution_gate_sequence_exact=true");
console.log("altered_unchecked_gate_rejected=true");
console.log("fresh_direct_signing_gates=4");
console.log(`fail_closed_conditions=${failures.length}`);
console.log(`denied_authorities=${authorityValues.length}`);
console.log("denied_authority_map_exact=true");
console.log("removed_authority_key_rejected=true");
console.log("replaced_authority_key_rejected=true");
console.log("fresh_quote_required=true");
console.log("provider_signature_verified=false");
console.log("requester_signature_verified=false");
console.log("fresh_zoso_confirmation_required=true");
console.log("service_restart_authorized=false");
console.log("activation_authorized=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1_PROOF_GREEN=true",
);
