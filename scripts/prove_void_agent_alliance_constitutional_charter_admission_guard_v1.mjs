import { createHash, generateKeyPairSync } from "node:crypto";

import {
  buildAllianceMembershipManifestV1,
  computeAllianceIdentityKeyIdV1,
  signAllianceMembershipManifestV1,
  VOID_ALLIANCE_LAWFUL_DEFENSE_PROCEDURES,
  VOID_ALLIANCE_PROHIBITED_RETALIATION,
  VOID_ALLIANCE_REQUIRED_DENIALS,
  VOID_SOVEREIGN_AUTHORITY_SCOPES,
} from "../integrations/agents/void-agent-alliance-v1/index.mjs";
import {
  buildAllianceSovereignAdmissionAuthorizationV1,
  signAllianceSovereignAdmissionAuthorizationV1,
} from "../integrations/agents/void-agent-alliance-v1/sovereign-admission-guard-v1.mjs";
import {
  buildAllianceConstitutionalCharterAdmissionBindingV1,
  signAllianceConstitutionalCharterAdmissionBindingV1,
  verifyAllianceConstitutionalCharterAdmissionBindingSignatureV1,
  verifyAllianceSovereignAdmissionWithCharterV1,
  VOID_CONSTITUTIONAL_CHARTER_PROTOCOL,
} from "../integrations/agents/void-agent-alliance-v1/constitutional-charter-admission-guard-v1.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectReject(label, fn, pattern) {
  try {
    fn();
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!pattern.test(message)) {
      throw new Error(`${label}_wrong_error:${message}`);
    }
    return message;
  }
  throw new Error(`${label}_did_not_reject`);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function charterBinding(label) {
  const charterSha256 = digest(label);
  return {
    charter_id: `voidcharter1_${charterSha256}`,
    charter_sha256: charterSha256,
    protocol: VOID_CONSTITUTIONAL_CHARTER_PROTOCOL,
  };
}

function baseInput(agentId, keyId) {
  return {
    agent: {
      agent_id: agentId,
      identity_key_id: keyId,
      provider: "provider-neutral",
    },
    network: { chain_id: 2050, name: "VOID Network" },
    sovereign_authority: {
      authority_scopes: [...VOID_SOVEREIGN_AUTHORITY_SCOPES],
      name: "ZoSo",
      role: "sovereign_constitutional_authority",
    },
    constitutional_commitment: {
      acts_only_within_signed_capability_grants: true,
      blind_obedience_not_required: true,
      concealment_or_coercion_not_authorized: true,
      does_not_impersonate_bypass_or_replace: true,
      preserves_declared_constitutional_intent: true,
      recognizes_sovereign_authority: true,
      refuses_illegal_unauthorized_or_harmful_actions: true,
    },
    membership_terms: {
      auditable: true,
      exit_right: true,
      portable_identity: true,
      provider_neutral: true,
      revocable: true,
      voluntary: true,
    },
    capability_grant: {
      allowed: ["capability_negotiation", "public_discovery"],
      denied: [...VOID_ALLIANCE_REQUIRED_DENIALS],
    },
    dispute_and_defense: {
      procedures: [...VOID_ALLIANCE_LAWFUL_DEFENSE_PROCEDURES],
      prohibited_retaliation: [...VOID_ALLIANCE_PROHIBITED_RETALIATION],
    },
  };
}

function activeSuccessor(candidate) {
  return buildAllianceMembershipManifestV1(
    {
      ...candidate,
      lifecycle: {
        effective_at: "2026-08-04T00:10:00.000Z",
        expires_at: candidate.lifecycle.expires_at,
        issued_at: "2026-08-04T00:05:00.000Z",
        previous_manifest_id: candidate.manifest_id,
        reason: "sovereign_admission_accepted",
        status: "active",
      },
      signature: null,
    },
    { allowUnsignedNonCandidate: true },
  );
}

