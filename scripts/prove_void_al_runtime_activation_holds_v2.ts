#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1,
  VOID_ALIGNMENT_LAYER_VERSION_V1,
  VOID_MAINNET_CHAIN_ID_V1,
  evaluateVoidAlignmentLayerV1,
  getVoidAlignmentLayerRequiredChecksV1,
  type VoidAlEvaluationRequestV1,
} from "../src/security/void_alignment_layer_v1.js";
import {
  VOID_MAINNET_CHAIN_ID_EMERGENCY_V1,
  VOID_SOVEREIGN_EMERGENCY_CERTIFICATE_MARKER_V1,
  VOID_SOVEREIGN_EMERGENCY_DOMAIN_V1,
  VOID_SOVEREIGN_EMERGENCY_STATE_MARKER_V1,
  VOID_SOVEREIGN_EMERGENCY_VERSION_V1,
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1,
  admitVoidSovereignEmergencyCertificateAgainstFingerprintV1,
  initialVoidSovereignEmergencyControlStateV1,
} from "../src/security/void_sovereign_emergency_control_v1.js";

const MARKER = "VOID_AL_RUNTIME_ACTIVATION_HOLDS_V2_PROOF_GREEN";
const ZERO = "0".repeat(64);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validAlRequest(): VoidAlEvaluationRequestV1 {
  const mutation = sha256("v2-valid-mutation");
  const actor = sha256("v2-valid-actor");
  return {
    marker: VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1,
    version: VOID_ALIGNMENT_LAYER_VERSION_V1,
    chain_id: VOID_MAINNET_CHAIN_ID_V1,
    phase: "pre_accept",
    mutation_class: "ordinary_state",
    mutation_sha256: mutation,
    actor_id_sha256: actor,
    checks: getVoidAlignmentLayerRequiredChecksV1(
      "pre_accept",
      "ordinary_state",
    ).map(({ check_id }) => ({
      check_id,
      passed: true,
      evidence_sha256: sha256(`v2-evidence:${check_id}`),
    })),
  };
}

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "fixtures/governance/void-al-runtime-activation-holds-v2.json",
    ),
    "utf8",
  ),
);
assert.equal(fixture.marker, "VOID_AL_RUNTIME_ACTIVATION_HOLDS_V2_20260824");
assert.equal(fixture.status, "source_repair_activation_still_held");
assert.equal(fixture.closed_current_main_debts.al_zero_mutation_actor_hash_rejected, true);
assert.equal(fixture.closed_current_main_debts.al_zero_check_evidence_rejected, true);
assert.equal(fixture.closed_current_main_debts.malformed_decision_binds_rejected_content, true);
assert.equal(
  fixture.closed_current_main_debts.emergency_uint64_exhaustion_terminal_hold,
  "EMERGENCY_SEQUENCE_EXHAUSTED",
);
assert.equal(fixture.remaining_activation_holds.legacy_index_runtime, "HOLD_AL_LEGACY_INDEX_RUNTIME_NOT_RETIRED");
assert.equal(fixture.remaining_activation_holds.bootstrap, "HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED");
assert.equal(fixture.remaining_activation_holds.durable_safe_mode, "HOLD_AL_DURABLE_SAFE_MODE_STATE_REQUIRED");
assert.equal(fixture.authority_boundary.al_bootstrap_mounted, false);
assert.equal(fixture.authority_boundary.live_al_enabled, false);
assert.equal(fixture.authority_boundary.chain2050_live_mutation, false);
assert.equal(fixture.authority_boundary.money_movement, false);

const doc = fs.readFileSync(
  path.join(process.cwd(), "docs/governance/void-al-runtime-activation-holds-v2.md"),
  "utf8",
);
assert.match(doc, /VOID_AL_RUNTIME_ACTIVATION_HOLDS_V2_20260824/);
assert.match(doc, /EMERGENCY_SEQUENCE_EXHAUSTED/);
assert.match(doc, /HOLD_AL_LEGACY_INDEX_RUNTIME_NOT_RETIRED/);
assert.match(doc, /HOLD_AL_DURABLE_SAFE_MODE_STATE_REQUIRED/);
assert.match(doc, /activation_ready=false/);

const valid = validAlRequest();
const allowed = evaluateVoidAlignmentLayerV1(valid);
assert.equal(allowed.disposition, "allow");
assert.equal(allowed.reason_code, "AL_ALLOW");

const zeroMutation = evaluateVoidAlignmentLayerV1({
  ...valid,
  mutation_sha256: ZERO,
});
assert.equal(zeroMutation.disposition, "reject");
assert.equal(zeroMutation.reason_code, "AL_REQUEST_IDENTITY_HASH_INVALID");

