import { generateKeyPairSync } from "node:crypto";

import {
  buildAllianceMembershipManifestV1,
  computeAllianceIdentityKeyIdV1,
  signAllianceMembershipManifestV1,
  verifyAllianceMembershipTransitionV1,
  VOID_ALLIANCE_LAWFUL_DEFENSE_PROCEDURES,
  VOID_ALLIANCE_PROHIBITED_RETALIATION,
  VOID_ALLIANCE_REQUIRED_DENIALS,
  VOID_SOVEREIGN_AUTHORITY_SCOPES,
} from "../integrations/agents/void-agent-alliance-v1/index.mjs";
import {
  verifyAllianceMembershipTransitionTemporalGuardV1,
} from "../integrations/agents/void-agent-alliance-v1/lifecycle-temporal-guard-v1.mjs";
import {
  buildAllianceSovereignAdmissionAuthorizationV1,
  signAllianceSovereignAdmissionAuthorizationV1,
  verifyAllianceSovereignAdmissionAuthorizationSignatureV1,
  verifyAllianceSovereignAdmissionV1,
} from "../integrations/agents/void-agent-alliance-v1/sovereign-admission-guard-v1.mjs";

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

function authorizationInput(candidate, active, sovereignKeyId, overrides = {}) {
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
    ...overrides,
  };
}

const memberKeys = generateKeyPairSync("ed25519");
const sovereignKeys = generateKeyPairSync("ed25519");
const impostorKeys = generateKeyPairSync("ed25519");
const memberKeyId = computeAllianceIdentityKeyIdV1(memberKeys.publicKey);
const sovereignKeyId = computeAllianceIdentityKeyIdV1(sovereignKeys.publicKey);

const candidate = buildAllianceMembershipManifestV1({
  ...baseInput("sovereign.admission.proof.agent.v1", memberKeyId),
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

assert(
  verifyAllianceMembershipTransitionV1(candidate, active, memberKeys.publicKey),
  "member_signed_continuity_should_verify",
);
expectReject(
  "registry_self_activation",
  () => verifyAllianceMembershipTransitionTemporalGuardV1(
    candidate,
    active,
    memberKeys.publicKey,
  ),
  /candidate_activation_requires_sovereign_admission_guard/,
);

const unsignedAuthorization = buildAllianceSovereignAdmissionAuthorizationV1(
  authorizationInput(candidate, active, sovereignKeyId),
);
const authorization = signAllianceSovereignAdmissionAuthorizationV1(
  unsignedAuthorization,
  sovereignKeys.privateKey,
);
assert(
  verifyAllianceSovereignAdmissionAuthorizationSignatureV1(
    authorization,
    sovereignKeys.publicKey,
  ),
  "sovereign_authorization_signature_not_verified",
);
assert(
  verifyAllianceSovereignAdmissionV1(
    candidate,
    active,
    memberKeys.publicKey,
    authorization,
    sovereignKeys.publicKey,
  ),
  "two_signature_admission_not_verified",
);

expectReject(
  "wrong_sovereign_verification_key",
  () => verifyAllianceSovereignAdmissionV1(
    candidate,
    active,
    memberKeys.publicKey,
    authorization,
    impostorKeys.publicKey,
  ),
  /sovereign_verification_key_id_mismatch/,
);

const impostorAuthorization = signAllianceSovereignAdmissionAuthorizationV1(
  buildAllianceSovereignAdmissionAuthorizationV1(
    authorizationInput(
      candidate,
      active,
      computeAllianceIdentityKeyIdV1(impostorKeys.publicKey),
    ),
  ),
  impostorKeys.privateKey,
);
expectReject(
  "impostor_authority_key",
  () => verifyAllianceSovereignAdmissionV1(
    candidate,
    active,
    memberKeys.publicKey,
    impostorAuthorization,
    sovereignKeys.publicKey,
  ),
  /sovereign_verification_key_id_mismatch/,
);

const wrongCandidate = structuredClone(authorization);
wrongCandidate.candidate_manifest_id = active.manifest_id;
expectReject(
  "candidate_binding_tamper",
  () => verifyAllianceSovereignAdmissionV1(
    candidate,
    active,
    memberKeys.publicKey,
    wrongCandidate,
    sovereignKeys.publicKey,
  ),
  /authorization_id_derivation_mismatch/,
);

const laterEffectiveUnsigned = buildAllianceSovereignAdmissionAuthorizationV1(
  authorizationInput(candidate, active, sovereignKeyId, {
    effective_at: "2026-08-04T00:11:00.000Z",
  }),
);
const laterEffective = signAllianceSovereignAdmissionAuthorizationV1(
  laterEffectiveUnsigned,
  sovereignKeys.privateKey,
);
expectReject(
  "effective_time_mismatch",
  () => verifyAllianceSovereignAdmissionV1(
    candidate,
    active,
    memberKeys.publicKey,
    laterEffective,
    sovereignKeys.publicKey,
  ),
  /authorization_effective_at_mismatch/,
);

const outlivingUnsigned = buildAllianceSovereignAdmissionAuthorizationV1(
  authorizationInput(candidate, active, sovereignKeyId, {
    expires_at: "2026-10-03T00:00:00.000Z",
  }),
);
const outliving = signAllianceSovereignAdmissionAuthorizationV1(
  outlivingUnsigned,
  sovereignKeys.privateKey,
);
expectReject(
  "authorization_outlives_membership",
  () => verifyAllianceSovereignAdmissionV1(
    candidate,
    active,
    memberKeys.publicKey,
    outliving,
    sovereignKeys.publicKey,
  ),
  /authorization_outlives_active_membership/,
);

expectReject(
  "member_key_cannot_sign_sovereign_authorization",
  () => signAllianceSovereignAdmissionAuthorizationV1(
    unsignedAuthorization,
    memberKeys.privateKey,
  ),
  /sovereign_signing_key_id_mismatch/,
);

console.log(`candidate_manifest_id=${candidate.manifest_id}`);
console.log(`active_manifest_id=${active.manifest_id}`);
console.log(`authorization_id=${authorization.authorization_id}`);
console.log("member_active_manifest_signature_verified=true");
console.log("sovereign_admission_authorization_signature_verified=true");
console.log("candidate_self_activation_rejected_by_registry_guard=true");
console.log("two_signature_admission_verified=true");
console.log("wrong_sovereign_key_rejected=true");
console.log("authorization_binding_tamper_rejected=true");
console.log("authorization_effective_time_bound=true");
console.log("authorization_expiry_bounded=true");
console.log("wall_clock_consulted=false");
console.log("network_access_performed=false");
console.log("credential_access_performed=false");
console.log("wallet_access_performed=false");
console.log("work_credit_write_performed=false");
console.log("fund_movement_performed=false");
console.log("execution_authorized=false");
console.log("VOID_AGENT_ALLIANCE_SOVEREIGN_ADMISSION_GUARD_V1_PROOF_GREEN");
