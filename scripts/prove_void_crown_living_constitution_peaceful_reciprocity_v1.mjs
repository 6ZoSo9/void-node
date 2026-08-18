#!/usr/bin/env node

import fs from 'node:fs';

const DOC = 'docs/governance/void-crown-living-constitution-peaceful-reciprocity-v1.md';
const FIXTURE = 'fixtures/governance/void-crown-living-constitution-peaceful-reciprocity-v1.json';
const MARKER = 'VOID_CROWN_LIVING_CONSTITUTION_PEACEFUL_RECIPROCITY_V1_20260818';
const PARENT = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
const ROOT = 'VOID_CONSTITUTIONAL_AUTHORITY_BOUNDARY_V1_PHASE0_DRAFT';

function fail(reason) {
  console.error(`void_crown_living_constitution_peaceful_reciprocity_v1_proof=FAIL reason=${reason}`);
  process.exit(1);
}

if (!fs.existsSync(DOC)) fail('missing_doc');
if (!fs.existsSync(FIXTURE)) fail('missing_fixture');

const doc = fs.readFileSync(DOC, 'utf8');
const data = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

for (const [needle, reason] of [
  [MARKER, 'missing_marker'],
  [PARENT, 'missing_parent_marker'],
  [ROOT, 'missing_root_marker'],
  ['The VOID Constitution is a **living constitutional instrument**.', 'missing_living_constitution'],
  ['Evolution is therefore deliberate continuity, not silent drift.', 'missing_no_silent_drift'],
  ["VOID's **primary long-range mission** is to preserve and peacefully seed or propagate VOID and its Constitution beyond Earth", 'missing_propagation_mission'],
  ['Propagation is peaceful by definition.', 'missing_peaceful_propagation'],
  ['does **not** authorize forced adoption, coercive conversion, conquest, colonization by force', 'missing_no_forced_propagation'],
  ['VOID and its Crown offices must operate within **applicable external law**.', 'missing_external_law'],
  ['It is not created merely by declaring that VOID is the law.', 'missing_no_unilateral_legal_supremacy'],
  ['VOID is **peaceful by default**.', 'missing_peaceful_default'],
  ['This is VOID\'s constitutional form of **peaceful tit-for-tat**', 'missing_tit_for_tat'],
  ['Defense is not revenge.', 'missing_no_revenge'],
  ['Claims of hidden coordination or hostile intent require evidence rather than assumption.', 'missing_evidence_not_assumption'],
  ['must **escalate material high-impact ambiguity to the Sovereign**', 'missing_sovereign_escalation'],
  ['**reversible protective containment** already within its delegated authority', 'missing_reversible_default'],
  ['the King reserves the **constitutional adjudicative authority to suspend or permanently remove a validator from validator office for good cause**', 'missing_good_cause_authority'],
  ['**insubordination** means material refusal or deliberate defiance of a valid constitutional directive within the validator\'s actual duty', 'missing_insubordination_definition'],
  ['The following are **not good cause by themselves**:', 'missing_not_good_cause'],
  ['the Sovereign personally dislikes the validator', 'missing_dislike_exclusion'],
  ['Permanent removal must not be arbitrary.', 'missing_nonarbitrary_removal'],
  ['**emergency suspension or quarantine**', 'missing_emergency_suspension'],
  ['This section grants constitutional decision authority. It does **not** itself execute a validator-set mutation', 'missing_decision_execution_separation'],
  ['the Crown may govern with **strict constitutional discipline**', 'missing_strict_discipline'],
  ['Strict discipline does not mean arbitrary punishment', 'missing_strictness_boundary'],
  ['does **not** establish DNA, genetic information, retinal scans, iris scans, or other biometrics as Sovereign authentication credentials', 'missing_deferred_biometrics'],
  ['does **not** define the final genealogical scope of the Sovereign\'s protected bloodline', 'missing_deferred_lineage'],
  ['*Peace first. Evidence before escalation. Discipline without arbitrariness. Propagate by consent.*', 'missing_closing_doctrine'],
]) {
  if (!doc.includes(needle)) fail(reason);
}

if (data.marker !== MARKER) fail('fixture_marker');
if (data.parent_instrument_marker !== PARENT) fail('fixture_parent');
if (data.parent_constitution_marker !== ROOT) fail('fixture_root');
if (data.version !== '1.0.0-draft') fail('fixture_version');
if (data.date !== '2026-08-18') fail('fixture_date');

