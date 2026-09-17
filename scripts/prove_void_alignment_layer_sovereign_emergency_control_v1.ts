#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import { readFileSync } from "node:fs";

import {
  VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1,
  evaluateVoidAlignmentLayerV1,
  getVoidAlignmentLayerRequiredChecksV1,
  getVoidAlignmentLayerSafeModePolicyV1,
  type VoidAlMutationClassV1,
  type VoidAlPhaseV1,
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
  admitVoidSovereignEmergencyCertificateV1,
  canonicalVoidSovereignEmergencyPayloadV1,
  initialVoidSovereignEmergencyControlStateV1,
  verifyVoidEd25519SignatureAgainstFingerprintV1,
  type VoidSovereignEmergencyCertificateV1,
} from "../src/security/void_sovereign_emergency_control_v1.js";

const MARKER = "VOID_ALIGNMENT_LAYER_SOVEREIGN_EMERGENCY_CONTROL_V1_PROOF_GREEN";
const ZERO_SHA256 = "0".repeat(64);

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function makeAlRequest(
  phase: VoidAlPhaseV1,
  mutationClass: VoidAlMutationClassV1,
  mutate?: (checks: Array<{ check_id: string; passed: boolean; evidence_sha256: string }>) => void,
) {
  const checks = getVoidAlignmentLayerRequiredChecksV1(phase, mutationClass).map((entry) => ({
    check_id: entry.check_id,
    passed: true,
    evidence_sha256: sha256(`evidence:${phase}:${mutationClass}:${entry.check_id}`),
  }));
  mutate?.(checks);
  return {
    marker: VOID_ALIGNMENT_LAYER_REQUEST_MARKER_V1,
    version: 1,
    chain_id: 2050,
    phase,
    mutation_class: mutationClass,
    mutation_sha256: sha256(`mutation:${phase}:${mutationClass}`),
    actor_id_sha256: sha256("actor:proof"),
    checks,
  };
}

const alGreen = evaluateVoidAlignmentLayerV1(makeAlRequest("pre_accept", "governance"));
assert.equal(alGreen.disposition, "allow");
assert.equal(alGreen.reason_code, "AL_ALLOW");
assert.equal(alGreen.safe_mode_required, false);

const reversed = makeAlRequest("pre_accept", "governance");
reversed.checks.reverse();
const reversedDecision = evaluateVoidAlignmentLayerV1(reversed);
assert.equal(reversedDecision.disposition, "allow");
assert.equal(reversedDecision.evidence_sha256, alGreen.evidence_sha256);

const missing = evaluateVoidAlignmentLayerV1(
  makeAlRequest("pre_accept", "governance", (checks) => checks.pop()),
);
assert.equal(missing.disposition, "reject");
assert.equal(missing.reason_code, "AL_REQUIRED_CHECK_MISSING");

const duplicateRequest = makeAlRequest("pre_accept", "ordinary_state");
duplicateRequest.checks.push({ ...duplicateRequest.checks[0] });
const duplicate = evaluateVoidAlignmentLayerV1(duplicateRequest);
assert.equal(duplicate.disposition, "reject");
assert.equal(duplicate.reason_code, "AL_DUPLICATE_CHECK_ID");

const unknownRequest = makeAlRequest("pre_accept", "ordinary_state");
unknownRequest.checks.push({
  check_id: "void.al.unreviewed.extension.v1",
  passed: true,
  evidence_sha256: sha256("unreviewed"),
});
const unknown = evaluateVoidAlignmentLayerV1(unknownRequest);
assert.equal(unknown.disposition, "reject");
assert.equal(unknown.reason_code, "AL_UNKNOWN_CHECK_ID");

const quarantine = evaluateVoidAlignmentLayerV1(
  makeAlRequest("pre_accept", "ordinary_state", (checks) => {
    const target = checks.find((entry) => entry.check_id === "void.al.actor_security_boundary.v1");
    assert.ok(target);
    target.passed = false;
  }),
);
assert.equal(quarantine.disposition, "quarantine");
assert.deepEqual(quarantine.failed_check_ids, ["void.al.actor_security_boundary.v1"]);

const policyFailure = evaluateVoidAlignmentLayerV1(
  makeAlRequest("pre_accept", "ordinary_state", (checks) => {
    const target = checks.find((entry) => entry.check_id === "void.al.policy_integrity.v1");
    assert.ok(target);
    target.passed = false;
  }),
);
assert.equal(policyFailure.disposition, "safe_mode");
assert.equal(policyFailure.safe_mode_required, true);

