#!/usr/bin/env bash
set -euo pipefail

DOC="docs/governance/void-constitutional-authority-boundary-v1.md"
FIXTURE="fixtures/governance/void-constitutional-authority-boundary-v1.json"
MARKER="VOID_CONSTITUTIONAL_AUTHORITY_BOUNDARY_V1_PHASE0_DRAFT"
ALIGNMENT_MARKER="VOID_CONSTITUTIONAL_SOVEREIGN_SUCCESSION_ALIGNMENT_V1_20260816"

fail() {
  echo "void_constitutional_authority_boundary_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$FIXTURE" ] || fail "missing_fixture"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$FIXTURE" || fail "missing_marker_fixture"
grep -Fq "$ALIGNMENT_MARKER" "$DOC" || fail "missing_alignment_marker_doc"
grep -Fq "$ALIGNMENT_MARKER" "$FIXTURE" || fail "missing_alignment_marker_fixture"

grep -Fq "constraint-only; no authority activated" "$DOC" || fail "missing_constraint_status"
grep -Fq "Current Phase: Phase 0" "$DOC" || fail "missing_current_phase"
grep -Fq "Validator contest authority is not active yet." "$DOC" || fail "missing_validator_contest_inactive"
grep -Fq "Validator quorum is not active yet." "$DOC" || fail "missing_validator_quorum_inactive"
grep -Fq "Public mutation authority is not active." "$DOC" || fail "missing_public_mutation_inactive"
grep -Fq "Signer/wallet authority is not granted." "$DOC" || fail "missing_signer_wallet_inactive"
grep -Fq "Execution authority is not granted." "$DOC" || fail "missing_execution_inactive"

grep -Fq "ZoSo remains VOID's Sovereign for life unless a separately evidenced successor designation personally authorized by ZoSo takes effect." "$DOC" || fail "missing_lifetime_sovereignty"
grep -Fq "No successor is designated by this document." "$DOC" || fail "missing_no_successor_designated"
grep -Fq "The protected validator body, or a successor selected through a future validator-governed succession process, is the current preferred direction for eventual succession." "$DOC" || fail "missing_preferred_validator_succession_direction"
grep -Fq "Delegation is not succession. Automation is not sovereignty. Technical control is not constitutional ownership." "$DOC" || fail "missing_delegation_succession_separation"

grep -Fq "Authority must be legible, typed, bounded, and contestable at every layer." "$DOC" || fail "missing_authority_spine"
grep -Fq "Validators are not just infrastructure. Validators are protected witnesses to VOID truth." "$DOC" || fail "missing_protected_witnesses"
grep -Fq "Constitutional authority may stop the machine. It may not secretly become the machine." "$DOC" || fail "missing_constitutional_limit"
grep -Fq "Emergency authority can preserve truth, pause risk, and force review. It cannot create ordinary truth without validator-visible process." "$DOC" || fail "missing_emergency_rule"
grep -Fq "VOID's operational independence from outside gatekeepers, investors, platforms, or operators must not be reinterpreted as constitutional independence from ZoSo while ZoSo remains Sovereign." "$DOC" || fail "missing_sovereign_independence_boundary"

grep -Fq "The eventual constitutional validator maximum is **144,000**." "$DOC" || fail "missing_validator_maximum"
grep -Fq "The 144,000 ceiling is a long-horizon constitutional maximum only." "$DOC" || fail "missing_validator_ceiling_non_activation"
grep -Fq "General participant governance may not silently override validator-specific constitutional protections, duties, or admission rules." "$DOC" || fail "missing_validator_protection_boundary"

grep -Fq "This delegation is governance of network participation and protocol behavior, not ownership of people." "$DOC" || fail "missing_non_ownership_boundary"
grep -Fq "Validators are outside this general participant-governance delegation except where their own validator charter or an explicit constitutional instrument says otherwise." "$DOC" || fail "missing_validator_delegation_exclusion"

grep -Fq "VOID governance succession and personal inheritance are separate legal and constitutional questions." "$DOC" || fail "missing_succession_inheritance_separation"
grep -Fq "A future VOID successor does not automatically receive ZoSo's personal assets" "$DOC" || fail "missing_successor_asset_separation"
grep -Fq "ZoSo's expressed estate direction is that legally personal assets, equity, intellectual-property interests, and other personal economic interests should pass toward ZoSo's family or bloodline through valid external estate instruments and applicable law." "$DOC" || fail "missing_family_estate_direction"
grep -Fq "Family inheritance does not automatically confer VOID constitutional succession." "$DOC" || fail "missing_family_not_auto_successor"
grep -Fq "This repository document does not itself transfer legal title" "$DOC" || fail "missing_no_legal_title_transfer"

grep -Fq "No authority created or described by this constitution authorizes killing, physical harm, coercive violence, or deprivation of human rights." "$DOC" || fail "missing_human_non_harm"
grep -Fq "No authority created or described by this constitution authorizes intentional harm to the Earth, the sea, ecosystems, or shared environmental resources." "$DOC" || fail "missing_environment_non_harm"