const zeroActor = evaluateVoidAlignmentLayerV1({
  ...valid,
  actor_id_sha256: ZERO,
});
assert.equal(zeroActor.disposition, "reject");
assert.equal(zeroActor.reason_code, "AL_REQUEST_IDENTITY_HASH_INVALID");

const zeroCheck = structuredClone(valid);
zeroCheck.checks[0].evidence_sha256 = ZERO;
const zeroCheckDecision = evaluateVoidAlignmentLayerV1(zeroCheck);
assert.equal(zeroCheckDecision.disposition, "reject");
assert.equal(zeroCheckDecision.reason_code, "AL_CHECK_VALUE_INVALID");

const malformedA = evaluateVoidAlignmentLayerV1({
  ...valid,
  unexpected_authority_field: "alpha",
});
const malformedB = evaluateVoidAlignmentLayerV1({
  ...valid,
  unexpected_authority_field: "beta",
});
assert.equal(malformedA.reason_code, "AL_REQUEST_SCHEMA_NOT_CLOSED");
assert.equal(malformedB.reason_code, "AL_REQUEST_SCHEMA_NOT_CLOSED");
assert.notEqual(
  malformedA.evidence_sha256,
  malformedB.evidence_sha256,
  "malformed evidence must bind exact rejected content",
);

const zeroHeadCertificate = {
  marker: VOID_SOVEREIGN_EMERGENCY_CERTIFICATE_MARKER_V1,
  version: VOID_SOVEREIGN_EMERGENCY_VERSION_V1,
  domain: VOID_SOVEREIGN_EMERGENCY_DOMAIN_V1,
  chain_id: VOID_MAINNET_CHAIN_ID_EMERGENCY_V1,
  action: "PAUSE",
  sequence: "0",
  issued_at_utc: "2026-08-24T09:00:00Z",
  expires_at_utc: "2026-08-24T09:10:00Z",
  observed_head_number: "1",
  observed_head_hash_sha256: ZERO,
  reason_code: "SOVEREIGN_DIRECTIVE",
  evidence_sha256: "3".repeat(64),
  previous_certificate_sha256: ZERO,
  resume_of_pause_certificate_sha256: ZERO,
  signer_role: VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1,
  signer_public_key_der_sha256: VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  signature_base64: Buffer.alloc(64).toString("base64"),
};
const zeroHead = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: initialVoidSovereignEmergencyControlStateV1(),
  certificate: zeroHeadCertificate,
  public_key_pem: "not-read-because-certificate-invalid",
  expected_signer_der_sha256: VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  now_utc: "2026-08-24T09:05:00Z",
});
assert.equal(zeroHead.ok, false);
assert.equal(zeroHead.code, "EMERGENCY_CERTIFICATE_INVALID");

const maxSequenceState = {
  marker: VOID_SOVEREIGN_EMERGENCY_STATE_MARKER_V1,
  version: VOID_SOVEREIGN_EMERGENCY_VERSION_V1,
  chain_id: VOID_MAINNET_CHAIN_ID_EMERGENCY_V1,
  mode: "running",
  last_sequence: "18446744073709551615",
  last_certificate_sha256: "1".repeat(64),
  active_pause_certificate_sha256: ZERO,
};
const exhaustionCertificate = {
  ...zeroHeadCertificate,
  observed_head_hash_sha256: "2".repeat(64),
  previous_certificate_sha256: maxSequenceState.last_certificate_sha256,
};
const exhausted = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: maxSequenceState,
  certificate: exhaustionCertificate,
  public_key_pem: "not-read-because-sequence-is-terminal",
  expected_signer_der_sha256: VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  now_utc: "2026-08-24T09:05:00Z",
});
assert.equal(exhausted.ok, false);
assert.equal(exhausted.code, "EMERGENCY_SEQUENCE_EXHAUSTED");
assert.deepEqual(exhausted.state, maxSequenceState);

console.log(MARKER);
console.log("al_zero_mutation_hash_rejected=true");
console.log("al_zero_actor_hash_rejected=true");
console.log("al_zero_check_evidence_rejected=true");
console.log("malformed_evidence_exact_content_bound=true");
console.log("emergency_zero_observed_head_hash_rejected=true");
console.log("emergency_uint64_exhaustion_terminal=true");
console.log("activation_ready=false");
console.log("legacy_index_hold=HOLD_AL_LEGACY_INDEX_RUNTIME_NOT_RETIRED");
console.log("bootstrap_hold=HOLD_AL_BLOCK_COMMIT_BOOTSTRAP_NOT_MOUNTED");
console.log("durable_safe_mode_hold=HOLD_AL_DURABLE_SAFE_MODE_STATE_REQUIRED");
console.log("live_activation_performed=false");
console.log("sovereign_usb_access=false");
console.log("chain2050_mutation_performed=false");
console.log("money_movement=false");
