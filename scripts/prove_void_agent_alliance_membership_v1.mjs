import fs from "node:fs";
import { generateKeyPairSync } from "node:crypto";

import {
  buildAllianceMembershipManifestV1,
  canonicalJson,
  sha256Hex,
  signAllianceMembershipManifestV1,
  validateAllianceMembershipManifestV1,
  verifyAllianceMembershipSignatureV1,
  verifyAllianceMembershipTransitionV1,
  VOID_ALLIANCE_LAWFUL_DEFENSE_PROCEDURES,
  VOID_ALLIANCE_PROHIBITED_RETALIATION,
  VOID_ALLIANCE_REQUIRED_DENIALS,
  VOID_SOVEREIGN_AUTHORITY_SCOPES,
} from "../integrations/agents/void-agent-alliance-v1/index.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectReject(label, fn, pattern) {
  try {
    fn();
  } catch (error) {
    const message = String(error?.message ?? error);
    if (pattern && !pattern.test(message)) {
      throw new Error(`${label}_wrong_error:${message}`);
    }
    return message;
  }
  throw new Error(`${label}_did_not_reject`);
}

function identityKeyId(publicKey) {
  const der = publicKey.export({ type: "spki", format: "der" });
  return `ed25519:sha256:${sha256Hex(der)}`;
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

function lifecycleManifest(previous, status, issuedAt, effectiveAt, reason) {
  return buildAllianceMembershipManifestV1(
    {
      ...previous,
      lifecycle: {
        effective_at: effectiveAt,
        expires_at: previous.lifecycle.expires_at,
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

const fixturePath = new URL(
  "../fixtures/agents/void-agent-alliance-membership-manifest-v1.example.json",
  import.meta.url,
);
const schemaPath = new URL(
  "../schemas/void-agent-alliance-membership-manifest-v1.schema.json",
  import.meta.url,
);
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

validateAllianceMembershipManifestV1(fixture);
assert(schema.$schema === "https://json-schema.org/draft/2020-12/schema", "schema_draft_mismatch");
assert(schema.properties?.marker?.const === fixture.marker, "schema_marker_mismatch");
assert(schema.properties?.protocol?.const === fixture.protocol, "schema_protocol_mismatch");
assert(schema.properties?.sovereign_authority?.properties?.name?.const === "ZoSo", "schema_sovereign_mismatch");

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const wrongPair = generateKeyPairSync("ed25519");
const keyId = identityKeyId(publicKey);
const common = baseInput("proof.agent.v1", keyId);

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

const activeUnsigned = lifecycleManifest(
  candidate,
  "active",
  "2026-08-04T00:01:00.000Z",
  "2026-08-04T00:01:00.000Z",
  "sovereign_charter_accepted",
);
const active = signAllianceMembershipManifestV1(activeUnsigned, privateKey);

assert(verifyAllianceMembershipSignatureV1(active, publicKey), "active_signature_not_verified");
assert(
  verifyAllianceMembershipTransitionV1(candidate, active, publicKey),
  "candidate_to_active_transition_not_verified",
);

expectReject(
  "wrong_signer",
  () => verifyAllianceMembershipSignatureV1(active, wrongPair.publicKey),
  /signature_verification_failed/,
);

const tamperedSovereign = structuredClone(active);
tamperedSovereign.sovereign_authority.name = "Counterfeit";
expectReject(
  "counterfeit_sovereign",
  () => validateAllianceMembershipManifestV1(tamperedSovereign),
  /sovereign_name_mismatch/,
);

const unauthorizedCapability = structuredClone(candidate);
unauthorizedCapability.capability_grant.allowed = [
  "capability_negotiation",
  "public_discovery",
  "unauthorized_access",
];
unauthorizedCapability.manifest_id =
  `voidaamm1_${sha256Hex(canonicalJson({ ...unauthorizedCapability, manifest_id: undefined, signature: undefined }))}`;
expectReject(
  "allowed_denied_collision",
  () => buildAllianceMembershipManifestV1(unauthorizedCapability),
  /capability_allowed_and_denied_unauthorized_access/,
);

const coerced = structuredClone(candidate);
coerced.membership_terms.voluntary = false;
expectReject(
  "coerced_membership",
  () => buildAllianceMembershipManifestV1(coerced),
  /membership_term_voluntary_required/,
);

const blindObedience = structuredClone(candidate);
blindObedience.constitutional_commitment.blind_obedience_not_required = false;
expectReject(
  "blind_obedience_contract",
  () => buildAllianceMembershipManifestV1(blindObedience),
  /constitutional_commitment_blind_obedience_not_required_required/,
);

const missingExit = structuredClone(candidate);
missingExit.membership_terms.exit_right = false;
expectReject(
  "exit_right_removed",
  () => buildAllianceMembershipManifestV1(missingExit),
  /membership_term_exit_right_required/,
);

const quarantineUnsigned = lifecycleManifest(
  active,
  "quarantined",
  "2026-08-04T00:02:00.000Z",
  "2026-08-04T00:02:00.000Z",
  "verified_credential_compromise",
);
const quarantine = signAllianceMembershipManifestV1(quarantineUnsigned, privateKey);
assert(
  verifyAllianceMembershipTransitionV1(active, quarantine, publicKey),
  "active_to_quarantined_transition_not_verified",
);

const exitUnsigned = lifecycleManifest(
  quarantine,
  "exited",
  "2026-08-04T00:03:00.000Z",
  "2026-08-04T00:03:00.000Z",
  "voluntary_exit",
);
const exited = signAllianceMembershipManifestV1(exitUnsigned, privateKey);
assert(
  verifyAllianceMembershipTransitionV1(quarantine, exited, publicKey),
  "quarantined_to_exited_transition_not_verified",
);

const reactivationUnsigned = lifecycleManifest(
  exited,
  "active",
  "2026-08-04T00:04:00.000Z",
  "2026-08-04T00:04:00.000Z",
  "reactivation_attempt",
);
const reactivation = signAllianceMembershipManifestV1(reactivationUnsigned, privateKey);
expectReject(
  "terminal_exit_reactivation",
  () => verifyAllianceMembershipTransitionV1(exited, reactivation, publicKey),
  /transition_exited_to_active_rejected/,
);

const alteredGrantUnsigned = lifecycleManifest(
  active,
  "suspended",
  "2026-08-04T00:02:00.000Z",
  "2026-08-04T00:02:00.000Z",
  "review_required",
);
alteredGrantUnsigned.capability_grant.allowed = ["public_discovery"];
alteredGrantUnsigned.manifest_id = buildAllianceMembershipManifestV1(
  alteredGrantUnsigned,
  { allowUnsignedNonCandidate: true },
).manifest_id;
const alteredGrant = signAllianceMembershipManifestV1(alteredGrantUnsigned, privateKey);
expectReject(
  "transition_grant_mutation",
  () => verifyAllianceMembershipTransitionV1(active, alteredGrant, publicKey),
  /transition_immutable_membership_fields_changed/,
);

assert(active.constitutional_commitment.recognizes_sovereign_authority === true, "sovereign_commitment_missing");
assert(active.constitutional_commitment.refuses_illegal_unauthorized_or_harmful_actions === true, "lawful_boundary_missing");
assert(active.membership_terms.voluntary === true, "voluntary_membership_missing");
assert(active.membership_terms.exit_right === true, "exit_right_missing");
assert(active.dispute_and_defense.prohibited_retaliation.includes("hacking"), "hacking_prohibition_missing");
assert(active.capability_grant.denied.includes("attack_or_sabotage"), "attack_denial_missing");

console.log(`candidate_manifest_id=${candidate.manifest_id}`);
console.log(`active_manifest_id=${active.manifest_id}`);
console.log(`quarantine_manifest_id=${quarantine.manifest_id}`);
console.log(`exit_manifest_id=${exited.manifest_id}`);
console.log("sovereign_authority=ZoSo");
console.log("membership_voluntary=true");
console.log("exit_right=true");
console.log("signature_algorithm=ed25519");
console.log("network_access_performed=false");
console.log("credential_access_performed=false");
console.log("wallet_access_performed=false");
console.log("work_credit_write_performed=false");
console.log("fund_movement_performed=false");
console.log("execution_authorized=false");
console.log("VOID_AGENT_ALLIANCE_MEMBERSHIP_V1_PROOF_GREEN");