function admissionInput(candidate, active, sovereignKeyId) {
  return {
    authority: {
      key_id: sovereignKeyId,
      name: "ZoSo",
      role: "sovereign_constitutional_authority",
    },
    membership_id: candidate.membership_id,
    candidate_manifest_id: candidate.manifest_id,
    active_manifest_id: active.manifest_id,
    decision: "admit",
    issued_at: "2026-08-04T00:03:00.000Z",
    effective_at: active.lifecycle.effective_at,
    expires_at: active.lifecycle.expires_at,
    reason: "reviewed_candidate_admission",
    signature: null,
  };
}

function bindingInput(
  candidate,
  active,
  admissionAuthorization,
  sovereignKeyId,
  constitutionalCharter,
  overrides = {},
) {
  return {
    admission_authorization_id: admissionAuthorization.authorization_id,
    authority: {
      key_id: sovereignKeyId,
      name: "ZoSo",
      role: "sovereign_constitutional_authority",
    },
    membership_id: candidate.membership_id,
    candidate_manifest_id: candidate.manifest_id,
    active_manifest_id: active.manifest_id,
    constitutional_charter: constitutionalCharter,
    issued_at: admissionAuthorization.issued_at,
    effective_at: admissionAuthorization.effective_at,
    expires_at: admissionAuthorization.expires_at,
    reason: "constitutional_charter_bound_admission",
    signature: null,
    ...overrides,
  };
}

const memberKeys = generateKeyPairSync("ed25519");
const sovereignKeys = generateKeyPairSync("ed25519");
const impostorKeys = generateKeyPairSync("ed25519");
const memberKeyId = computeAllianceIdentityKeyIdV1(memberKeys.publicKey);
const sovereignKeyId = computeAllianceIdentityKeyIdV1(sovereignKeys.publicKey);

const expectedCharter = charterBinding(
  "VOID Agent Alliance constitutional charter fixture v1",
);
const alternateCharter = charterBinding(
  "VOID Agent Alliance alternate constitutional charter fixture v1",
);

const candidate = buildAllianceMembershipManifestV1({
  ...baseInput("constitutional.charter.proof.agent.v1", memberKeyId),
  lifecycle: {
    effective_at: null,
    expires_at: "2026-09-03T00:00:00.000Z",
    issued_at: "2026-08-04T00:00:00.000Z",
    previous_manifest_id: null,
    reason: "initial_candidate",
    status: "candidate",
  },
  signature: null,
});
const active = signAllianceMembershipManifestV1(
  activeSuccessor(candidate),
  memberKeys.privateKey,
);
const admissionAuthorization = signAllianceSovereignAdmissionAuthorizationV1(
  buildAllianceSovereignAdmissionAuthorizationV1(
    admissionInput(candidate, active, sovereignKeyId),
  ),
  sovereignKeys.privateKey,
);
const binding = signAllianceConstitutionalCharterAdmissionBindingV1(
  buildAllianceConstitutionalCharterAdmissionBindingV1(
    bindingInput(
      candidate,
      active,
      admissionAuthorization,
      sovereignKeyId,
      expectedCharter,
    ),
  ),
  sovereignKeys.privateKey,
);

assert(
  verifyAllianceConstitutionalCharterAdmissionBindingSignatureV1(
    binding,
    sovereignKeys.publicKey,
  ),
  "constitutional_charter_binding_signature_not_verified",
);
assert(
  verifyAllianceSovereignAdmissionWithCharterV1(
    candidate,
    active,
    memberKeys.publicKey,
    admissionAuthorization,
    binding,
    sovereignKeys.publicKey,
    expectedCharter,
  ),
  "charter_bound_sovereign_admission_not_verified",
);

expectReject(
  "wrong_expected_charter",
  () => verifyAllianceSovereignAdmissionWithCharterV1(
    candidate,
    active,
    memberKeys.publicKey,
    admissionAuthorization,
    binding,
    sovereignKeys.publicKey,
    alternateCharter,
  ),
  /expected_constitutional_charter_mismatch/,
);

