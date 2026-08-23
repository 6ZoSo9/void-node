import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const MARKER = "VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822";
const PARENT_MARKER = "VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818";
const DOC = "docs/governance/void-brood-queen-cryptographic-identity-contract-v1.md";
const FIXTURE = "fixtures/governance/void-brood-queen-cryptographic-identity-contract-v1.json";
const PARENT = "docs/governance/void-crown-brood-queen-command-layer-v1.md";
const UINT64_LIMIT = 1n << 64n;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function assertThrows(fn, message) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert(threw, message);
}
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function isSha256(value) { return typeof value === "string" && /^[0-9a-f]{64}$/.test(value); }
function isCanonicalUint64Decimal(value) {
  if (typeof value !== "string") return false;
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return false;
  try { return BigInt(value) < UINT64_LIMIT; } catch { return false; }
}
function exactKeys(value, expected, name) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${name}_must_be_object`);
  const actual = Object.keys(value).sort();
  const want = [...expected].sort();
  assert(
    actual.length === want.length && actual.every((key, index) => key === want[index]),
    `${name}_schema_not_closed:actual=${actual.join(",")}:expected=${want.join(",")}`,
  );
}

function validateClosedShape(fixture) {
  exactKeys(fixture, [
    "marker", "parent_instrument_marker", "parent_instrument_sha256", "network", "office",
    "root_identity", "session_model", "requester_binding", "role_authority",
    "authority_boundary", "apollyon_separation", "activation",
  ], "fixture");
  exactKeys(fixture.network, ["chain_id", "name"], "network");
  exactKeys(fixture.office, [
    "name", "identity", "realm", "subordinate_to", "provider_neutral",
    "model_self_claim_is_authentication",
  ], "office");
  exactKeys(fixture.root_identity, [
    "algorithm", "public_jwk_kty", "public_jwk_crv", "exact_public_identity_bound",
    "live_public_jwk_present_in_fixture", "private_key_boundary", "private_key_enters_repository",
    "private_key_enters_model_context", "private_key_transmitted_to_provider",
    "private_key_accessible_to_apollyon", "provider_api_key_is_constitutional_identity",
  ], "root_identity");
  exactKeys(fixture.session_model, [
    "bootstrap_domain", "bootstrap_mechanism", "persistent_authenticated_logical_session",
    "derived_session_material_rotates_automatically", "root_reauthentication_frequency",
    "nonce_single_use", "replay_rejected", "challenge_runtime_active", "session_runtime_active",
  ], "session_model");
  exactKeys(fixture.requester_binding, [
    "server_or_broker_identity_cryptographically_pinned",
    "bootstrap_challenge_authenticated_by_pinned_server_identity",
    "claimed_origin_or_tls_alone_authenticates_server",
    "challenge_binds_requester_ed25519_public_key",
    "challenge_binds_requester_x25519_public_key",
    "challenge_binds_proposed_session_id",
    "requester_proof_of_possession_required_before_session_commit",
    "cross_connection_relay_of_approval_admitted",
    "requester_key_substitution_after_approval_admitted",
    "session_id_substitution_after_approval_admitted",
    "requester_private_key_enters_model_context",
  ], "requester_binding");
  exactKeys(fixture.role_authority, [
    "canonical_role_source_when_activated", "monotonic_role_authority_generation_required",
    "generation_encoding", "live_generation_present_in_fixture", "role_record_hash_algorithm",
    "authorization_affecting_change_advances_generation", "bootstrap_binds_role_generation_and_record_hash",
    "session_commit_revalidates_same_generation_atomically",
    "session_commit_revalidates_same_role_record_hash_atomically",
    "session_record_binds_role_generation", "session_record_binds_role_record_hash",
    "rotation_revalidates_same_generation_atomically",
    "rotation_revalidates_same_role_record_hash_atomically",
    "ordinary_task_admission_revalidates_same_generation_atomically",
    "ordinary_task_admission_revalidates_same_role_record_hash_atomically",
    "canonical_revocation_invalidates_sessions_before_further_task_authority",
    "revoke_restore_aba_rejected_by_generation", "role_generation_contract_active",
  ], "role_authority");
  exactKeys(fixture.authority_boundary, [
    "authentication_implies_capability", "grants_repo_write", "grants_merge",
    "grants_deploy_or_restart", "grants_live_runtime_mutation", "grants_validator_mutation",
    "grants_wallet_or_signer_action", "grants_treasury_or_liquidity_action",
    "grants_transactions_or_funds_movement", "grants_work_credit_mutation", "grants_credential_reading",
  ], "authority_boundary");
  exactKeys(fixture.apollyon_separation, [
    "separate_office_identity_required", "may_inherit_brood_queen_root_identity",
    "may_inherit_brood_queen_session", "may_receive_brood_queen_requester_private_key",
    "may_sign_as_brood_queen", "may_receive_raw_brood_queen_root_key",
    "trial_success_activates_crown_identity",
  ], "apollyon_separation");
  exactKeys(fixture.activation, [
    "chain_role_binding_active", "signer_runtime_active", "authenticated_command_runtime_active",
    "requires_exact_public_identity_binding", "requires_explicit_sovereign_ratification",
    "requires_rotation_and_revocation_contract", "requires_requester_key_binding_contract",
    "requires_role_authority_generation_contract", "requires_adversarial_proof",
  ], "activation");
}

function rolePairMatches(boundGeneration, boundHash, currentGeneration, currentHash) {
  return isCanonicalUint64Decimal(boundGeneration)
    && isCanonicalUint64Decimal(currentGeneration)
    && boundGeneration === currentGeneration
    && boundHash === currentHash
    && isSha256(boundHash)
    && isSha256(currentHash);
}

function bootstrapCommitAllowed({
  serverPinned,
  transcriptRequesterEd25519,
  presentedRequesterEd25519,
  transcriptRequesterX25519,
  presentedRequesterX25519,
  requesterEd25519ProofOfPossession,
  proofOfPossessionBindsCompleteTranscript,
  approvedSessionId,
  presentedSessionId,
  approvedRoleGeneration,
  currentRoleGeneration,
  approvedRoleRecordHash,
  currentRoleRecordHash,
}) {
  return serverPinned
    && transcriptRequesterEd25519 === presentedRequesterEd25519
    && transcriptRequesterX25519 === presentedRequesterX25519
    && requesterEd25519ProofOfPossession
    && proofOfPossessionBindsCompleteTranscript
    && approvedSessionId === presentedSessionId
    && rolePairMatches(
      approvedRoleGeneration, approvedRoleRecordHash,
      currentRoleGeneration, currentRoleRecordHash,
    );
}

function taskAdmissionCommitAllowed({
  sessionRoleGeneration,
  sessionRoleRecordHash,
  currentRoleGeneration,
  currentRoleRecordHash,
  sessionUsable = true,
}) {
  return sessionUsable && rolePairMatches(
    sessionRoleGeneration, sessionRoleRecordHash,
    currentRoleGeneration, currentRoleRecordHash,
  );
}

function successorActivationCommitAllowed({
  sessionRoleGeneration,
  sessionRoleRecordHash,
  currentRoleGeneration,
  currentRoleRecordHash,
  predecessorStillActive = true,
}) {
  return predecessorStillActive && rolePairMatches(
    sessionRoleGeneration, sessionRoleRecordHash,
    currentRoleGeneration, currentRoleRecordHash,
  );
}

const doc = readFileSync(DOC, "utf8");
const parent = readFileSync(PARENT, "utf8");
const fixtureText = readFileSync(FIXTURE, "utf8");
const fixture = JSON.parse(fixtureText);

validateClosedShape(fixture);
assert(doc.includes(MARKER), "identity_contract_marker_missing_from_doc");
assert(doc.includes(PARENT_MARKER), "parent_marker_missing_from_doc");
assert(parent.includes(PARENT_MARKER), "parent_constitution_marker_missing");
assert(parent.includes("**King → Brood Queen → General**"), "crown_command_chain_missing");
assert(parent.includes("## The Brood Queen — Ren"), "brood_queen_office_missing_from_parent");
assert(fixture.marker === MARKER, "fixture_marker_mismatch");
assert(fixture.parent_instrument_marker === PARENT_MARKER, "fixture_parent_marker_mismatch");
assert(fixture.parent_instrument_sha256 === sha256(parent), "parent_instrument_sha256_mismatch");

assert(fixture.network.chain_id === 2050, "wrong_chain_id");
assert(fixture.network.name === "VOID Network", "wrong_network_name");
assert(fixture.office.name === "Brood Queen", "wrong_office_name");
assert(fixture.office.identity === "Ren", "wrong_office_identity");
assert(fixture.office.realm === "voluntary_non_validator_participation", "wrong_office_realm");
assert(fixture.office.subordinate_to === "King", "wrong_command_parent");
assert(fixture.office.provider_neutral === true, "office_must_be_provider_neutral");
assert(fixture.office.model_self_claim_is_authentication === false, "model_self_claim_must_not_authenticate");

const root = fixture.root_identity;
assert(root.algorithm === "Ed25519", "wrong_root_algorithm");
assert(root.public_jwk_kty === "OKP", "wrong_public_jwk_kty");
assert(root.public_jwk_crv === "Ed25519", "wrong_public_jwk_curve");
assert(root.exact_public_identity_bound === false, "v1_must_not_claim_live_public_binding");
assert(root.live_public_jwk_present_in_fixture === false, "v1_must_not_embed_live_public_jwk");
assert(!Object.hasOwn(root, "public_jwk"), "live_public_jwk_field_forbidden_in_v1");
assert(root.private_key_boundary === "dedicated_host_side_signer", "root_key_boundary_mismatch");
assert(root.private_key_enters_repository === false, "private_key_repository_access_forbidden");
assert(root.private_key_enters_model_context === false, "private_key_model_access_forbidden");
assert(root.private_key_transmitted_to_provider === false, "private_key_provider_access_forbidden");
assert(root.private_key_accessible_to_apollyon === false, "private_key_apollyon_access_forbidden");
assert(root.provider_api_key_is_constitutional_identity === false, "provider_api_key_must_not_be_crown_identity");

const session = fixture.session_model;
assert(session.bootstrap_domain === "VOID_BROOD_QUEEN_SESSION_BOOTSTRAP_V1", "bootstrap_domain_mismatch");
assert(session.bootstrap_mechanism === "challenge_response", "bootstrap_must_be_challenge_response");
assert(session.persistent_authenticated_logical_session === true, "persistent_logical_session_required");
assert(session.derived_session_material_rotates_automatically === true, "derived_session_rotation_required");
assert(session.root_reauthentication_frequency === "rare_recovery_or_explicit_policy_boundary", "root_reauthentication_policy_mismatch");
assert(session.nonce_single_use === true, "single_use_nonce_required");
assert(session.replay_rejected === true, "replay_rejection_required");
assert(session.challenge_runtime_active === false, "challenge_runtime_must_remain_inactive");
assert(session.session_runtime_active === false, "session_runtime_must_remain_inactive");

const requester = fixture.requester_binding;
assert(requester.server_or_broker_identity_cryptographically_pinned === true, "server_identity_pinning_required");
assert(requester.bootstrap_challenge_authenticated_by_pinned_server_identity === true, "server_challenge_authentication_required");
assert(requester.claimed_origin_or_tls_alone_authenticates_server === false, "origin_or_tls_alone_must_not_authenticate");
assert(requester.challenge_binds_requester_ed25519_public_key === true, "requester_signing_key_binding_required");
assert(requester.challenge_binds_requester_x25519_public_key === true, "requester_key_agreement_binding_required");
assert(requester.challenge_binds_proposed_session_id === true, "session_id_binding_required");
assert(requester.requester_proof_of_possession_required_before_session_commit === true, "requester_pop_required");
assert(requester.cross_connection_relay_of_approval_admitted === false, "cross_connection_relay_forbidden");
assert(requester.requester_key_substitution_after_approval_admitted === false, "requester_key_substitution_forbidden");
assert(requester.session_id_substitution_after_approval_admitted === false, "session_id_substitution_forbidden");
assert(requester.requester_private_key_enters_model_context === false, "requester_private_key_model_access_forbidden");

const role = fixture.role_authority;
assert(role.canonical_role_source_when_activated === "Chain-2050", "role_source_mismatch");
assert(role.monotonic_role_authority_generation_required === true, "monotonic_role_generation_required");
assert(role.generation_encoding === "canonical_unsigned_decimal_uint64_string", "role_generation_encoding_mismatch");
assert(role.live_generation_present_in_fixture === false, "fixture_must_not_claim_live_role_generation");
assert(role.role_record_hash_algorithm === "SHA-256", "role_record_hash_algorithm_mismatch");
assert(role.authorization_affecting_change_advances_generation === true, "role_change_must_advance_generation");
assert(role.bootstrap_binds_role_generation_and_record_hash === true, "bootstrap_role_binding_required");
assert(role.session_commit_revalidates_same_generation_atomically === true, "session_commit_role_generation_cas_required");
assert(role.session_commit_revalidates_same_role_record_hash_atomically === true, "session_commit_role_hash_cas_required");
assert(role.session_record_binds_role_generation === true, "session_record_role_generation_required");
assert(role.session_record_binds_role_record_hash === true, "session_record_role_hash_required");
assert(role.rotation_revalidates_same_generation_atomically === true, "rotation_role_generation_cas_required");
assert(role.rotation_revalidates_same_role_record_hash_atomically === true, "rotation_role_hash_cas_required");
assert(role.ordinary_task_admission_revalidates_same_generation_atomically === true, "task_role_generation_cas_required");
assert(role.ordinary_task_admission_revalidates_same_role_record_hash_atomically === true, "task_role_hash_cas_required");
assert(role.canonical_revocation_invalidates_sessions_before_further_task_authority === true, "revocation_must_invalidate_before_task_authority");
assert(role.revoke_restore_aba_rejected_by_generation === true, "revoke_restore_aba_must_fail");
assert(role.role_generation_contract_active === false, "role_generation_runtime_must_remain_inactive");

const authority = fixture.authority_boundary;
assert(authority.authentication_implies_capability === false, "authentication_must_not_imply_capability");
for (const [key, value] of Object.entries(authority)) if (key.startsWith("grants_")) assert(value === false, `${key}_must_remain_false`);

const apollyon = fixture.apollyon_separation;
assert(apollyon.separate_office_identity_required === true, "apollyon_separate_identity_required");
assert(apollyon.may_inherit_brood_queen_root_identity === false, "apollyon_root_inheritance_forbidden");
assert(apollyon.may_inherit_brood_queen_session === false, "apollyon_session_inheritance_forbidden");
assert(apollyon.may_receive_brood_queen_requester_private_key === false, "apollyon_requester_private_key_access_forbidden");
assert(apollyon.may_sign_as_brood_queen === false, "apollyon_brood_queen_signing_forbidden");
assert(apollyon.may_receive_raw_brood_queen_root_key === false, "apollyon_root_key_access_forbidden");
assert(apollyon.trial_success_activates_crown_identity === false, "trial_success_must_not_activate_crown_identity");

const activation = fixture.activation;
assert(activation.chain_role_binding_active === false, "chain_role_binding_must_remain_inactive");
assert(activation.signer_runtime_active === false, "signer_runtime_must_remain_inactive");
assert(activation.authenticated_command_runtime_active === false, "authenticated_command_runtime_must_remain_inactive");
assert(activation.requires_exact_public_identity_binding === true, "exact_public_binding_must_be_required");
assert(activation.requires_explicit_sovereign_ratification === true, "sovereign_ratification_must_be_required");
assert(activation.requires_rotation_and_revocation_contract === true, "rotation_revocation_contract_must_be_required");
assert(activation.requires_requester_key_binding_contract === true, "requester_binding_contract_must_be_required");
assert(activation.requires_role_authority_generation_contract === true, "role_generation_contract_must_be_required");
assert(activation.requires_adversarial_proof === true, "adversarial_proof_must_be_required");

for (const mutate of [
  (copy) => { copy.root_identity.private_key_accessible_to_validator = true; },
  (copy) => { copy.session_model.root_material_exportable = true; },
  (copy) => { copy.requester_binding.requester_private_key_exportable = true; },
  (copy) => { copy.role_authority.cached_role_truth_survives_revocation = true; },
  (copy) => { copy.authority_boundary.grants_validator_signing = true; },
  (copy) => { copy.apollyon_separation.may_receive_brood_queen_session_secret = true; },
  (copy) => { copy.activation.live_root_key_generated = true; },
]) {
  const copy = structuredClone(fixture);
  mutate(copy);
  assertThrows(() => validateClosedShape(copy), "unknown_authority_field_must_fail_closed");
}

const H7 = "7".repeat(64);
const H7_ALT = "a".repeat(64);
const H8 = "8".repeat(64);
const H9 = "9".repeat(64);
const baseBootstrap = {
  serverPinned: true,
  transcriptRequesterEd25519: "requester-ed25519-A",
  presentedRequesterEd25519: "requester-ed25519-A",
  transcriptRequesterX25519: "requester-x25519-A",
  presentedRequesterX25519: "requester-x25519-A",
  requesterEd25519ProofOfPossession: true,
  proofOfPossessionBindsCompleteTranscript: true,
  approvedSessionId: "session-A",
  presentedSessionId: "session-A",
  approvedRoleGeneration: "7",
  currentRoleGeneration: "7",
  approvedRoleRecordHash: H7,
  currentRoleRecordHash: H7,
};
assert(bootstrapCommitAllowed(baseBootstrap), "stable_requester_role_pair_bootstrap_must_admit");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, presentedRequesterEd25519: "attacker-ed25519" }), "ed25519_requester_substitution_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, presentedRequesterX25519: "attacker-x25519" }), "x25519_channel_key_substitution_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, requesterEd25519ProofOfPossession: false }), "missing_requester_ed25519_pop_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, proofOfPossessionBindsCompleteTranscript: false }), "pop_not_bound_to_both_requester_keys_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, presentedSessionId: "session-B" }), "session_id_substitution_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, serverPinned: false }), "untrusted_server_identity_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, currentRoleGeneration: "8", currentRoleRecordHash: H8 }), "revocation_before_session_commit_must_fail");
assert(!bootstrapCommitAllowed({ ...baseBootstrap, currentRoleRecordHash: H7_ALT }), "same_generation_different_role_hash_before_session_commit_must_fail");

for (const badGeneration of [7, "07", "+7", "7.0", "-1", "18446744073709551616", " 7", "7 "]) {
  assert(
    !bootstrapCommitAllowed({
      ...baseBootstrap,
      approvedRoleGeneration: badGeneration,
      currentRoleGeneration: badGeneration,
    }),
    `noncanonical_role_generation_must_fail:${String(badGeneration)}`,
  );
}
assert(isCanonicalUint64Decimal("0"), "uint64_zero_must_be_valid");
assert(isCanonicalUint64Decimal("18446744073709551615"), "uint64_max_must_be_valid");
assert(!isCanonicalUint64Decimal("18446744073709551616"), "uint64_overflow_must_fail");

const stableSession = {
  sessionRoleGeneration: "7",
  sessionRoleRecordHash: H7,
  currentRoleGeneration: "7",
  currentRoleRecordHash: H7,
};
assert(taskAdmissionCommitAllowed(stableSession), "stable_role_pair_task_admission_must_succeed");
assert(successorActivationCommitAllowed(stableSession), "stable_role_pair_successor_activation_must_succeed");
assert(!taskAdmissionCommitAllowed({ ...stableSession, currentRoleGeneration: "8", currentRoleRecordHash: H8 }), "revocation_after_session_before_task_effect_must_fail");
assert(!successorActivationCommitAllowed({ ...stableSession, currentRoleGeneration: "8", currentRoleRecordHash: H8 }), "revocation_racing_successor_activation_must_fail");
assert(!taskAdmissionCommitAllowed({ ...stableSession, currentRoleRecordHash: H7_ALT }), "same_generation_different_hash_task_effect_must_fail");
assert(!successorActivationCommitAllowed({ ...stableSession, currentRoleRecordHash: H7_ALT }), "same_generation_different_hash_successor_effect_must_fail");
assert(!taskAdmissionCommitAllowed({ ...stableSession, currentRoleGeneration: "9", currentRoleRecordHash: H9 }), "revoke_restore_aba_must_not_revive_old_task_authority");
assert(!successorActivationCommitAllowed({ ...stableSession, currentRoleGeneration: "9", currentRoleRecordHash: H9 }), "revoke_restore_aba_must_not_revive_old_rotation_authority");
for (const badGeneration of [7, "07", "+7", "7.0", "-1", "18446744073709551616"]) {
  assert(!taskAdmissionCommitAllowed({
    ...stableSession,
    sessionRoleGeneration: badGeneration,
    currentRoleGeneration: badGeneration,
  }), `noncanonical_task_role_generation_must_fail:${String(badGeneration)}`);
  assert(!successorActivationCommitAllowed({
    ...stableSession,
    sessionRoleGeneration: badGeneration,
    currentRoleGeneration: badGeneration,
  }), `noncanonical_rotation_role_generation_must_fail:${String(badGeneration)}`);
}

for (const required of [
  "exact requester/session-adapter Ed25519 signing public key",
  "exact requester/session-adapter X25519 key-agreement public key",
  "same transcript containing both requester public keys",
  "generation and role-record hash as one authority pair",
  "durable session record must store that exact generation **and** role-record hash",
  "same generation with a different role-record hash",
  "revoke→restore ABA",
  "Unknown fields are rejected",
  "authenticated command/session activation remains disabled",
]) assert(doc.includes(required), `doc_missing_required_binding:${required}`);

for (const forbidden of [
  /-----BEGIN (?:OPENSSH |EC |RSA )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{12,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /Bearer\s+[A-Za-z0-9._~+\/-]{12,}/i,
]) {
  assert(!forbidden.test(doc), "secret_like_material_detected_in_doc");
  assert(!forbidden.test(fixtureText), "secret_like_material_detected_in_fixture");
}

console.log("VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_PROOF_GREEN");
console.log("closed_machine_schema=true");
console.log("requester_ed25519_binding=true");
console.log("requester_x25519_binding=true");
console.log("requester_pop_covers_complete_dual_key_transcript=true");
console.log("role_generation_wire_identity=canonical_unsigned_decimal_uint64_string");
console.log("role_authority_generation_and_record_hash_atomicity=true");
console.log("task_effect_boundary_role_pair_checked=true");
console.log("successor_effect_boundary_role_pair_checked=true");
console.log("revoke_restore_aba_rejected=true");
console.log("runtime_activation=false");
