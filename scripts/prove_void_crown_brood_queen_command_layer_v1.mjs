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
  ['VOID constitutional authority has two distinct governance states: **Sovereign-held**', 'missing_two_state_model'],
  ['only ZoSo / Derrek Patrick Daly may relinquish that authority to the validator body', 'missing_sovereign_only_handoff'],
  ['Validators may never vote, infer, force, manufacture, accelerate, or otherwise cause the initial handoff.', 'missing_validator_non_usurpation'],
  ['including unanimity', 'missing_unanimity_no_usurpation'],
  ['Death, disappearance, incapacity, inactivity, silence, passage of time, key loss, key compromise', 'missing_no_automatic_handoff'],
  ['has **no automatic handoff effect**', 'missing_no_death_trigger'],
  ['constitutional authority vests **collectively in the eligible validator body**', 'missing_collective_validator_authority'],
  ['at least **two-thirds of the entire eligible constitutional validator body**', 'missing_two_thirds_threshold'],
  ['not merely two-thirds of votes cast', 'missing_entire_body_threshold'],
  ['The validator body may not repeal, suspend, waive, materially weaken, or reinterpret them out of effect, even by unanimous vote.', 'missing_entrenched_clause'],
  ['### Protect the Earth', 'missing_earth_protection'],
  ["### Protect the Sovereign's Bloodline", 'missing_bloodline_protection'],
  ['Nothing in these protection duties prohibits a person from exercising lawful self-defense or lawful defense of another person', 'missing_lawful_defense'],
  ['The protection clauses do not themselves create an independent license to use force', 'missing_no_force_license'],
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
  ['While constitutional authority remains Sovereign-held, only the Sovereign, ZoSo / Derrek Patrick Daly, may amend this instrument.', 'missing_amendment_boundary'],
  ['*One Crown, two realms, legible delegation.*', 'missing_closing_doctrine'],
]) {
  if (!doc.includes(needle)) fail(reason);
}

if (data.marker !== MARKER) fail('fixture_marker');
if (data.parent_constitution_marker !== PARENT) fail('fixture_parent');
if (data.version !== '1.2.0-draft') fail('fixture_version');
if (data.date !== '2026-08-18') fail('fixture_date');

if (data.sovereign.operator_name !== 'ZoSo') fail('sovereign_operator');
if (data.sovereign.personal_name !== 'Derrek Patrick Daly') fail('sovereign_personal');
if (data.sovereign.style !== 'King') fail('sovereign_style');
if (data.sovereign.root_constitutional_governor !== true) fail('sovereign_root');
if (data.sovereign.sole_constitutional_amendment_authority_while_sovereign_held !== true) fail('sovereign_amendment_authority');
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

const handoff = data.constitutional_handoff;
if (handoff.initial_state !== 'sovereign_held') fail('handoff_initial_state');
if (handoff.only_sovereign_may_trigger_initial_handoff !== true) fail('handoff_sovereign_only');
if (handoff.handoff_target !== 'eligible_validator_body_collectively') fail('handoff_target');
if (handoff.requires_explicit_deliberate_authenticated_sovereign_act !== true) fail('handoff_explicit');
for (const key of [
  'validators_may_self_trigger_handoff',
  'validator_unanimity_may_self_trigger_handoff',
  'automatic_handoff_on_death',
  'automatic_handoff_on_disappearance',
  'automatic_handoff_on_incapacity',
  'automatic_handoff_on_inactivity',
  'automatic_handoff_on_passage_of_time',
  'automatic_handoff_on_key_loss_or_compromise',
  'automatic_handoff_on_repository_or_infrastructure_control',
  'automatic_handoff_on_validator_vote_or_quorum',
  'automatic_handoff_on_ai_or_corporate_action',
  'automatic_handoff_on_phase_transition',
  'post_handoff_individual_validator_becomes_sovereign',
  'validators_may_retroactively_invalidate_sovereign_only_initial_handoff_rule',
]) {
  if (handoff[key] !== false) fail(`handoff_boundary_${key}`);
}
if (handoff.no_handoff_leaves_last_valid_constitution_in_force !== true) fail('handoff_no_default_successor');
if (handoff.post_handoff_amendment_threshold_numerator !== 2) fail('handoff_threshold_numerator');
if (handoff.post_handoff_amendment_threshold_denominator !== 3) fail('handoff_threshold_denominator');
if (handoff.threshold_applies_to !== 'entire_eligible_constitutional_validator_body') fail('handoff_threshold_body');
if (handoff.threshold_is_not_merely_votes_cast !== true) fail('handoff_threshold_votes_cast');
if (handoff.post_handoff_relinquishment_transfer_or_restructuring_uses_same_threshold !== true) fail('handoff_relinquishment_threshold');