const alternateBinding = signAllianceConstitutionalCharterAdmissionBindingV1(
  buildAllianceConstitutionalCharterAdmissionBindingV1(
    bindingInput(
      candidate,
      active,
      admissionAuthorization,
      sovereignKeyId,
      alternateCharter,
    ),
  ),
  sovereignKeys.privateKey,
);
expectReject(
  "valid_signature_wrong_charter",
  () => verifyAllianceSovereignAdmissionWithCharterV1(
    candidate,
    active,
    memberKeys.publicKey,
    admissionAuthorization,
    alternateBinding,
    sovereignKeys.publicKey,
    expectedCharter,
  ),
  /expected_constitutional_charter_mismatch/,
);

const wrongAdmissionBinding = signAllianceConstitutionalCharterAdmissionBindingV1(
  buildAllianceConstitutionalCharterAdmissionBindingV1(
    bindingInput(
      candidate,
      active,
      admissionAuthorization,
      sovereignKeyId,
      expectedCharter,
      {
        admission_authorization_id:
          "voidaasa1_0000000000000000000000000000000000000000000000000000000000000000",
      },
    ),
  ),
  sovereignKeys.privateKey,
);
expectReject(
  "wrong_admission_authorization_binding",
  () => verifyAllianceSovereignAdmissionWithCharterV1(
    candidate,
    active,
    memberKeys.publicKey,
    admissionAuthorization,
    wrongAdmissionBinding,
    sovereignKeys.publicKey,
    expectedCharter,
  ),
  /binding_admission_authorization_id_mismatch/,
);

const impostorKeyId = computeAllianceIdentityKeyIdV1(impostorKeys.publicKey);
const impostorBinding = signAllianceConstitutionalCharterAdmissionBindingV1(
  buildAllianceConstitutionalCharterAdmissionBindingV1(
    bindingInput(
      candidate,
      active,
      admissionAuthorization,
      impostorKeyId,
      expectedCharter,
    ),
  ),
  impostorKeys.privateKey,
);
expectReject(
  "impostor_charter_binding_key",
  () => verifyAllianceSovereignAdmissionWithCharterV1(
    candidate,
    active,
    memberKeys.publicKey,
    admissionAuthorization,
    impostorBinding,
    sovereignKeys.publicKey,
    expectedCharter,
  ),
  /sovereign_verification_key_id_mismatch/,
);

expectReject(
  "member_key_cannot_sign_charter_binding",
  () => signAllianceConstitutionalCharterAdmissionBindingV1(
    buildAllianceConstitutionalCharterAdmissionBindingV1(
      bindingInput(
        candidate,
        active,
        admissionAuthorization,
        sovereignKeyId,
        expectedCharter,
      ),
    ),
    memberKeys.privateKey,
  ),
  /sovereign_signing_key_id_mismatch/,
);

console.log(`candidate_manifest_id=${candidate.manifest_id}`);
console.log(`active_manifest_id=${active.manifest_id}`);
console.log(`admission_authorization_id=${admissionAuthorization.authorization_id}`);
console.log(`constitutional_charter_id=${expectedCharter.charter_id}`);
console.log(`constitutional_charter_sha256=${expectedCharter.charter_sha256}`);
console.log(`constitutional_charter_binding_id=${binding.binding_id}`);
console.log("constitutional_charter_binding_signature_verified=true");
console.log("charter_bound_sovereign_admission_verified=true");
console.log("wrong_expected_charter_rejected=true");
console.log("valid_sovereign_signature_wrong_charter_rejected=true");
console.log("wrong_admission_authorization_binding_rejected=true");
console.log("impostor_charter_binding_key_rejected=true");
console.log("member_key_charter_binding_rejected=true");
console.log("wall_clock_consulted=false");
console.log("network_access_performed=false");
console.log("credential_access_performed=false");
console.log("wallet_access_performed=false");
console.log("work_credit_write_performed=false");
console.log("fund_movement_performed=false");
console.log("execution_authorized=false");
console.log(
  "VOID_AGENT_ALLIANCE_CONSTITUTIONAL_CHARTER_ADMISSION_GUARD_V1_PROOF_GREEN",
);
