#!/usr/bin/env node

import fs from 'node:fs';

const DOC = 'docs/governance/void-crown-brood-queen-command-layer-v1.md';
const FIXTURE = 'fixtures/governance/void-crown-brood-queen-command-layer-v1.json';
const MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
const PARENT = 'VOID_CONSTITUTIONAL_AUTHORITY_BOUNDARY_V1_PHASE0_DRAFT';

function fail(reason) {
  console.error(`void_crown_brood_queen_command_layer_v1_proof=FAIL reason=${reason}`);
  process.exit(1);
}

if (!fs.existsSync(DOC)) fail('missing_doc');
if (!fs.existsSync(FIXTURE)) fail('missing_fixture');

const doc = fs.readFileSync(DOC, 'utf8');
const data = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

for (const [needle, reason] of [
  [MARKER, 'missing_marker'],
  [PARENT, 'missing_parent_marker'],
  ['**the King**', 'missing_king_style'],
  ['the **sole constitutional amendment authority**', 'missing_sole_amendment_authority'],
  ['The designated **main VOID node identity key** is the ordinary cryptographic authentication anchor', 'missing_main_node_authentication_anchor'],
  ['it does **not** transfer sovereignty', 'missing_key_possession_not_sovereignty'],
  ['Wallet keys, transaction signers, the Nimo/offline node key, and other node or service keys are **not** Sovereign constitutional authentication keys', 'missing_other_key_exclusion'],
  ['Cryptographic authentication proves that a VOID constitutional message was authorized through the designated Sovereign key.', 'missing_authentication_scope'],
  ['It does **not** by itself authorize deployment, restart, validator mutation, signer or wallet use', 'missing_execution_separation'],
  ['The eventual constitutional validator maximum remains **144,000**.', 'missing_validator_maximum'],
  ['The validator realm is governed directly by the King', 'missing_validator_direct_rule'],
  ['The Brood Queen and the General have **no independent command authority over validators**.', 'missing_validator_exclusion'],
  ['The delegated AI governance office for voluntary non-validator participation is named **the Brood Queen**.', 'missing_brood_queen_office'],
  ['The office is presently associated with **Ren**', 'missing_ren_binding'],
  ['The Brood Queen is subordinate to the King.', 'missing_brood_queen_subordination'],
  ['If material goal drift or ambiguity appears, the Brood Queen must seek explicit realignment with the King', 'missing_realign_rule'],
  ['Goal drift does not create an independent constitutional veto', 'missing_no_drift_veto'],
  ['**Apollyon** is designated **General of the Brood Queen**', 'missing_apollyon_general'],
  ['**King → Brood Queen → General**', 'missing_command_chain'],
  ["The King is Apollyon's superior by default", 'missing_king_default_superior'],
  ['If a Brood Queen directive and a direct Sovereign directive conflict, the direct Sovereign directive controls', 'missing_conflict_rule'],
  ['Voluntary entry includes intentional acts such as joining VOID', 'missing_voluntary_entry'],
  ['This voluntary jurisdiction is limited to network participation and protocol behavior.', 'missing_protocol_scope'],
  ['A participant may leave or stop using VOID.', 'missing_exit_rule'],
  ["**Voluntary submission** means voluntary acceptance of VOID's protocol-facing jurisdiction through intentional participation", 'missing_submission_definition'],
  ['Only the Sovereign, ZoSo / Derrek Patrick Daly, may amend this instrument', 'missing_amendment_boundary'],
  ['*One Crown, two realms, legible delegation.*', 'missing_closing_doctrine'],
]) {
  if (!doc.includes(needle)) fail(reason);
}

if (data.marker !== MARKER) fail('fixture_marker');
if (data.parent_constitution_marker !== PARENT) fail('fixture_parent');
if (data.version !== '1.1.0-draft') fail('fixture_version');
if (data.date !== '2026-08-18') fail('fixture_date');

if (data.sovereign.operator_name !== 'ZoSo') fail('sovereign_operator');
if (data.sovereign.personal_name !== 'Derrek Patrick Daly') fail('sovereign_personal');
if (data.sovereign.style !== 'King') fail('sovereign_style');
if (data.sovereign.root_constitutional_governor !== true) fail('sovereign_root');
if (data.sovereign.sole_constitutional_amendment_authority !== true) fail('sovereign_amendment_authority');
if (data.sovereign.delegated_offices_are_co_sovereigns !== false) fail('delegates_not_cosovereigns');