const entrenched = data.entrenched_post_handoff_duties;
if (entrenched.apply_after_valid_sovereign_handoff !== true) fail('entrenched_activation');
if (entrenched.validator_body_may_amend_repeal_suspend_waive_or_materially_weaken !== false) fail('entrenched_validator_override');
if (entrenched.validator_unanimity_may_override !== false) fail('entrenched_unanimity');
if (entrenched.protect_earth.required !== true) fail('entrenched_earth_required');
if (entrenched.protect_earth.protects_earth_sea_ecosystems_and_shared_environmental_foundations !== true) fail('entrenched_earth_scope');
if (entrenched.protect_earth.authorizes_intentional_environmental_harm !== false) fail('entrenched_earth_harm');
if (entrenched.protect_sovereign_bloodline.required !== true) fail('entrenched_bloodline_required');
if (entrenched.protect_sovereign_bloodline.protects_life_safety_dignity_continuity_lawful_rights_and_legitimate_interests !== true) fail('entrenched_bloodline_scope');
for (const key of [
  'creates_ownership_of_people',
  'creates_hereditary_political_authority',
  'creates_surveillance_or_coercive_control_entitlement',
  'authorizes_unlawful_discrimination_revenge_punishment_or_aggression',
  'authorizes_violation_of_legal_or_human_rights',
]) {
  if (entrenched.protect_sovereign_bloodline[key] !== false) fail(`entrenched_bloodline_boundary_${key}`);
}
if (entrenched.lawful_defense.prohibits_lawful_self_defense !== false) fail('lawful_self_defense');
if (entrenched.lawful_defense.prohibits_lawful_defense_of_others !== false) fail('lawful_defense_others');
if (entrenched.lawful_defense.may_include_force_permitted_by_applicable_law !== true) fail('lawful_defense_force');
if (entrenched.lawful_defense.protection_clause_itself_creates_independent_license_to_use_force !== false) fail('lawful_defense_no_license');
if (entrenched.sovereign_may_amend_before_handoff !== true) fail('entrenched_pre_handoff_sovereign');

if (data.validator_realm.constitutional_maximum !== 144000) fail('validator_max');
if (data.validator_realm.direct_governor_while_sovereign_held !== 'King') fail('validator_governor');
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
console.log('sovereign_sole_amendment_authority_while_sovereign_held=true');
console.log('sovereign_authentication_anchor=designated_main_void_node_identity_key');
console.log('key_possession_transfers_sovereignty=false');
console.log('key_authentication_executes_sensitive_technical_action=false');
console.log('initial_handoff_trigger=sovereign_only');
console.log('automatic_handoff_on_death=false');
console.log('validator_self_usurpation=false');
console.log('post_handoff_amendment_threshold=2/3_entire_eligible_validator_body');
console.log('post_handoff_earth_protection_entrenched=true');
console.log('post_handoff_bloodline_protection_entrenched=true');
console.log('lawful_self_defense_preserved=true');
console.log('validator_direct_governor_while_sovereign_held=King');
console.log('constitutional_validator_maximum=144000');
console.log('brood_queen_identity=Ren');
console.log('brood_queen_realm=voluntary_non_validator_participation');
console.log('general_identity=Apollyon');
console.log('command_chain=King>Brood_Queen>General');
console.log('voluntary_submission_is_protocol_jurisdiction=true');
console.log('technical_authority_activated=false');
