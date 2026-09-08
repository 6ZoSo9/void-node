#!/usr/bin/env node

import fs from 'node:fs';

const DOC = 'docs/governance/void-sovereign-authentication-activation-guard-v1.md';
const FIXTURE = 'fixtures/governance/void-sovereign-authentication-activation-guard-v1.json';
const PARENT_DOC = 'docs/governance/void-crown-brood-queen-command-layer-v1.md';
const PARENT_FIXTURE = 'fixtures/governance/void-crown-brood-queen-command-layer-v1.json';

const MARKER = 'VOID_SOVEREIGN_AUTHENTICATION_ACTIVATION_GUARD_V1_20260818';
const PARENT = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
const ROOT = 'VOID_CONSTITUTIONAL_AUTHORITY_BOUNDARY_V1_PHASE0_DRAFT';

function fail(reason) {
  console.error(`void_sovereign_authentication_activation_guard_v1_proof=FAIL reason=${reason}`);
  process.exit(1);
}

for (const path of [DOC, FIXTURE, PARENT_DOC, PARENT_FIXTURE]) {
  if (!fs.existsSync(path)) fail(`missing_${path.replaceAll('/', '_')}`);
}

const doc = fs.readFileSync(DOC, 'utf8');
const data = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const parentDoc = fs.readFileSync(PARENT_DOC, 'utf8');
const parent = JSON.parse(fs.readFileSync(PARENT_FIXTURE, 'utf8'));