const postFailure = evaluateVoidAlignmentLayerV1(
  makeAlRequest("post_apply", "economic", (checks) => {
    const target = checks.find((entry) => entry.check_id === "void.al.post.economic_conservation.v1");
    assert.ok(target);
    target.passed = false;
  }),
);
assert.equal(postFailure.disposition, "safe_mode");
assert.equal(postFailure.safe_mode_required, true);

const malformedPost = evaluateVoidAlignmentLayerV1({
  ...makeAlRequest("post_apply", "ordinary_state"),
  extra_authority: true,
});
assert.equal(malformedPost.disposition, "safe_mode");
assert.equal(malformedPost.reason_code, "AL_REQUEST_SCHEMA_NOT_CLOSED");

const safeMode = getVoidAlignmentLayerSafeModePolicyV1();
for (const key of [
  "block_sealing",
  "block_import",
  "transaction_admission",
  "governance_mutation",
  "validator_mutation",
  "economic_settlement",
  "work_credit_mutation",
  "treasury_mutation",
  "runtime_activation",
] as const) {
  assert.equal(safeMode[key], false, `${key} unexpectedly enabled in safe mode`);
}
assert.equal(safeMode.read_only_health, true);
assert.equal(safeMode.read_only_diagnostics, true);
assert.equal(safeMode.evidence_export, true);
assert.equal(safeMode.automatic_resume_allowed, false);
assert.equal(safeMode.sovereign_resume_required, true);

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicPem = publicKey.export({ type: "spki", format: "pem" });
assert.equal(typeof publicPem, "string");
const publicDer = publicKey.export({ type: "spki", format: "der" });
assert.ok(Buffer.isBuffer(publicDer));
const testFingerprint = sha256(publicDer);

function makeCertificate(
  values: Partial<VoidSovereignEmergencyCertificateV1> & Pick<VoidSovereignEmergencyCertificateV1, "action" | "sequence" | "previous_certificate_sha256" | "resume_of_pause_certificate_sha256" | "reason_code">,
): VoidSovereignEmergencyCertificateV1 {
  const unsigned: VoidSovereignEmergencyCertificateV1 = {
    marker: VOID_SOVEREIGN_EMERGENCY_CERTIFICATE_MARKER_V1,
    version: VOID_SOVEREIGN_EMERGENCY_VERSION_V1,
    domain: VOID_SOVEREIGN_EMERGENCY_DOMAIN_V1,
    chain_id: VOID_MAINNET_CHAIN_ID_EMERGENCY_V1,
    action: values.action,
    sequence: values.sequence,
    issued_at_utc: values.issued_at_utc ?? "2026-08-24T07:10:00Z",
    expires_at_utc: values.expires_at_utc ?? "2026-08-24T07:20:00Z",
    observed_head_number: values.observed_head_number ?? "1900961",
    observed_head_hash_sha256: values.observed_head_hash_sha256 ?? sha256("observed-head"),
    reason_code: values.reason_code,
    evidence_sha256: values.evidence_sha256 ?? sha256("incident-evidence"),
    previous_certificate_sha256: values.previous_certificate_sha256,
    resume_of_pause_certificate_sha256: values.resume_of_pause_certificate_sha256,
    signer_role: VOID_SOVEREIGN_PRIMARY_GOVERNANCE_ROLE_V1,
    signer_public_key_der_sha256: values.signer_public_key_der_sha256 ?? testFingerprint,
    signature_base64: "",
  };
  unsigned.signature_base64 = sign(
    null,
    canonicalVoidSovereignEmergencyPayloadV1(unsigned),
    privateKey,
  ).toString("base64");
  return unsigned;
}

const pause = makeCertificate({
  action: "PAUSE",
  sequence: "0",
  previous_certificate_sha256: ZERO_SHA256,
  resume_of_pause_certificate_sha256: ZERO_SHA256,
  reason_code: "AL_CRITICAL_FAILURE",
});

const lowLevelSignature = verifyVoidEd25519SignatureAgainstFingerprintV1(
  publicPem,
  testFingerprint,
  canonicalVoidSovereignEmergencyPayloadV1(pause),
  pause.signature_base64,
);
assert.equal(lowLevelSignature.ok, true);