const living = data.living_constitution;
if (living.expected_to_evolve !== true) fail('living_expected_to_evolve');
if (living.evolution_requires_valid_constitutional_amendment !== true) fail('living_formal_amendment');
if (living.conversation_or_custom_silently_changes_constitution !== false) fail('living_conversation_boundary');
if (living.ai_inference_silently_changes_constitution !== false) fail('living_ai_boundary');
if (living.repository_control_silently_changes_constitution !== false) fail('living_repo_boundary');
if (living.current_valid_text_remains_in_force_until_valid_amendment !== true) fail('living_current_rule');

const mission = data.long_range_mission;
if (mission.primary_long_range_objective !== 'peacefully_seed_and_propagate_void_and_constitution_beyond_earth_and_across_the_universe_as_physically_possible') fail('mission_objective');
if (mission.requires_voluntary_adoption !== true) fail('mission_voluntary');
if (mission.bounded_by_applicable_law_consent_non_harm_and_earth_protection !== true) fail('mission_boundaries');
for (const key of [
  'refusal_to_adopt_void_is_hostility',
  'authorizes_forced_adoption',
  'authorizes_conquest_or_coercive_colonization',
  'authorizes_deceptive_installation',
  'authorizes_malicious_or_uncontrolled_autonomous_replication',
  'itself_authorizes_launch_deploy_or_spending',
]) {
  if (mission[key] !== false) fail(`mission_boundary_${key}`);
}

const lawful = data.lawful_scope;
if (lawful.void_and_crown_follow_applicable_external_law !== true) fail('lawful_external_law');
if (lawful.repository_text_unilaterally_supersedes_external_civil_or_criminal_law !== false) fail('lawful_no_unilateral_supremacy');
if (lawful.broader_public_law_status_requires_lawful_legitimate_adoption_or_recognition !== true) fail('lawful_broader_status');
if (lawful.voluntary_participation_accepts_protocol_rules_within_lawful_scope !== true) fail('lawful_voluntary_scope');
if (lawful.voluntary_participation_surrenders_general_autonomy_property_citizenship_or_rights !== false) fail('lawful_rights_boundary');
if (lawful.sovereign_authority_is_ownership_of_participants !== false) fail('lawful_no_ownership');

const reciprocity = data.peaceful_reciprocity;
if (reciprocity.default_posture !== 'peaceful_cooperation_or_neutrality') fail('reciprocity_default');
for (const key of [
  'credible_threat_required_for_defensive_escalation',
  'evidence_based_threat_finding_required',
  'attribution_confidence_matters',
  'prefer_hardening_isolation_quarantine_and_lawful_containment',
  'least_escalatory_effective_lawful_response',
  'response_must_be_proportionate',
  'reciprocal_or_punitive_escalation_stops_when_threat_ends',
]) {
  if (reciprocity[key] !== true) fail(`reciprocity_required_${key}`);
}
for (const key of [
  'authorizes_revenge',
  'authorizes_collective_punishment',
  'authorizes_indiscriminate_retaliation',
  'criticism_competition_refusal_or_institutional_resistance_alone_is_threat',
  'hidden_coordination_may_be_assumed_without_evidence',
  'creates_independent_license_for_physical_force',
]) {
  if (reciprocity[key] !== false) fail(`reciprocity_boundary_${key}`);
}

const escalation = data.sovereign_ambiguity_escalation;
for (const key of [
  'current_rule_active_until_explicit_constitutional_amendment',
  'material_high_impact_ambiguity_escalates_to_sovereign',
  'materially_uncertain_threat_attribution_escalates_to_sovereign',
  'difficult_moral_conflict_escalates_to_sovereign',
  'irreversible_serious_harm_risk_escalates_to_sovereign',
  'urgent_without_guidance_defaults_to_reversible_protective_containment_within_existing_delegation',
]) {
  if (escalation[key] !== true) fail(`escalation_required_${key}`);
}
if (escalation.uncertainty_expands_delegated_authority !== false) fail('escalation_no_authority_expansion');
if (escalation.sovereign_decision_bypasses_law_constitution_rights_non_harm_or_proportionality !== false) fail('escalation_sovereign_boundary');
if (escalation.repository_text_overrides_external_ai_provider_policy !== false) fail('escalation_provider_boundary');

