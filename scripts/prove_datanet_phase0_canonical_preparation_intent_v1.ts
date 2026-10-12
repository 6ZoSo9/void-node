import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_MARKER_V1,
  DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNATURE_DOMAIN_V1,
  DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNER_ROLE_V1,
  canonicalDatanetPhase0SovereignReviewPayloadV1,
  initialDatanetPhase0SovereignReviewStateV1,
} from "./datanet_phase0_sovereign_review_decision_v1.js";
import {
  buildDatanetPhase0CanonicalPreparationIntentAgainstFingerprintV1,
  buildDatanetPhase0CanonicalPreparationIntentV1,
} from "./datanet_phase0_canonical_preparation_intent_v1.js";
import {
  datanetPromotionCanonicalJsonV1,
} from "./datanet_promotion_independent_attestation_set_v1.js";

function sha256(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function shaJson(value: unknown): string {
  return sha256(datanetPromotionCanonicalJsonV1(value));
}
function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function publicFingerprint(publicKey: crypto.KeyObject): string {
  const der = publicKey.export({ type: "spki", format: "der" });
  assert.ok(Buffer.isBuffer(der));
  return sha256(der);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-datanet-canonical-intent-v1-"));
const packet = path.join(root, "packet");
fs.mkdirSync(packet);

const external = { marker: "external", v: 1 };
const source = { marker: "source", v: 1 };
const evidenceMap = { marker: "map", v: 1 };
const candidateId = "voiddcp1_" + "1".repeat(32);
const objectIdSha256 = "2".repeat(64);
const contentSha256 = "3".repeat(64);
const byteLength = 128;
const candidate = {
  marker: "VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1",
  version: 1,
  candidate: {
    candidate_id: candidateId,
    object_id_sha256: objectIdSha256,
    content_sha256: contentSha256,
    byte_length: byteLength,
  },
  phase_context: {
    phase: 0,
    authority_mode: "PHASE0_OPERATOR_ROOTED",
    validator_admission_authority_active: false,
  },
  admission: {
    disposition: "PHASE0_OPERATOR_REVIEW_ONLY",
    canonical_write_authorized: false,
    automatic_promotion: false,
  },
  authority: {
    source_only: true,
    candidate_only: true,
    chain2050_write_authorized: false,
  },
};
writeJson(path.join(packet, "external-evidence.json"), external);
writeJson(path.join(packet, "source-bundle.json"), source);
writeJson(path.join(packet, "evidence-map.json"), evidenceMap);
writeJson(path.join(packet, "promotion-candidate.json"), candidate);

const manifestBody = {
  marker: "VOID_DATANET_PROMOTION_PACKET_ASSEMBLY_V1",
  version: 1,
  assembled_at_utc: "2026-09-22T00:10:00Z",
  object: {
    object_id_sha256: objectIdSha256,
    content_sha256: contentSha256,
    byte_length: byteLength,
  },
  input_commitments: {
    local_receipt_sha256: "4".repeat(64),
    publisher_provenance_sha256: "5".repeat(64),
    provider_trust_snapshot_sha256: "6".repeat(64),
    attestation_set_sha256: "7".repeat(64),
  },
  publisher: {
    publisher_provenance_id: "voiddppp1_" + "8".repeat(64),
    publisher_key_id: "ed25519:" + "9".repeat(64),
  },
  external_attestation: {
    attestation_set_id: "voiddpias1_" + "a".repeat(64),
    trust_snapshot_id: "voidapts1_" + "b".repeat(64),
    external_evidence_sha256: shaJson(external),
  },
  evidence: {
    source_bundle_sha256: shaJson(source),
    evidence_map_sha256: shaJson(evidenceMap),
    promotion_candidate_sha256: shaJson(candidate),
    candidate_id: candidateId,
  },
  phase_context: {
    phase: 0,
    authority_mode: "PHASE0_OPERATOR_ROOTED",
    validator_admission_authority_active: false,
  },
  admission: {
    disposition: "PHASE0_OPERATOR_REVIEW_ONLY",
    operator_review_required: true,
    canonical_write_authorized: false,
    automatic_promotion: false,
  },
  authority: {
    evidence_only: true,
    datanet_mutation_authorized: false,
    chain2050_write_authorized: false,
    validator_authority_granted: false,
    governance_mutation_authorized: false,
    signer_or_wallet_access: false,
    work_credit_award_authorized: false,
    runtime_service_action: false,
    funds_action: false,
  },
};
const manifest = {
  ...manifestBody,
  assembly_id: "voiddppa1_" + shaJson(manifestBody),
};
writeJson(path.join(packet, "assembly-manifest.json"), manifest);

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const publicPem = publicKey.export({ type: "spki", format: "pem" });
assert.equal(typeof publicPem, "string");
const fingerprint = publicFingerprint(publicKey);

const initial = initialDatanetPhase0SovereignReviewStateV1(manifest.assembly_id);
const approvalBody = {
  marker: DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_MARKER_V1,
  version: 1,
  chain_id: 2050,
  phase: 0,
  authority_mode: "PHASE0_OPERATOR_ROOTED",
  assembly_id: manifest.assembly_id,
  assembly_manifest_sha256: shaJson(manifest),
  candidate_id: candidateId,
  promotion_candidate_sha256: shaJson(candidate),
  sequence: "0",
  previous_decision_sha256: initial.last_decision_sha256,
  decision: "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION",
  reason_code: "SOVEREIGN_REVIEW_ACCEPTED",
  review_evidence_sha256: sha256("review-evidence"),
  decided_at_utc: "2026-09-22T00:11:00Z",
  signer_role: DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNER_ROLE_V1,
  signer_public_key_der_sha256: fingerprint,
  signature_algorithm: "Ed25519",
  signature_domain: DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNATURE_DOMAIN_V1,
  preparation_boundary: {
    separate_canonical_preparation_eligible: true,
    chain2050_write_authorized: false,
    transaction_construction_authorized: false,
    transaction_signing_authorized: false,
    transaction_broadcast_authorized: false,
    validator_authority_granted: false,
    governance_mutation_authorized: false,
    automatic_promotion: false,
    runtime_service_action: false,
    funds_action: false,
  },
};
const signatureBase64 = crypto.sign(
  null,
  canonicalDatanetPhase0SovereignReviewPayloadV1(approvalBody),
  privateKey,
).toString("base64");
const approvalWithoutId = {
  ...approvalBody,
  signature_base64: signatureBase64,
};
const approval = {
  ...approvalWithoutId,
  decision_id: "voiddpsr1_" + shaJson(approvalWithoutId),
};

const intent =
  buildDatanetPhase0CanonicalPreparationIntentAgainstFingerprintV1({
    packet_dir: packet,
    review_state_before: initial,
    approval_decision: approval,
    sovereign_public_key_pem: publicPem,
    expected_sovereign_der_sha256: fingerprint,
  });

assert.equal(intent.marker, "VOID_DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_V1");
assert.equal(intent.status, "PREPARATION_INTENT_ONLY");
assert.match(String(intent.preparation_intent_id), /^voiddcpi1_[0-9a-f]{64}$/);
assert.equal(intent.chain_id, 2050);
assert.equal(intent.phase, 0);
assert.equal(intent.authority_mode, "PHASE0_OPERATOR_ROOTED");
assert.deepEqual(intent.commitment, {
  object_id_sha256: objectIdSha256,
  content_sha256: contentSha256,
  byte_length: byteLength,
});
assert.equal(intent.target_contract_source.function_signature, "commit(bytes32,bytes32,uint64)");
assert.equal(intent.target_contract_source.registry_version, 1);
assert.equal(intent.target_contract_source.max_object_bytes, 268435456);
assert.match(intent.target_contract_source.source_sha256, /^[0-9a-f]{64}$/);
assert.equal(intent.deployment_binding.status, "UNBOUND_REQUIRED");
assert.equal(intent.deployment_binding.registry_address, null);
assert.equal(intent.deployment_binding.publisher_address, null);
assert.equal(intent.deployment_binding.predecessor_address, null);
assert.equal(intent.required_preflight.object_uncommitted_verified, false);
assert.equal(intent.required_preflight.fresh_read_only_is_committed_check_required, true);
assert.equal(intent.authority.transaction_construction_authorized, false);
assert.equal(intent.authority.calldata_construction_authorized, false);
assert.equal(intent.authority.transaction_signing_authorized, false);
assert.equal(intent.authority.transaction_broadcast_authorized, false);
assert.equal(intent.authority.chain2050_write_authorized, false);
assert.equal(intent.authority.automatic_promotion, false);
assert.equal(intent.next_gate, "REVIEWED_DEPLOYMENT_AND_LINEAGE_BINDING_REQUIRED");
assert.equal(Object.prototype.hasOwnProperty.call(intent, "calldata"), false);
assert.equal(Object.prototype.hasOwnProperty.call(intent, "to"), false);
assert.equal(Object.prototype.hasOwnProperty.call(intent, "registry_address"), false);

const hold = clone(approval);
hold.decision = "HOLD";
hold.reason_code = "MORE_EVIDENCE_REQUIRED";
hold.preparation_boundary.separate_canonical_preparation_eligible = false;
const holdBody = Object.fromEntries(
  Object.entries(hold).filter(([key]) => key !== "signature_base64" && key !== "decision_id"),
);
hold.signature_base64 = crypto.sign(
  null,
  canonicalDatanetPhase0SovereignReviewPayloadV1(holdBody),
  privateKey,
).toString("base64");
hold.decision_id = "voiddpsr1_" + shaJson(
  Object.fromEntries(Object.entries(hold).filter(([key]) => key !== "decision_id")),
);
assert.throws(
  () => buildDatanetPhase0CanonicalPreparationIntentAgainstFingerprintV1({
    packet_dir: packet,
    review_state_before: initial,
    approval_decision: hold,
    sovereign_public_key_pem: publicPem,
    expected_sovereign_der_sha256: fingerprint,
  }),
  /requires explicit approval/,
);

const reject = clone(approval);
reject.decision = "REJECT";
reject.reason_code = "SEMANTIC_TRUTH_NOT_ACCEPTED";
reject.preparation_boundary.separate_canonical_preparation_eligible = false;
const rejectBody = Object.fromEntries(
  Object.entries(reject).filter(([key]) => key !== "signature_base64" && key !== "decision_id"),
);
reject.signature_base64 = crypto.sign(
  null,
  canonicalDatanetPhase0SovereignReviewPayloadV1(rejectBody),
  privateKey,
).toString("base64");
reject.decision_id = "voiddpsr1_" + shaJson(
  Object.fromEntries(Object.entries(reject).filter(([key]) => key !== "decision_id")),
);
assert.throws(
  () => buildDatanetPhase0CanonicalPreparationIntentAgainstFingerprintV1({
    packet_dir: packet,
    review_state_before: initial,
    approval_decision: reject,
    sovereign_public_key_pem: publicPem,
    expected_sovereign_der_sha256: fingerprint,
  }),
  /requires explicit approval/,
);

const badSignature = clone(approval);
const badBytes = Buffer.from(badSignature.signature_base64, "base64");
badBytes[0] ^= 1;
badSignature.signature_base64 = badBytes.toString("base64");
badSignature.decision_id = "voiddpsr1_" + shaJson(
  Object.fromEntries(Object.entries(badSignature).filter(([key]) => key !== "decision_id")),
);
assert.throws(
  () => buildDatanetPhase0CanonicalPreparationIntentAgainstFingerprintV1({
    packet_dir: packet,
    review_state_before: initial,
    approval_decision: badSignature,
    sovereign_public_key_pem: publicPem,
    expected_sovereign_der_sha256: fingerprint,
  }),
  /signature rejected/,
);

const candidatePath = path.join(packet, "promotion-candidate.json");
const originalCandidate = fs.readFileSync(candidatePath, "utf8");
const tamperedCandidate = clone(candidate);
tamperedCandidate.candidate.byte_length = 129;
writeJson(candidatePath, tamperedCandidate);
assert.throws(
  () => buildDatanetPhase0CanonicalPreparationIntentAgainstFingerprintV1({
    packet_dir: packet,
    review_state_before: initial,
    approval_decision: approval,
    sovereign_public_key_pem: publicPem,
    expected_sovereign_der_sha256: fingerprint,
  }),
  /promotion candidate hash mismatch/,
);
fs.writeFileSync(candidatePath, originalCandidate);

assert.throws(
  () => buildDatanetPhase0CanonicalPreparationIntentV1({
    packet_dir: packet,
    review_state_before: initial,
    approval_decision: approval,
    sovereign_public_key_pem: publicPem,
  }),
  /fingerprint field mismatch|SIGNER_FINGERPRINT_MISMATCH/,
);

const contractSource = fs.readFileSync(
  "contracts/mainnet/DatanetContentCommitmentRegistryV1.sol",
  "utf8",
);
assert.ok(contractSource.includes("if (isCommitted(objectIdSha256))"));
assert.ok(contractSource.includes("if (msg.sender != publisher)"));
assert.ok(contractSource.includes("uint64 internal constant _MAX_OBJECT_BYTES = 268_435_456;"));

console.log("VOID_DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_V1_PROOF_GREEN");
console.log("explicit_signed_approval_required=true");
console.log("hold_cannot_prepare=true");
console.log("reject_cannot_prepare=true");
console.log("bad_signature_cannot_prepare=true");
console.log("packet_tamper_cannot_prepare=true");
console.log("production_non_sovereign_test_key_rejected=true");
console.log("commitment_tuple_bound=true");
console.log("reviewed_contract_source_bound=true");
console.log("deployment_binding_status=UNBOUND_REQUIRED");
console.log("registry_address_selected=false");
console.log("publisher_address_selected=false");
console.log("predecessor_address_selected=false");
console.log("fresh_is_committed_preflight_required=true");
console.log("calldata_constructed=false");
console.log("transaction_construction_authorized=false");
console.log("transaction_signing_authorized=false");
console.log("transaction_broadcast_authorized=false");
console.log("chain2050_write_authorized=false");
console.log("automatic_promotion=false");

fs.rmSync(root, { recursive: true, force: true });