grep -Fq "The break-glass authority is a brake, not a steering wheel." "$DOC" || fail "missing_break_glass_brake"
grep -Fq "Phase 0 objections do not hard-block founder/operator action." "$DOC" || fail "missing_phase0_objection_boundary"
grep -Fq "An amendment to this document does not itself activate any authority." "$DOC" || fail "missing_amendment_boundary"
grep -Fq "Phase 5 — Succession-ready constitutional state." "$DOC" || fail "missing_phase5_succession_ready"
grep -Fq "Phase progression alone never transfers sovereignty." "$DOC" || fail "missing_phase_progression_boundary"

python3 - "$FIXTURE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == "VOID_CONSTITUTIONAL_AUTHORITY_BOUNDARY_V1_PHASE0_DRAFT"
assert data["alignment_marker"] == "VOID_CONSTITUTIONAL_SOVEREIGN_SUCCESSION_ALIGNMENT_V1_20260816"
assert data["version"] == "1.1.0-draft"
assert data["date"] == "2026-08-16"

assert data["current_phase"]["phase"] == 0
assert data["current_phase"]["validator_contest_authority_active"] is False
assert data["current_phase"]["validator_quorum_active"] is False
assert data["current_phase"]["public_mutation_authority_active"] is False
assert data["current_phase"]["signer_or_wallet_access_granted"] is False
assert data["current_phase"]["execution_authority_granted"] is False

continuity = data["sovereign_continuity"]
assert continuity["sovereign"] == "ZoSo"
assert continuity["lifetime_governance"] is True
assert continuity["effective_successor_designated"] is False
assert continuity["preferred_successor_direction"] == "protected_validator_body_or_future_validator_selected_successor"
assert continuity["preferred_successor_direction_is_automatic"] is False
assert continuity["silent_transfer_forbidden"] is True
assert {
    "validator_quorum",
    "ai_autonomy",
    "inactivity",
    "maturity_milestone",
    "phase_transition",
    "company_or_entity_structure",
    "source_code_change",
    "repository_control",
    "signer_possession",
    "infrastructure_or_technical_control",
}.issubset(set(continuity["silent_transfer_forbidden_triggers"]))

validators = data["validators"]
assert validators["protected_witnesses"] is True
assert validators["constitutional_maximum"] == 144000
assert validators["ceiling_auto_admits_validators"] is False
assert validators["ceiling_changes_current_operational_limits"] is False
assert validators["ceiling_activates_validator_authority"] is False
assert validators["validator_specific_sovereign_charter_allowed"] is True
assert validators["general_participant_governance_may_silently_override_validator_charter"] is False

delegated = data["delegated_ai_governance"]
assert delegated["scope"] == "voluntary_non_validator_void_participation"
assert delegated["subordinate_to_sovereign"] is True
assert delegated["ownership_of_people"] is False
assert delegated["real_world_political_authority"] is False
assert delegated["surveillance_entitlement"] is False
assert delegated["coercive_enforcement_authority"] is False
assert delegated["physical_control_authority"] is False
assert delegated["permission_to_violate_law_or_human_rights"] is False

succession = data["succession_and_inheritance"]
assert succession["delegation_is_succession"] is False
assert succession["automation_is_sovereignty"] is False
assert succession["technical_control_is_constitutional_ownership"] is False
assert succession["governance_succession_separate_from_personal_inheritance"] is True
assert succession["future_void_successor_auto_inherits_personal_assets"] is False
assert succession["family_inheritance_auto_confers_void_sovereignty"] is False
assert succession["repository_document_transfers_legal_title"] is False
assert succession["repository_document_is_will_or_trust"] is False
assert succession["repository_document_moves_assets"] is False

non_harm = data["non_harm"]
assert non_harm["authorizes_killing_or_physical_harm"] is False
assert non_harm["authorizes_coercive_violence"] is False
assert non_harm["authorizes_harm_to_earth_or_sea"] is False
assert non_harm["displaces_applicable_law_or_human_rights"] is False

authority = data["authority_boundary"]
assert authority["constraint_only"] is True
assert authority["activates_new_authority"] is False
assert authority["transfers_authority"] is False
assert authority["creates_validator_quorum"] is False
assert authority["enables_public_mutation"] is False
assert authority["authorizes_execution"] is False
assert authority["grants_signer_wallet_access"] is False
assert authority["moves_funds"] is False
assert authority["mutates_ledgers"] is False
assert authority["executes_succession"] is False
assert authority["transfers_assets"] is False

assert data["phase_ladder"][-1] == "Phase 5 — Succession-ready constitutional state"
assert data["phase_progression_transfers_sovereignty"] is False

print("fixture_json_green=true")
print("sovereign_lifetime_continuity=true")
print("effective_successor_designated=false")
print("constitutional_validator_maximum=144000")
print("delegated_nonvalidator_governance_subordinate=true")
print("succession_inheritance_separated=true")
print("non_harm_boundary=true")
PY

echo "void_constitutional_authority_boundary_v1_proof=GREEN marker=$MARKER alignment_marker=$ALIGNMENT_MARKER"
