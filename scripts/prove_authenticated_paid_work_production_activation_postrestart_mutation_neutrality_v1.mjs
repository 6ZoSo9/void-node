#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROOF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_POSTRESTART_MUTATION_NEUTRALITY_V1";
const METADATA_RELATIVE_PATH =
  "config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json";
const DOC_RELATIVE_PATH =
  "docs/operations/authenticated-paid-work-production-activation-credential-reference-metadata-v1.md";
const REVIEWED_PREFIX_COUNT = 8;
const EXPECTED_REGISTRY_COUNT = 9;

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const repoPath = (relativePath) => path.join(repoRoot, relativePath);
const metadata = JSON.parse(
  readFileSync(repoPath(METADATA_RELATIVE_PATH), "utf8"),
);
const normalizedDocText = readFileSync(repoPath(DOC_RELATIVE_PATH), "utf8").replace(
  /\s+/gu,
  " ",
);

function requireNonNegativeSafeInteger(value, label) {
  assert.ok(Number.isSafeInteger(value), `${label} must be a safe integer`);
  assert.ok(value >= 0, `${label} must be non-negative`);
}

const reference = metadata.credential_reference;
const snapshot = metadata.registry_snapshot;
const evidence = metadata.evidence_binding;
const readiness = metadata.readiness_effect;

assert.equal(snapshot.credential_count, EXPECTED_REGISTRY_COUNT);
assert.equal(
  snapshot.credential_count,
  REVIEWED_PREFIX_COUNT + 1,
  "the reviewed eight-record prefix must have exactly one safe append",
);
assert.equal(evidence.reviewed_eight_record_prefix_preserved_exactly, true);
assert.equal(evidence.safe_ninth_credential_append_exact, true);
assert.equal(
  evidence.receiver_loaded_credential_count,
  snapshot.credential_count,
  "receiver and source registry counts must agree",
);
assert.equal(
  evidence.receiver_loaded_registry_id,
  reference.registry_id,
  "receiver registry must match the selected credential registry",
);
assert.equal(evidence.receiver_loaded_target_registry, true);
assert.equal(evidence.receiver_restart_required, false);
assert.equal(evidence.receiver_configuration_revalidation_required, true);

for (const [label, value] of [
  ["receiver_main_pid_before", evidence.receiver_main_pid_before],
  ["receiver_main_pid_after", evidence.receiver_main_pid_after],
]) {
  assert.ok(Number.isSafeInteger(value), `${label} must be a safe integer`);
  assert.ok(value > 0, `${label} must be positive`);
}
assert.notEqual(
  evidence.receiver_main_pid_before,
  evidence.receiver_main_pid_after,
  "restart evidence must name different process IDs",
);
assert.equal(
  evidence.receiver_main_pid_changed,
  evidence.receiver_main_pid_before !== evidence.receiver_main_pid_after,
  "PID-change claim must be derived from the recorded PIDs",
);

for (const [label, value] of [
  ["receiver_receipt_count_before", evidence.receiver_receipt_count_before],
  ["receiver_receipt_count_after", evidence.receiver_receipt_count_after],
  [
    "receiver_submission_index_count_before",
    evidence.receiver_submission_index_count_before,
  ],
  [
    "receiver_submission_index_count_after",
    evidence.receiver_submission_index_count_after,
  ],
]) {
  requireNonNegativeSafeInteger(value, label);
}
assert.equal(
  evidence.receiver_receipt_count_before,
  evidence.receiver_receipt_count_after,
  "restart must not create or remove paid-work receipts",
);
assert.equal(
  evidence.receiver_submission_index_count_before,
  evidence.receiver_submission_index_count_after,
  "restart must not create or remove submission-index entries",
);
assert.equal(
  evidence.receiver_receipt_count_before,
  evidence.receiver_submission_index_count_before,
  "pre-restart receipt and submission-index counts must agree",
);
assert.equal(
  evidence.receiver_receipt_count_after,
  evidence.receiver_submission_index_count_after,
  "post-restart receipt and submission-index counts must agree",
);

assert.notEqual(
  reference.credential_id,
  evidence.additional_installed_credential_id,
  "the selected credential must not silently switch to the appended credential",
);
assert.notEqual(
  reference.credential_id,
  evidence.fresh_direct_requester_credential_id,
  "the selected credential must not silently switch to the direct requester credential",
);
assert.notEqual(
  evidence.additional_installed_credential_id,
  evidence.fresh_direct_requester_credential_id,
  "installed credential identities must remain distinct",
);
assert.equal(evidence.fresh_direct_requester_used_as_activation_credential, false);

assert.equal(evidence.receiver_health_observed, true);
assert.equal(evidence.receiver_health_http_status, 200);
assert.equal(evidence.live_authentication_observed, false);
assert.equal(evidence.live_http_status, null);
for (const key of [
  "payment_execution_observed",
  "work_dispatch_observed",
  "work_credit_write_observed",
  "wallet_or_signer_access_observed",
  "fund_movement_observed",
]) {
  assert.equal(evidence[key], false, `${key} must remain false`);
}

assert.equal(readiness.decision_after_publication, "HOLD");
assert.equal(readiness.activation_authorized, false);
assert.equal(readiness.separate_activation_execution_lane_required, true);
assert.deepEqual(readiness.remaining_requirements_after_known_satisfied, [
  "bounded_replay_snapshot",
  "activation_execution_confirmation",
  "live_canary_scope",
]);
assert.equal(metadata.revalidation.current_runtime_freshness_proven_by_source, false);
assert.equal(metadata.revalidation.registry_snapshot_revalidation_required, true);
assert.equal(metadata.revalidation.credential_identity_revalidation_required, true);
assert.equal(metadata.revalidation.validity_window_revalidation_required, true);
assert.equal(metadata.revalidation.revocation_revalidation_required, true);

assert.equal(metadata.authority.source_reference_metadata_created, true);
for (const [key, value] of Object.entries(metadata.authority)) {
  if (key !== "source_reference_metadata_created") {
    assert.equal(value, false, `authority must remain false: ${key}`);
  }
}

for (const requiredText of [
  "Post-restart mutation-neutrality proof",
  "does not prove that the private restart receipt is authentic",
  "does not convert the captured point-in-time observation into current runtime freshness",
  "The readiness decision remains `HOLD`.",
]) {
  assert.ok(
    normalizedDocText.includes(requiredText),
    `operator document missing: ${requiredText}`,
  );
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
assert.equal(
  nodeMajor,
  22,
  `proof requires Node.js 22.x, observed ${process.versions.node}`,
);

console.log(`${PROOF_MARKER}_PROOF_GREEN=true`);
console.log("registry_safe_append_count_exact=true");
console.log("receiver_registry_binding_exact=true");
console.log("receiver_pid_change_derived=true");
console.log("receipt_count_mutation_observed=false");
console.log("submission_index_mutation_observed=false");
console.log("receipt_submission_count_drift_observed=false");
console.log("selected_credential_substitution_observed=false");
console.log("live_authentication_observed=false");
console.log("payment_execution_observed=false");
console.log("work_dispatch_observed=false");
console.log("work_credit_write_observed=false");
console.log("wallet_or_signer_access_observed=false");
console.log("fund_movement_observed=false");
console.log("current_runtime_freshness_proven_by_source=false");
console.log("activation_authorized=false");
console.log("wall_clock_read=false");
console.log("credential_or_token_read=false");
console.log("private_restart_receipt_read=false");
console.log("service_restart=false");