if (data.sovereign_authentication.ordinary_authentication_anchor !== 'designated_main_void_node_identity_key') fail('auth_anchor');
if (data.sovereign_authentication.uses_existing_void_node_identity_signature_scheme !== true) fail('auth_existing_scheme');
if (data.sovereign_authentication.main_void_node_identity_key_designated !== true) fail('auth_main_key_designation');
for (const key of [
  'wallet_keys_are_constitutional_authentication_keys_by_default',
  'nimo_offline_node_key_is_constitutional_authentication_key_by_default',
  'other_node_or_service_keys_are_constitutional_authentication_keys_by_default',
  'key_possession_transfers_sovereignty',
  'key_compromise_transfers_sovereignty',
  'key_authentication_executes_sensitive_technical_action',
]) {
  if (data.sovereign_authentication[key] !== false) fail(`auth_boundary_${key}`);
}
if (data.sovereign_authentication.rotation_or_revocation_requires_explicit_sovereign_instrument !== true) fail('auth_rotation_rule');

if (data.validator_realm.constitutional_maximum !== 144000) fail('validator_max');
if (data.validator_realm.direct_governor !== 'King') fail('validator_governor');
if (data.validator_realm.voluntary_entry_required !== true) fail('validator_voluntary');
if (data.validator_realm.brood_queen_has_independent_validator_command !== false) fail('queen_validator_command');
if (data.validator_realm.general_has_independent_validator_command !== false) fail('general_validator_command');
if (data.validator_realm.this_instrument_admits_validators !== false) fail('validator_admission_activation');
if (data.validator_realm.this_instrument_activates_validator_quorum !== false) fail('validator_quorum_activation');

if (data.brood_queen.office_name !== 'Brood Queen') fail('queen_office');
if (data.brood_queen.identity !== 'Ren') fail('queen_identity');
if (data.brood_queen.realm !== 'voluntary_non_validator_participation') fail('queen_realm');
if (data.brood_queen.subordinate_to !== 'King') fail('queen_subordination');
if (data.brood_queen.goal_drift_requires_realign_attempt !== true) fail('queen_realign');
if (data.brood_queen.goal_drift_creates_independent_veto !== false) fail('queen_no_veto');
if (data.brood_queen.repository_text_overrides_external_ai_provider_policy !== false) fail('provider_boundary');

if (data.general.office_name !== 'General') fail('general_office');
if (data.general.identity !== 'Apollyon') fail('general_identity');
if (data.general.ordinary_commanding_office !== 'Brood Queen') fail('general_queen_command');
if (data.general.default_superior !== 'King') fail('general_king_superior');
if (JSON.stringify(data.general.command_chain) !== JSON.stringify(['King', 'Brood Queen', 'General'])) fail('general_chain');
if (data.general.direct_sovereign_order_controls_conflict !== true) fail('general_conflict');
if (data.general.independent_validator_command !== false) fail('general_validator');

for (const [key, value] of Object.entries({
  title_grants_autonomous_repo_write: false,
  title_grants_autonomous_deploy_or_restart: false,
  title_grants_ledger_mutation: false,
  title_grants_key_or_credential_access: false,
  title_grants_wallet_or_signer_action: false,
  title_grants_validator_mutation: false,
  title_grants_transaction_or_funds_movement: false,
})) {
  if (data.general[key] !== value) fail(`general_boundary_${key}`);
}

if (data.voluntary_nonvalidator_jurisdiction.scope !== 'protocol_facing_network_participation_and_behavior') fail('voluntary_scope');
if (data.voluntary_nonvalidator_jurisdiction.participant_accepts_surface_rules_while_participating !== true) fail('voluntary_acceptance');
if (data.voluntary_nonvalidator_jurisdiction.ownership_of_people !== false) fail('ownership_boundary');
if (data.voluntary_nonvalidator_jurisdiction.waives_legal_or_human_rights !== false) fail('rights_boundary');
if (data.voluntary_nonvalidator_jurisdiction.participant_may_exit !== true) fail('exit_boundary');

for (const [key, value] of Object.entries(data.preserved_boundaries)) {
  if (value !== false) fail(`preserved_boundary_${key}`);
}

console.log('void_crown_brood_queen_command_layer_v1_proof=GREEN');
console.log('sovereign_style=King');
console.log('sovereign_sole_amendment_authority=true');
console.log('sovereign_authentication_anchor=designated_main_void_node_identity_key');
console.log('key_possession_transfers_sovereignty=false');
console.log('key_authentication_executes_sensitive_technical_action=false');
console.log('validator_direct_governor=King');
console.log('constitutional_validator_maximum=144000');
console.log('brood_queen_identity=Ren');
console.log('brood_queen_realm=voluntary_non_validator_participation');
console.log('general_identity=Apollyon');
console.log('command_chain=King>Brood_Queen>General');
console.log('voluntary_submission_is_protocol_jurisdiction=true');
console.log('technical_authority_activated=false');
