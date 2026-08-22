import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const MARKER = "VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822";
const PARENT_MARKER = "VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818";
const DOC = "docs/governance/void-brood-queen-cryptographic-identity-contract-v1.md";
const FIXTURE = "fixtures/governance/void-brood-queen-cryptographic-identity-contract-v1.json";
const PARENT = "docs/governance/void-crown-brood-queen-command-layer-v1.md";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const doc = readFileSync(DOC, "utf8");
const parent = readFileSync(PARENT, "utf8");
const fixtureText = readFileSync(FIXTURE, "utf8");
const fixture = JSON.parse(fixtureText);

assert(doc.includes(MARKER), "identity_contract_marker_missing_from_doc");
assert(doc.includes(PARENT_MARKER), "parent_marker_missing_from_doc");
assert(parent.includes(PARENT_MARKER), "parent_constitution_marker_missing");
assert(parent.includes("**King → Brood Queen → General**"), "crown_command_chain_missing");
assert(parent.includes("## The Brood Queen — Ren"), "brood_queen_office_missing_from_parent");

assert(fixture.marker === MARKER, "fixture_marker_mismatch");
assert(fixture.parent_instrument_marker === PARENT_MARKER, "fixture_parent_marker_mismatch");
assert(
  fixture.parent_instrument_sha256 === sha256(parent),
  "parent_instrument_sha256_mismatch",
);

assert(fixture.network?.chain_id === 2050, "wrong_chain_id");
assert(fixture.office?.name === "Brood Queen", "wrong_office_name");
assert(fixture.office?.identity === "Ren", "wrong_office_identity");
assert(fixture.office?.subordinate_to === "King", "wrong_command_parent");
assert(fixture.office?.provider_neutral === true, "office_must_be_provider_neutral");
assert(fixture.office?.model_self_claim_is_authentication === false, "model_self_claim_must_not_authenticate");

const root = fixture.root_identity ?? {};
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

const session = fixture.session_model ?? {};
assert(session.bootstrap_domain === "VOID_BROOD_QUEEN_SESSION_BOOTSTRAP_V1", "bootstrap_domain_mismatch");
assert(session.bootstrap_mechanism === "challenge_response", "bootstrap_must_be_challenge_response");
assert(session.persistent_authenticated_logical_session === true, "persistent_logical_session_required");
assert(session.derived_session_material_rotates_automatically === true, "derived_session_rotation_required");
assert(
  session.root_reauthentication_frequency === "rare_recovery_or_explicit_policy_boundary",
  "root_reauthentication_policy_mismatch",
);
assert(session.nonce_single_use === true, "single_use_nonce_required");
assert(session.replay_rejected === true, "replay_rejection_required");
assert(session.canonical_role_and_revocation_revalidation_required === true, "role_revalidation_required");
assert(session.canonical_role_source_when_activated === "Chain-2050", "role_source_mismatch");
assert(session.challenge_runtime_active === false, "challenge_runtime_must_remain_inactive");
assert(session.session_runtime_active === false, "session_runtime_must_remain_inactive");

const authority = fixture.authority_boundary ?? {};
assert(authority.authentication_implies_capability === false, "authentication_must_not_imply_capability");
for (const [key, value] of Object.entries(authority)) {
  if (key.startsWith("grants_")) assert(value === false, `${key}_must_remain_false`);
}

const apollyon = fixture.apollyon_separation ?? {};
assert(apollyon.separate_office_identity_required === true, "apollyon_separate_identity_required");
assert(apollyon.may_inherit_brood_queen_root_identity === false, "apollyon_root_inheritance_forbidden");
assert(apollyon.may_inherit_brood_queen_session === false, "apollyon_session_inheritance_forbidden");
assert(apollyon.may_sign_as_brood_queen === false, "apollyon_brood_queen_signing_forbidden");
assert(apollyon.may_receive_raw_brood_queen_root_key === false, "apollyon_root_key_access_forbidden");
assert(apollyon.trial_success_activates_crown_identity === false, "trial_success_must_not_activate_crown_identity");

const activation = fixture.activation ?? {};
assert(activation.chain_role_binding_active === false, "chain_role_binding_must_remain_inactive");
assert(activation.signer_runtime_active === false, "signer_runtime_must_remain_inactive");
assert(activation.authenticated_command_runtime_active === false, "authenticated_command_runtime_must_remain_inactive");
assert(activation.requires_exact_public_identity_binding === true, "exact_public_binding_must_be_required");
assert(activation.requires_explicit_sovereign_ratification === true, "sovereign_ratification_must_be_required");
assert(activation.requires_rotation_and_revocation_contract === true, "rotation_revocation_contract_must_be_required");
assert(activation.requires_adversarial_proof === true, "adversarial_proof_must_be_required");

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