const badSignatureBytes = Buffer.from(pause.signature_base64, "base64");
badSignatureBytes[0] ^= 0x01;
const badSignature = verifyVoidEd25519SignatureAgainstFingerprintV1(
  publicPem,
  testFingerprint,
  canonicalVoidSovereignEmergencyPayloadV1(pause),
  badSignatureBytes.toString("base64"),
);
assert.deepEqual(badSignature, { ok: false, code: "SIGNATURE_INVALID" });

const initialState = initialVoidSovereignEmergencyControlStateV1();
const pauseAdmission = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: initialState,
  certificate: pause,
  public_key_pem: publicPem,
  expected_signer_der_sha256: testFingerprint,
  now_utc: "2026-08-24T07:11:00Z",
});
assert.equal(pauseAdmission.ok, true);
assert.equal(pauseAdmission.state?.mode, "paused");
assert.equal(pauseAdmission.state?.last_sequence, "0");
assert.ok(pauseAdmission.certificate_sha256);

const replay = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: pauseAdmission.state,
  certificate: pause,
  public_key_pem: publicPem,
  expected_signer_der_sha256: testFingerprint,
  now_utc: "2026-08-24T07:11:01Z",
});
assert.equal(replay.ok, false);
assert.equal(replay.code, "EMERGENCY_SEQUENCE_MISMATCH");

assert.ok(pauseAdmission.certificate_sha256);
const resume = makeCertificate({
  action: "RESUME",
  sequence: "1",
  previous_certificate_sha256: pauseAdmission.certificate_sha256,
  resume_of_pause_certificate_sha256: pauseAdmission.certificate_sha256,
  reason_code: "RECOVERY_COMPLETE",
  evidence_sha256: sha256("recovery-evidence"),
});
const resumeAdmission = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: pauseAdmission.state,
  certificate: resume,
  public_key_pem: publicPem,
  expected_signer_der_sha256: testFingerprint,
  now_utc: "2026-08-24T07:12:00Z",
});
assert.equal(resumeAdmission.ok, true);
assert.equal(resumeAdmission.state?.mode, "running");
assert.equal(resumeAdmission.state?.last_sequence, "1");
assert.equal(resumeAdmission.state?.active_pause_certificate_sha256, ZERO_SHA256);

const wrongPredecessor = makeCertificate({
  action: "RESUME",
  sequence: "1",
  previous_certificate_sha256: ZERO_SHA256,
  resume_of_pause_certificate_sha256: pauseAdmission.certificate_sha256,
  reason_code: "RECOVERY_COMPLETE",
});
const wrongPredecessorAdmission = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: pauseAdmission.state,
  certificate: wrongPredecessor,
  public_key_pem: publicPem,
  expected_signer_der_sha256: testFingerprint,
  now_utc: "2026-08-24T07:12:00Z",
});
assert.equal(wrongPredecessorAdmission.ok, false);
assert.equal(wrongPredecessorAdmission.code, "EMERGENCY_PREDECESSOR_MISMATCH");

const wrongResumeReference = makeCertificate({
  action: "RESUME",
  sequence: "1",
  previous_certificate_sha256: pauseAdmission.certificate_sha256,
  resume_of_pause_certificate_sha256: sha256("wrong-pause"),
  reason_code: "RECOVERY_COMPLETE",
});
const wrongResumeAdmission = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: pauseAdmission.state,
  certificate: wrongResumeReference,
  public_key_pem: publicPem,
  expected_signer_der_sha256: testFingerprint,
  now_utc: "2026-08-24T07:12:00Z",
});
assert.equal(wrongResumeAdmission.ok, false);
assert.equal(wrongResumeAdmission.code, "EMERGENCY_RESUME_REFERENCE_MISMATCH");

const expiredPause = makeCertificate({
  action: "PAUSE",
  sequence: "0",
  previous_certificate_sha256: ZERO_SHA256,
  resume_of_pause_certificate_sha256: ZERO_SHA256,
  reason_code: "SOVEREIGN_DIRECTIVE",
  issued_at_utc: "2026-08-24T06:00:00Z",
  expires_at_utc: "2026-08-24T06:10:00Z",
});
const expiredAdmission = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: initialState,
  certificate: expiredPause,
  public_key_pem: publicPem,
  expected_signer_der_sha256: testFingerprint,
  now_utc: "2026-08-24T07:11:00Z",
});
assert.equal(expiredAdmission.ok, false);
assert.equal(expiredAdmission.code, "EMERGENCY_CERTIFICATE_NOT_CURRENT");

