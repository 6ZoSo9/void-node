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

function baseInput(keyId) {
  return {
    agent: {
      agent_id: "temporal.guard.proof.agent.v1",
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

function successor(previous, status, issuedAt, effectiveAt, expiresAt, reason) {
  return buildAllianceMembershipManifestV1(
    {
      ...previous,
      lifecycle: {
        effective_at: effectiveAt,
        expires_at: expiresAt,
        issued_at: issuedAt,
        previous_manifest_id: previous.manifest_id,
        reason,
        status,
      },
      signature: null,
    },
    { allowUnsignedNonCandidate: true },
  );
}

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const common = baseInput(computeAllianceIdentityKeyIdV1(publicKey));

const candidate = buildAllianceMembershipManifestV1({
  ...common,
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
  successor(
    candidate,
    "active",
    "2026-08-04T00:01:00.000Z",
    "2026-08-04T00:10:00.000Z",
    candidate.lifecycle.expires_at,
    "member_activation_proof",
  ),
  privateKey,
);

assert(
  verifyAllianceMembershipTransitionTemporalGuardV1(candidate, active, publicKey),
  "candidate_to_active_temporal_guard_failed",
);

const regressedEffective = signAllianceMembershipManifestV1(
  successor(
    active,
    "suspended",
    "2026-08-04T00:05:00.000Z",
    "2026-08-04T00:06:00.000Z",
    active.lifecycle.expires_at,
    "retroactive_suspension_attempt",
  ),
  privateKey,
);

assert(
  verifyAllianceMembershipTransitionV1(active, regressedEffective, publicKey),
  "core_transition_should_accept_structurally_valid_regressed_effective_fixture",
);
expectReject(
  "regressed_effective_time",
  () => verifyAllianceMembershipTransitionTemporalGuardV1(
    active,
    regressedEffective,
    publicKey,
  ),
  /transition_issued_before_previous_effective_time|transition_effective_time_not_strictly_after_previous_state/,
);

const extendedExpiry = signAllianceMembershipManifestV1(
  successor(
    active,
    "suspended",
    "2026-08-04T00:11:00.000Z",
    "2026-08-04T00:11:00.000Z",
    "2026-10-03T00:00:00.000Z",
    "expiry_extension_attempt",
  ),
  privateKey,
);

assert(
  verifyAllianceMembershipTransitionV1(active, extendedExpiry, publicKey),
  "core_transition_should_accept_structurally_valid_extended_expiry_fixture",
);
expectReject(
  "expiry_extension",
  () => verifyAllianceMembershipTransitionTemporalGuardV1(
    active,
    extendedExpiry,
    publicKey,
  ),
  /transition_expires_at_extension_rejected/,
);

const shortenedExpiry = signAllianceMembershipManifestV1(
  successor(
    active,
    "quarantined",
    "2026-08-04T00:11:00.000Z",
    "2026-08-04T00:11:00.000Z",
    "2026-08-20T00:00:00.000Z",
    "defensive_quarantine_with_shortened_expiry",
  ),
  privateKey,
);

assert(
  verifyAllianceMembershipTransitionTemporalGuardV1(
    active,
    shortenedExpiry,
    publicKey,
  ),
  "shortened_expiry_transition_rejected",
);

console.log(`candidate_manifest_id=${candidate.manifest_id}`);
console.log(`active_manifest_id=${active.manifest_id}`);
console.log(`shortened_expiry_manifest_id=${shortenedExpiry.manifest_id}`);
console.log("effective_time_regression_rejected=true");
console.log("expiry_extension_rejected=true");
console.log("shortened_expiry_allowed=true");
console.log("wall_clock_consulted=false");
console.log("network_access_performed=false");
console.log("credential_access_performed=false");
console.log("wallet_access_performed=false");
console.log("work_credit_write_performed=false");
console.log("fund_movement_performed=false");
console.log("execution_authorized=false");
console.log("VOID_AGENT_ALLIANCE_LIFECYCLE_TEMPORAL_GUARD_V1_PROOF_GREEN");
