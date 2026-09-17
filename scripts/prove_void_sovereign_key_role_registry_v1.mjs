import { readFileSync } from "node:fs";

const MARKER = "VOID_SOVEREIGN_KEY_ROLE_REGISTRY_V1_20260824";
const DOC = "docs/governance/void-sovereign-key-role-registry-v1.md";
const FIXTURE = "fixtures/governance/void-sovereign-key-role-registry-v1.json";
const PARENT = "docs/governance/void-crown-brood-queen-command-layer-v1.md";
const GUARD = "docs/governance/void-sovereign-authentication-activation-guard-v1.md";
const WORKFLOW = ".github/workflows/void-sovereign-key-role-registry-v1.yml";

const PRIMARY = "23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30";
const RECOVERY = "025d07005e25ed5e90aef7d526604050cff5b9504d44e6dfa348684afad5efe6";

function assert(value, message) {
  if (!value) throw new Error(message);
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

const doc = readFileSync(DOC, "utf8");
const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
const parent = readFileSync(PARENT, "utf8");
const guard = readFileSync(GUARD, "utf8");
const workflow = readFileSync(WORKFLOW, "utf8");

assert(doc.includes(MARKER), "doc_marker_missing");
assert(parent.includes("VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818"), "parent_marker_missing");
assert(guard.includes("VOID_SOVEREIGN_AUTHENTICATION_ACTIVATION_GUARD_V1_20260818"), "guard_marker_missing");
assert(fixture.marker === MARKER, "fixture_marker_mismatch");
assert(fixture.status === "source_only_role_registry", "fixture_status_wrong");
assert(fixture.network.chain_id === 2050, "wrong_chain_id");

exactKeys(fixture, ["marker", "status", "network", "roles", "alignment_layer", "activation"], "fixture");
exactKeys(fixture.roles, [
  "main_node_authentication",
  "sovereign_primary_governance_attestation",
  "sovereign_recovery",
  "premine_treasury_custody",
  "offline_nimo_continuity_witness",
], "roles");

const node = fixture.roles.main_node_authentication;
assert(node.binding === "existing_main_void_node_identity_key", "node_binding_changed");
assert(node.ordinary_sovereign_authentication === true, "node_auth_not_preserved");
assert(node.replaced_by_this_registry === false, "registry_replaces_node_auth");
assert(node.governance_attestation === false, "node_silently_gains_governance_attestation");
assert(node.treasury_authority === false, "node_silently_gains_treasury");

const primary = fixture.roles.sovereign_primary_governance_attestation;
assert(primary.algorithm === "Ed25519", "primary_algorithm_wrong");
assert(primary.public_key_der_sha256 === PRIMARY, "primary_fingerprint_wrong");
assert(primary.routine_login === false, "primary_became_login_key");
assert(primary.high_assurance_governance_attestation === true, "primary_role_missing");
assert(primary.emergency_pause_intended_signer === true, "primary_pause_role_missing");
assert(primary.runtime_active === false, "primary_runtime_silently_active");
assert(primary.treasury_authority === false, "primary_silently_gains_treasury");
assert(primary.private_key_enters_repository === false, "primary_private_key_repo_violation");
assert(primary.private_key_enters_model_context === false, "primary_private_key_model_violation");

const recovery = fixture.roles.sovereign_recovery;
assert(recovery.algorithm === "Ed25519", "recovery_algorithm_wrong");
assert(recovery.public_key_der_sha256 === RECOVERY, "recovery_fingerprint_wrong");
assert(recovery.recovers_primary_public_key_der_sha256 === PRIMARY, "recovery_primary_binding_wrong");
assert(recovery.dormant_by_default === true, "recovery_not_dormant");
assert(recovery.normal_login === false, "recovery_became_login_key");
assert(recovery.normal_command_authority === false, "recovery_became_command_key");
assert(recovery.recovery_rotation_only === true, "recovery_scope_not_closed");
assert(recovery.runtime_active === false, "recovery_runtime_silently_active");
assert(recovery.private_key_enters_repository === false, "recovery_private_key_repo_violation");
assert(recovery.private_key_enters_model_context === false, "recovery_private_key_model_violation");
assert(PRIMARY !== RECOVERY, "primary_recovery_not_distinct");

const premine = fixture.roles.premine_treasury_custody;
assert(premine.treasury_asset_custody === true, "premine_custody_role_missing");
assert(premine.ordinary_sovereign_authentication === false, "premine_became_auth_key");
assert(premine.governance_attestation === false, "premine_became_governance_key");
assert(premine.emergency_pause_authority === false, "premine_became_pause_key");

const nimo = fixture.roles.offline_nimo_continuity_witness;
assert(nimo.continuity_witness === true, "nimo_continuity_role_missing");
assert(nimo.ordinary_sovereign_authentication === false, "nimo_became_ordinary_auth");
assert(nimo.unilateral_constitutional_authority === false, "nimo_became_unilateral_constitutional_key");
assert(nimo.treasury_authority === false, "nimo_became_treasury_key");
assert(nimo.future_recovery_witness_allowed === true, "nimo_recovery_witness_role_missing");

const al = fixture.alignment_layer;
assert(al.fail_closed === true, "al_not_fail_closed");
for (const key of [
  "silent_role_inheritance_allowed",
  "recovery_key_for_ordinary_command_allowed",
  "premine_key_for_governance_allowed",
  "node_auth_key_satisfies_high_assurance_requirement",
  "model_may_rewrite_own_authority_checks",
  "unknown_authority_positive_fields_allowed",
]) assert(al[key] === false, `al_forbidden_path_enabled:${key}`);

for (const [key, value] of Object.entries(fixture.activation)) {
  assert(value === false, `source_only_registry_claims_activation:${key}`);
}

for (const required of [
  "main VOID node identity key remains the ordinary Sovereign login/authentication/bootstrap anchor",
  PRIMARY,
  RECOVERY,
  "No key silently inherits authority from another key",
  "Premine Key — Treasury / Asset Custody Only",
  "Offline Nimo Key / Environment — Continuity Witness",
  "No private key named by this registry belongs in Git",
]) assert(doc.includes(required), `doc_required_text_missing:${required}`);

for (const required of [
  "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
  "persist-credentials: false",
  "fetch-depth: 1",
  "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
  "node scripts/prove_void_sovereign_key_role_registry_v1.mjs",
]) assert(workflow.includes(required), `workflow_hardening_missing:${required}`);

console.log("VOID_SOVEREIGN_KEY_ROLE_REGISTRY_V1_PROOF_GREEN=true");
console.log(`primary_governance_attestation_sha256=${PRIMARY}`);
console.log(`recovery_sha256=${RECOVERY}`);
console.log("existing_node_authentication_preserved=true");
console.log("runtime_activation=false");
console.log("chain_mutation=false");
console.log("funds_authority_change=false");