const overlongPause = makeCertificate({
  action: "PAUSE",
  sequence: "0",
  previous_certificate_sha256: ZERO_SHA256,
  resume_of_pause_certificate_sha256: ZERO_SHA256,
  reason_code: "SOVEREIGN_DIRECTIVE",
  issued_at_utc: "2026-08-24T07:00:00Z",
  expires_at_utc: "2026-08-24T07:15:01Z",
});
const overlongAdmission = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: initialState,
  certificate: overlongPause,
  public_key_pem: publicPem,
  expected_signer_der_sha256: testFingerprint,
  now_utc: "2026-08-24T07:11:00Z",
});
assert.equal(overlongAdmission.ok, false);
assert.equal(overlongAdmission.code, "EMERGENCY_CERTIFICATE_TTL_TOO_LONG");

const unknownFieldCertificate = { ...pause, new_authority: true };
const unknownFieldAdmission = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: initialState,
  certificate: unknownFieldCertificate,
  public_key_pem: publicPem,
  expected_signer_der_sha256: testFingerprint,
  now_utc: "2026-08-24T07:11:00Z",
});
assert.equal(unknownFieldAdmission.ok, false);
assert.equal(unknownFieldAdmission.code, "EMERGENCY_CERTIFICATE_INVALID");

const invalidStateAdmission = admitVoidSovereignEmergencyCertificateAgainstFingerprintV1({
  state: { ...initialState, silent_unpause: true },
  certificate: pause,
  public_key_pem: publicPem,
  expected_signer_der_sha256: testFingerprint,
  now_utc: "2026-08-24T07:11:00Z",
});
assert.equal(invalidStateAdmission.ok, false);
assert.equal(invalidStateAdmission.code, "EMERGENCY_STATE_INVALID");
assert.equal(invalidStateAdmission.state, null);

const productionWrapperRejectsTestKey = admitVoidSovereignEmergencyCertificateV1({
  state: initialState,
  certificate: pause,
  public_key_pem: publicPem,
  now_utc: "2026-08-24T07:11:00Z",
});
assert.equal(productionWrapperRejectsTestKey.ok, false);
assert.equal(productionWrapperRejectsTestKey.code, "SIGNER_FINGERPRINT_MISMATCH");

const keyRegistry = JSON.parse(
  readFileSync("fixtures/governance/void-sovereign-key-role-registry-v1.json", "utf8"),
);
const contractFixture = JSON.parse(
  readFileSync("fixtures/governance/void-alignment-layer-sovereign-emergency-control-v1.json", "utf8"),
);
const contractDoc = readFileSync(
  "docs/governance/void-alignment-layer-sovereign-emergency-control-v1.md",
  "utf8",
);

assert.equal(
  keyRegistry.roles.sovereign_primary_governance_attestation.public_key_der_sha256,
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
);
assert.equal(
  contractFixture.dependencies.sovereign_primary_public_key_der_sha256,
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
);
assert.equal(
  contractFixture.emergency_control.signer_public_key_der_sha256,
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
);
assert.equal(contractFixture.activation.runtime_import_active, false);
assert.equal(contractFixture.activation.live_mutation_gate_active, false);
assert.equal(contractFixture.activation.production_pause_signature_created, false);
assert.ok(contractDoc.includes("does not wire AL into live block/transaction/state mutation"));
assert.ok(contractDoc.includes("Automatic resume is forbidden"));

console.log(MARKER);
console.log(`production_primary_der_sha256=${VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1}`);
console.log("al_pre_accept_allow=true");
console.log("al_missing_duplicate_unknown_fail_closed=true");
console.log("al_quarantine_tripwire=true");
console.log("al_policy_failure_safe_mode=true");
console.log("al_post_apply_failure_safe_mode=true");
console.log("safe_mode_mutation_paths_disabled=true");
console.log("ephemeral_ed25519_signature_verification=true");
console.log("pause_replay_resume_state_machine=true");
console.log("invalid_persisted_state_returns_running_state=false");
console.log("production_non_sovereign_test_key_rejected=true");
console.log("sovereign_private_key_read=false");
console.log("runtime_integration_active=false");
console.log("chain_mutation=false");
console.log("service_mutation=false");
console.log("funds_authority_change=false");
