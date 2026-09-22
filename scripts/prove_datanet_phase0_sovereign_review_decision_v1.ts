import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
} from "../src/security/void_sovereign_emergency_control_v1.js";
import {
  DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_MARKER_V1,
  DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNATURE_DOMAIN_V1,
  DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNER_ROLE_V1,
  canonicalDatanetPhase0SovereignReviewPayloadV1,
  hashDatanetPhase0SovereignReviewDecisionV1,
  initialDatanetPhase0SovereignReviewStateV1,
  admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1,
  admitDatanetPhase0SovereignReviewDecisionV1,
} from "./datanet_phase0_sovereign_review_decision_v1.js";
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

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-datanet-phase0-review-v1-"));
const packet = path.join(root, "packet");
fs.mkdirSync(packet);

const external = { marker: "external", v: 1 };
const source = { marker: "source", v: 1 };
const evidenceMap = { marker: "map", v: 1 };
const candidateId = "voiddcp1_" + "1".repeat(32);
const candidate = {
  marker: "VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1",
  version: 1,
  candidate: {
    candidate_id: candidateId,
    object_id_sha256: "2".repeat(64),
    content_sha256: "3".repeat(64),
    byte_length: 128,
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
  assembled_at_utc: "2026-09-21T23:40:00Z",
  object: {
    object_id_sha256: "2".repeat(64),
    content_sha256: "3".repeat(64),
    byte_length: 128,
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
const assemblyManifestSha = shaJson(manifest);
const candidateSha = shaJson(candidate);

function signedDecision(
  sequence: string,
  predecessor: string,
  decision: "HOLD" | "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION" | "REJECT",
  reason: string,
) {
  const body = {
    marker: DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_MARKER_V1,
    version: 1,
    chain_id: 2050,
    phase: 0,
    authority_mode: "PHASE0_OPERATOR_ROOTED",
    assembly_id: manifest.assembly_id,
    assembly_manifest_sha256: assemblyManifestSha,
    candidate_id: candidateId,
    promotion_candidate_sha256: candidateSha,
    sequence,
    previous_decision_sha256: predecessor,
    decision,
    reason_code: reason,
    review_evidence_sha256: sha256("review-evidence:" + sequence + ":" + decision),
    decided_at_utc: sequence === "0"
      ? "2026-09-21T23:45:00Z"
      : "2026-09-21T23:46:00Z",
    signer_role: DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNER_ROLE_V1,
    signer_public_key_der_sha256: fingerprint,
    signature_algorithm: "Ed25519",
    signature_domain: DATANET_PHASE0_SOVEREIGN_REVIEW_SIGNATURE_DOMAIN_V1,
    preparation_boundary: {
      separate_canonical_preparation_eligible:
        decision === "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION",
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
    canonicalDatanetPhase0SovereignReviewPayloadV1(body),
    privateKey,
  ).toString("base64");
  const withoutId = { ...body, signature_base64: signatureBase64 };
  return {
    ...withoutId,
    decision_id: "voiddpsr1_" + shaJson(withoutId),
  };
}

const initial = initialDatanetPhase0SovereignReviewStateV1(manifest.assembly_id);
const hold = signedDecision("0", initial.last_decision_sha256, "HOLD", "MORE_EVIDENCE_REQUIRED");
const held = admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
  state: initial,
  packet_dir: packet,
  decision: hold,
  public_key_pem: publicPem,
  expected_signer_der_sha256: fingerprint,
});
assert.equal(held.status, "HOLD");
assert.equal(held.terminal, false);
assert.equal(held.last_decided_at_utc, "2026-09-21T23:45:00Z");
assert.equal(held.separate_canonical_preparation_eligible, false);
assert.equal(held.chain2050_write_authorized, false);

const approve = signedDecision(
  "1",
  held.last_decision_sha256,
  "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION",
  "SOVEREIGN_REVIEW_ACCEPTED",
);
const approved = admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
  state: held,
  packet_dir: packet,
  decision: approve,
  public_key_pem: publicPem,
  expected_signer_der_sha256: fingerprint,
});
assert.equal(approved.status, "APPROVED_FOR_SEPARATE_CANONICAL_PREPARATION");
assert.equal(approved.terminal, true);
assert.equal(approved.separate_canonical_preparation_eligible, true);
assert.equal(approved.chain2050_write_authorized, false);
assert.equal(approved.automatic_promotion, false);

assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: approved,
    packet_dir: packet,
    decision: approve,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /terminal/,
);

assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: held,
    packet_dir: packet,
    decision: hold,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /sequence mismatch/,
);

const corruptStatusState = {
  ...held,
  status: "PENDING_REVIEW",
};
assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: corruptStatusState,
    packet_dir: packet,
    decision: approve,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /pending review state must not have a sequence/,
);

const corruptHashState = {
  ...held,
  last_decision_sha256: "0".repeat(64),
};
assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: corruptHashState,
    packet_dir: packet,
    decision: approve,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /decided review state must have a nonzero decision hash/,
);

const backwardsTime = clone(approve);
backwardsTime.decided_at_utc = "2026-09-21T23:44:00Z";
const backwardsBody = Object.fromEntries(
  Object.entries(backwardsTime).filter(
    ([key]) => key !== "signature_base64" && key !== "decision_id",
  ),
);
backwardsTime.signature_base64 = crypto.sign(
  null,
  canonicalDatanetPhase0SovereignReviewPayloadV1(backwardsBody),
  privateKey,
).toString("base64");
backwardsTime.decision_id = "voiddpsr1_" + shaJson(
  Object.fromEntries(
    Object.entries(backwardsTime).filter(([key]) => key !== "decision_id"),
  ),
);
assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: held,
    packet_dir: packet,
    decision: backwardsTime,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /time moved backwards/,
);

const predatesPacket = clone(hold);
predatesPacket.decided_at_utc = "2026-09-21T23:39:59Z";
const predatesBody = Object.fromEntries(
  Object.entries(predatesPacket).filter(
    ([key]) => key !== "signature_base64" && key !== "decision_id",
  ),
);
predatesPacket.signature_base64 = crypto.sign(
  null,
  canonicalDatanetPhase0SovereignReviewPayloadV1(predatesBody),
  privateKey,
).toString("base64");
predatesPacket.decision_id = "voiddpsr1_" + shaJson(
  Object.fromEntries(
    Object.entries(predatesPacket).filter(([key]) => key !== "decision_id"),
  ),
);
assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: initial,
    packet_dir: packet,
    decision: predatesPacket,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /cannot predate packet assembly/,
);

const zeroEvidence = clone(hold);
zeroEvidence.review_evidence_sha256 = "0".repeat(64);
const zeroEvidenceBody = Object.fromEntries(
  Object.entries(zeroEvidence).filter(
    ([key]) => key !== "signature_base64" && key !== "decision_id",
  ),
);
zeroEvidence.signature_base64 = crypto.sign(
  null,
  canonicalDatanetPhase0SovereignReviewPayloadV1(zeroEvidenceBody),
  privateKey,
).toString("base64");
zeroEvidence.decision_id = "voiddpsr1_" + shaJson(
  Object.fromEntries(
    Object.entries(zeroEvidence).filter(([key]) => key !== "decision_id"),
  ),
);
assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: initial,
    packet_dir: packet,
    decision: zeroEvidence,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /review evidence hash must be nonzero/,
);

const wrongPred = signedDecision(
  "1",
  "f".repeat(64),
  "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION",
  "SOVEREIGN_REVIEW_ACCEPTED",
);
assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: held,
    packet_dir: packet,
    decision: wrongPred,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /predecessor mismatch/,
);

const badSig = clone(approve);
const sig = Buffer.from(badSig.signature_base64, "base64");
sig[0] ^= 1;
badSig.signature_base64 = sig.toString("base64");
badSig.decision_id = "voiddpsr1_" + shaJson(
  Object.fromEntries(Object.entries(badSig).filter(([k]) => k !== "decision_id")),
);
assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: held,
    packet_dir: packet,
    decision: badSig,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /signature rejected/,
);

assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: held,
    packet_dir: packet,
    decision: approve,
    public_key_pem: publicPem,
    expected_signer_der_sha256: "e".repeat(64),
  }),
  /fingerprint field mismatch/,
);

const authorityEscalation = clone(approve);
authorityEscalation.preparation_boundary.chain2050_write_authorized = true;
const authBody = Object.fromEntries(
  Object.entries(authorityEscalation).filter(
    ([key]) => key !== "signature_base64" && key !== "decision_id",
  ),
);
authorityEscalation.signature_base64 = crypto.sign(
  null,
  canonicalDatanetPhase0SovereignReviewPayloadV1(authBody),
  privateKey,
).toString("base64");
authorityEscalation.decision_id = "voiddpsr1_" + shaJson(
  Object.fromEntries(
    Object.entries(authorityEscalation).filter(([key]) => key !== "decision_id"),
  ),
);
assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: held,
    packet_dir: packet,
    decision: authorityEscalation,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /chain2050_write_authorized must remain false/,
);

const candidatePath = path.join(packet, "promotion-candidate.json");
const candidateOriginal = fs.readFileSync(candidatePath, "utf8");
const tamperedCandidate = clone(candidate);
tamperedCandidate.candidate.byte_length = 129;
writeJson(candidatePath, tamperedCandidate);
assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
    state: held,
    packet_dir: packet,
    decision: approve,
    public_key_pem: publicPem,
    expected_signer_der_sha256: fingerprint,
  }),
  /promotion candidate hash mismatch/,
);
fs.writeFileSync(candidatePath, candidateOriginal);

const reject = signedDecision(
  "0",
  initial.last_decision_sha256,
  "REJECT",
  "SEMANTIC_TRUTH_NOT_ACCEPTED",
);
const rejected = admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
  state: initial,
  packet_dir: packet,
  decision: reject,
  public_key_pem: publicPem,
  expected_signer_der_sha256: fingerprint,
});
assert.equal(rejected.status, "REJECTED");
assert.equal(rejected.terminal, true);
assert.equal(rejected.separate_canonical_preparation_eligible, false);

assert.throws(
  () => admitDatanetPhase0SovereignReviewDecisionV1({
    state: initial,
    packet_dir: packet,
    decision: hold,
    public_key_pem: publicPem,
  }),
  /fingerprint field mismatch|SIGNER_FINGERPRINT_MISMATCH/,
);

const keyRegistry = JSON.parse(
  fs.readFileSync("fixtures/governance/void-sovereign-key-role-registry-v1.json", "utf8"),
);
assert.equal(
  keyRegistry.roles.sovereign_primary_governance_attestation.public_key_der_sha256,
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
);

console.log("VOID_DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_V1_PROOF_GREEN");
console.log("packet_integrity_reverified=true");
console.log("hold_then_approve_chain=true");
console.log("approval_terminal=true");
console.log("approval_unlocks_separate_preparation_only=true");
console.log("chain2050_write_authorized=false");
console.log("transaction_construction_authorized=false");
console.log("transaction_signing_authorized=false");
console.log("transaction_broadcast_authorized=false");
console.log("automatic_promotion=false");
console.log("replay_rejected=true");
console.log("corrupt_persisted_state_rejected=true");
console.log("decision_time_monotonic=true");
console.log("decision_cannot_predate_packet=true");
console.log("review_evidence_hash_nonzero=true");
console.log("wrong_predecessor_rejected=true");
console.log("bad_signature_rejected=true");
console.log("wrong_signer_fingerprint_rejected=true");
console.log("authority_escalation_rejected=true");
console.log("packet_tamper_rejected=true");
console.log("reject_terminal=true");
console.log("production_non_sovereign_test_key_rejected=true");
console.log("sovereign_private_key_read=false");

fs.rmSync(root, { recursive: true, force: true });