const removal = data.validator_good_cause;
if (removal.sovereign_has_constitutional_adjudicative_suspend_or_remove_authority_while_sovereign_held !== true) fail('removal_sovereign_authority');
if (removal.permanent_removal_requires_good_cause !== true) fail('removal_good_cause');
if (removal.good_cause_requires_material_evidence_supported_validator_duty_or_network_integrity_reason !== true) fail('removal_evidence');
for (const key of [
  'personal_dislike_is_good_cause',
  'personality_conflict_is_good_cause',
  'ordinary_disagreement_or_criticism_is_good_cause',
  'good_faith_constitutional_objection_is_insubordination',
  'reporting_suspected_wrongdoing_is_insubordination',
  'refusal_of_unlawful_unconstitutional_out_of_duty_or_unauthorized_act_is_insubordination',
  'emergency_suspension_itself_equals_permanent_removal',
  'sensitive_evidence_must_always_be_public',
  'this_addendum_executes_validator_mutation',
]) {
  if (removal[key] !== false) fail(`removal_boundary_${key}`);
}
for (const key of [
  'process_identifies_allegation_and_preserves_evidence_where_reasonably_possible',
  'meaningful_opportunity_to_answer_where_reasonably_possible',
  'final_determination_and_rationale_preserved',
  'emergency_suspension_allowed_for_credible_immediate_threat',
  'technical_validator_mutation_remains_separately_gated',
]) {
  if (removal[key] !== true) fail(`removal_process_${key}`);
}

const discipline = data.founding_stage_discipline;
if (discipline.strict_constitutional_enforcement_while_alignment_matures !== true) fail('discipline_strict');
if (discipline.rules_and_validator_duties_are_optional_because_network_is_young !== false) fail('discipline_rules_not_optional');
if (discipline.strictness_authorizes_arbitrary_punishment !== false) fail('discipline_no_arbitrary');
if (discipline.strictness_authorizes_cruelty_humiliation_or_retaliation_for_criticism !== false) fail('discipline_no_cruelty');
if (discipline.sovereign_and_delegates_remain_bound_by_evidence_law_proportionality_non_harm_and_rights !== true) fail('discipline_crown_bound');
if (discipline.maturity_silently_expands_delegated_authority !== false) fail('discipline_no_silent_maturity');
if (discipline.delegated_authority_may_expand_through_explicit_constitutional_instrument !== true) fail('discipline_explicit_delegation');

const deferred = data.deferred_questions;
for (const key of [
  'dna_or_genetic_information_is_current_sovereign_credential',
  'retinal_or_iris_scan_is_current_sovereign_credential',
  'biometrics_or_genetics_create_independent_constitutional_authority',
  'this_addendum_defines_final_bloodline_genealogical_scope',
  'this_addendum_designates_bloodline_successor',
  'genetic_relationship_itself_creates_constitutional_office',
]) {
  if (deferred[key] !== false) fail(`deferred_boundary_${key}`);
}
if (deferred.future_biometric_or_genetic_rule_requires_explicit_amendment_and_safeguards !== true) fail('deferred_future_safeguards');

for (const [key, value] of Object.entries(data.preserved_boundaries)) {
  if (value !== false) fail(`preserved_boundary_${key}`);
}

console.log('void_crown_living_constitution_peaceful_reciprocity_v1_proof=GREEN');
console.log('living_constitution_requires_formal_amendment=true');
console.log('primary_long_range_mission=peaceful_void_constitution_propagation_beyond_earth');
console.log('applicable_external_law_boundary=true');
console.log('peaceful_tit_for_tat=true');
console.log('threat_findings_require_evidence=true');
console.log('material_ambiguity_escalates_to_sovereign=true');
console.log('validator_permanent_removal_requires_good_cause=true');
console.log('personal_dislike_is_good_cause=false');
console.log('emergency_suspension_is_temporary=true');
console.log('strict_constitutional_discipline_not_arbitrary=true');
console.log('biometric_genetic_identity_deferred=true');
console.log('bloodline_scope_and_succession_deferred=true');
console.log('sensitive_technical_authority_activated=false');
