import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildAuthenticatedPaidWorkRuntimeRevalidationReceiptV1,
  computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1,
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1,
  VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_EXPECTED,
} from "../integrations/agents/authenticated-paid-work-runtime-revalidation-v1/index.mjs";

const fixturePath =
  "fixtures/agents/authenticated-paid-work-runtime-revalidation-receipt-v1.example.json";

function expectReject(label, operation, pattern) {
  try {
    operation();
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!pattern.test(message)) {
      throw new Error(`${label}_wrong_error:${message}`);
    }
    return;
  }
  throw new Error(`${label}_did_not_reject`);
}

function clone(value) {
  return structuredClone(value);
}

const expected = VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_EXPECTED;
const input = {
  source: {
    reviewed_source_main: expected.reviewed_source_main,
    execution_packet_marker: expected.execution_packet_marker,
    execution_packet_status: expected.execution_packet_status,
    execution_packet_merge_commit: expected.execution_packet_merge_commit,
    credential_metadata_commit: expected.credential_metadata_commit,
  },
  target: {
    host: expected.host,
    manager_scope: expected.manager_scope,
    service: expected.service,
    listener_host: expected.listener_host,
    listener_port: expected.listener_port,
  },
  observation: {
    captured_at_utc: "2026-08-04T16:50:00.000Z",
    evaluated_at_utc: "2026-08-04T16:50:09.250Z",
    max_age_seconds: 300,
    relative_age_seconds: 10,
    clock_synchronized: true,
  },
  receiver: {
    service_active: true,
    main_pid: 1426443,
    health_http_status: 200,
    listener_loopback_only: true,
    loaded_registry_id: expected.registry_id,
    loaded_registry_sha256: expected.registry_sha256,
    loaded_credential_count: expected.credential_count,
    target_registry_loaded: true,
    restart_required: false,
    configuration_revalidation_completed: true,
    secret_values_disclosed: false,
  },
  credential: {
    selected_credential_id: expected.selected_credential_id,
    agent_id: expected.agent_id,
    scope: expected.scope,
    not_before_utc: expected.credential_not_before_utc,
    expires_at_utc: expected.credential_expires_at_utc,
    identity_verified: true,
    scope_verified: true,
    validity_window_contains_observation: true,
    revocation_checked: true,
    revoked: false,
    raw_token_read: false,
    secret_material_disclosed: false,
  },
  replay: {
    replay_state_checked: true,
    unexpected_mutation_observed: false,
    selected_credential_previously_consumed: false,
    replay_state_acceptable: true,
  },
  runtime_inputs: {
    fresh_origin_main: expected.reviewed_source_main,
    trusted_context_reference_verified: true,
    credential_reference_verified_and_fresh: true,
    provider_signature_verified: false,
    requester_signature_verified: false,
    fresh_direct_authentication_packet_sha256: null,
    execution_plan_sha256: null,
    fresh_zoso_confirmation: null,
    fresh_quote_required: true,
  },
  safety: {
    live_authentication_performed: false,
    payment_execution_performed: false,
    work_dispatch_performed: false,
    work_credit_write_performed: false,
    wallet_or_signer_access_performed: false,
    transaction_broadcast_performed: false,
    fund_movement_performed: false,
    service_mutation_performed: false,
  },
  decision: {
    status: "HOLD_PENDING_SIGNATURES_QUOTE_PLAN_AND_CONFIRMATION",
    runtime_revalidation_satisfied: true,
    fresh_signatures_required: true,
    fresh_quote_required: true,
    execution_plan_digest_required: true,
    fresh_zoso_confirmation_required: true,
    execution_authorized: false,
  },
};

const receipt = buildAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(input);
assert.equal(validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(receipt), receipt);
assert.equal(
  receipt.receipt_id,
  computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(receipt),
);

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
assert.deepEqual(fixture, receipt, "checked-in example must equal deterministic receipt");

const wrongMain = clone(receipt);
wrongMain.source.reviewed_source_main = "0".repeat(40);
wrongMain.receipt_id = computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(wrongMain);
expectReject("wrong_source_main", () =>
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(wrongMain),
/source_reviewed_source_main_mismatch/);

const publicListener = clone(receipt);
publicListener.target.listener_host = "0.0.0.0";
publicListener.receipt_id = computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(publicListener);
expectReject("public_listener", () =>
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(publicListener),
/target_listener_host_mismatch|target_listener_not_loopback/);

const stale = clone(receipt);
stale.observation.evaluated_at_utc = "2026-08-04T16:56:00.000Z";
stale.observation.relative_age_seconds = 360;
stale.receipt_id = computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(stale);
expectReject("stale_observation", () =>
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(stale),
/observation_stale/);

const expired = clone(receipt);
expired.observation.captured_at_utc = "2026-08-05T00:00:01.000Z";
expired.observation.evaluated_at_utc = "2026-08-05T00:00:02.000Z";
expired.observation.relative_age_seconds = 1;
expired.receipt_id = computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(expired);
expectReject("expired_credential", () =>
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(expired),
/credential_outside_validity_window/);

const revoked = clone(receipt);
revoked.credential.revoked = true;
revoked.receipt_id = computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(revoked);
expectReject("revoked_credential", () =>
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(revoked),
/credential_revoked_must_be_false/);

const tokenRead = clone(receipt);
tokenRead.credential.raw_token_read = true;
tokenRead.receipt_id = computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(tokenRead);
expectReject("raw_token_read", () =>
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(tokenRead),
/credential_raw_token_read_must_be_false/);

const consumed = clone(receipt);
consumed.replay.selected_credential_previously_consumed = true;
consumed.receipt_id = computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(consumed);
expectReject("credential_consumed", () =>
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(consumed),
/replay_selected_credential_previously_consumed_must_be_false/);

const serviceMutation = clone(receipt);
serviceMutation.safety.service_mutation_performed = true;
serviceMutation.receipt_id = computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(serviceMutation);
expectReject("service_mutation", () =>
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(serviceMutation),
/safety_service_mutation_performed_must_be_false/);

const executionGranted = clone(receipt);
executionGranted.decision.execution_authorized = true;
executionGranted.receipt_id = computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(executionGranted);
expectReject("execution_granted", () =>
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(executionGranted),
/decision_execution_authorized_must_be_false/);

const tamperedId = clone(receipt);
tamperedId.receipt_id = `voidapwrr1_${"f".repeat(64)}`;
expectReject("receipt_id_tamper", () =>
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(tamperedId),
/receipt_id_derivation_mismatch/);

console.log(`receipt_id=${receipt.receipt_id}`);
console.log(`reviewed_source_main=${receipt.source.reviewed_source_main}`);
console.log(`selected_credential_id=${receipt.credential.selected_credential_id}`);
console.log(`target_registry_id=${receipt.receiver.loaded_registry_id}`);
console.log("receipt_content_address_verified=true");
console.log("source_main_binding_exact=true");
console.log("listener_loopback_only=true");
console.log("receiver_target_registry_loaded=true");
console.log("credential_valid_at_observation=true");
console.log("credential_revocation_checked=true");
console.log("raw_token_read=false");
console.log("replay_state_acceptable=true");
console.log("service_mutation_performed=false");
console.log("execution_authorized=false");
console.log("VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_RECEIPT_V1_PROOF_GREEN");