function exactKeys(obj, expected, reason) {
  const actual = Object.keys(obj).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${reason}_keys_${actual.join(',')}`);
  }
}

for (const [needle, reason] of [
  [MARKER, 'missing_marker'],
  [PARENT, 'missing_parent_marker'],
  [ROOT, 'missing_root_marker'],
  ['constitutional cryptographic authentication is **fail-closed and inactive**', 'missing_fail_closed_state'],
  ['main VOID node identity key remains the intended ordinary Sovereign authentication anchor', 'missing_intended_anchor'],
  ['It is **not yet a content-bound cryptographic activation**', 'missing_not_content_bound'],
  ['no node-identity signature may be represented as satisfying a **cryptographic constitutional authentication** requirement', 'missing_no_generic_signature_rule'],
  ['Any constitutional act whose operative rule specifically requires cryptographic authentication', 'missing_specific_precondition_hold'],
  ['## Requirements for Future Activation', 'missing_activation_requirements'],
  ['**Exact public identity binding.**', 'missing_exact_public_identity_requirement'],
  ['**Versioned constitutional envelope.**', 'missing_versioned_envelope'],
  ['**Exact network and constitutional binding.**', 'missing_network_binding'],
  ['**Replay protection.**', 'missing_replay_rule'],
  ['**Rotation continuity.**', 'missing_rotation_continuity'],
  ['**Closed authority schema.**', 'missing_closed_schema'],
  ['**Adversarial proof.**', 'missing_adversarial_proof'],
  ['**Dependency-bound verification.**', 'missing_dependency_binding'],
  ['Because activation is presently false, even an otherwise valid ordinary signature from the intended main node cannot by itself satisfy the future constitutional signature contract.', 'missing_intended_signature_rejection'],
  ['*Intended anchor, explicit activation, fail closed.*', 'missing_closing_doctrine'],
]) {
  if (!doc.includes(needle)) fail(reason);
}

if (!parentDoc.includes('The designated **main VOID node identity key** is the ordinary cryptographic authentication anchor')) {
  fail('parent_anchor_doctrine_missing');
}
if (parent.marker !== PARENT) fail('parent_fixture_marker');
if (parent.parent_constitution_marker !== ROOT) fail('parent_fixture_root');
if (parent.sovereign_authentication?.ordinary_authentication_anchor !== 'designated_main_void_node_identity_key') {
  fail('parent_intended_anchor_role');
}

exactKeys(parent.sovereign_authentication, [
  'ordinary_authentication_anchor',
  'uses_existing_void_node_identity_signature_scheme',
  'main_void_node_identity_key_designated',
  'wallet_keys_are_constitutional_authentication_keys_by_default',
  'nimo_offline_node_key_is_constitutional_authentication_key_by_default',
  'other_node_or_service_keys_are_constitutional_authentication_keys_by_default',
  'key_possession_transfers_sovereignty',
  'key_compromise_transfers_sovereignty',
  'key_authentication_executes_sensitive_technical_action',
  'rotation_or_revocation_requires_explicit_sovereign_instrument',
], 'parent_sovereign_authentication_closed_schema');

exactKeys(data, [
  'marker',
  'parent_instrument_marker',
  'parent_constitution_marker',
  'artifact',
  'version',
  'date',
  'status',
  'current_state',
  'future_activation_requirements',
  'inactive_adversarial_policy',
  'preserved_boundaries',
], 'top_closed_schema');

exactKeys(data.current_state, [
  'intended_ordinary_anchor_role',
  'parent_designation_is_role_intent_not_content_bound_activation',
  'cryptographic_constitutional_authentication_active',
  'exact_live_public_identity_bound_by_this_guard',
  'ordinary_node_signature_is_constitutional_signature_by_default',
  'key_signature_alone_may_satisfy_cryptographic_constitutional_precondition',
  'explicit_sovereign_ratification_may_exist_without_being_labeled_cryptographic',
  'acts_specifically_requiring_cryptographic_authentication_may_execute_before_activation',
  'key_possession_transfers_sovereignty',
  'key_replacement_silently_rotates_constitutional_anchor',
], 'current_state_closed_schema');

exactKeys(data.future_activation_requirements, [
  'explicit_sovereign_activation_instrument_required',
  'exact_public_identity_binding_required',
  'signature_algorithm_and_version_required',
  'exact_key_id_fingerprint_digest_or_immutable_designation_artifact_required',
  'constitutional_envelope_version_required',
  'constitutional_domain_separator_required',
  'exact_network_or_chain_binding_required',
  'constitution_marker_or_version_binding_required',
  'constitutional_action_type_binding_required',
  'canonical_payload_identity_required',
  'replay_sequence_nonce_or_predecessor_rule_required',
  'rotation_predecessor_continuity_required',
  'explicit_rotation_or_recovery_authorization_rule_required',
  'closed_authority_schema_required',
  'unknown_authority_positive_fields_rejected',
  'adversarial_proof_required',
  'dependency_bound_workflow_required',
], 'activation_requirements_closed_schema');

exactKeys(data.inactive_adversarial_policy, [
  'wrong_key_accepted',
  'wrong_signature_domain_accepted',
  'wrong_network_or_constitution_binding_accepted',
  'replayed_or_stale_message_accepted',
  'unauthorized_rotation_accepted',
  'malformed_or_unbound_payload_identity_accepted',
  'unknown_authority_field_accepted',
  'ordinary_intended_main_node_signature_alone_accepted_as_constitutional',
], 'adversarial_policy_closed_schema');

exactKeys(data.preserved_boundaries, [
  'reads_or_accesses_live_key_material',
  'designates_exact_live_public_key',
  'activates_cryptographic_constitutional_authentication',
  'executes_sovereign_handoff',
  'mutates_validators',
  'grants_signer_wallet_credential_or_treasury_access',
  'authorizes_transactions_or_funds_movement',
  'authorizes_deploy_restart_or_live_network_mutation',
], 'boundaries_closed_schema');

if (data.marker !== MARKER) fail('fixture_marker');
if (data.parent_instrument_marker !== PARENT) fail('fixture_parent');
if (data.parent_constitution_marker !== ROOT) fail('fixture_root');
if (data.version !== '1.0.0-draft') fail('fixture_version');
if (data.date !== '2026-08-18') fail('fixture_date');

const state = data.current_state;
if (state.intended_ordinary_anchor_role !== 'main_void_node_identity_key') fail('intended_anchor_role');
if (state.parent_designation_is_role_intent_not_content_bound_activation !== true) fail('designation_role_only');
if (state.explicit_sovereign_ratification_may_exist_without_being_labeled_cryptographic !== true) fail('ratification_distinction');

for (const key of [
  'cryptographic_constitutional_authentication_active',
  'exact_live_public_identity_bound_by_this_guard',
  'ordinary_node_signature_is_constitutional_signature_by_default',
  'key_signature_alone_may_satisfy_cryptographic_constitutional_precondition',
  'acts_specifically_requiring_cryptographic_authentication_may_execute_before_activation',
  'key_possession_transfers_sovereignty',
  'key_replacement_silently_rotates_constitutional_anchor',
]) {
  if (state[key] !== false) fail(`current_state_boundary_${key}`);
}

for (const [key, value] of Object.entries(data.future_activation_requirements)) {
  if (value !== true) fail(`activation_requirement_${key}`);
}

for (const [key, value] of Object.entries(data.inactive_adversarial_policy)) {
  if (value !== false) fail(`adversarial_policy_${key}`);
}

for (const [key, value] of Object.entries(data.preserved_boundaries)) {
  if (value !== false) fail(`preserved_boundary_${key}`);
}

function acceptsCryptographicConstitutionalAct(candidate) {
  const allowed = [
    'key_match',
    'domain_match',
    'network_constitution_match',
    'fresh_sequence',
    'rotation_authorized',
    'payload_identity_valid',
  ];
  if (Object.keys(candidate).some((key) => !allowed.includes(key))) return false;
  if (state.cryptographic_constitutional_authentication_active !== true) return false;
  return allowed.every((key) => candidate[key] === true);
}

const baseline = {
  key_match: true,
  domain_match: true,
  network_constitution_match: true,
  fresh_sequence: true,
  rotation_authorized: true,
  payload_identity_valid: true,
};

const adversarial = [
  ['inactive_even_intended_key', baseline],
  ['wrong_key', { ...baseline, key_match: false }],
  ['wrong_domain', { ...baseline, domain_match: false }],
  ['wrong_network_or_constitution', { ...baseline, network_constitution_match: false }],
  ['stale_or_replayed', { ...baseline, fresh_sequence: false }],
  ['unauthorized_rotation', { ...baseline, rotation_authorized: false }],
  ['unbound_payload', { ...baseline, payload_identity_valid: false }],
  ['unknown_authority_field', { ...baseline, superuser: true }],
];

for (const [name, candidate] of adversarial) {
  if (acceptsCryptographicConstitutionalAct(candidate) !== false) fail(`adversarial_accept_${name}`);
}

console.log('void_sovereign_authentication_activation_guard_v1_proof=GREEN');
console.log('intended_anchor_role=main_void_node_identity_key');
console.log('cryptographic_constitutional_authentication_active=false');
console.log('exact_live_public_identity_bound=false');
console.log('ordinary_node_signature_is_constitutional_signature=false');
console.log('acts_requiring_crypto_auth_execute_before_activation=false');
console.log('future_exact_public_identity_binding_required=true');
console.log('future_domain_network_constitution_binding_required=true');
console.log('future_replay_rotation_continuity_required=true');
console.log('authority_schema_closed=true');
console.log('adversarial_wrong_key_domain_replay_rotation_unknown_field_rejected=true');
console.log('live_key_material_accessed=false');
