#!/usr/bin/env bash

DOC="docs/governance/void-constitutional-authority-boundary-v1.md"
FIXTURE="fixtures/governance/void-constitutional-authority-boundary-v1.json"
MARKER="VOID_CONSTITUTIONAL_AUTHORITY_BOUNDARY_V1_PHASE0_DRAFT"

fail() {
  echo "void_constitutional_authority_boundary_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$FIXTURE" ] || fail "missing_fixture"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$FIXTURE" || fail "missing_marker_fixture"

grep -Fq "constraint-only; no authority activated" "$DOC" || fail "missing_constraint_status"
grep -Fq "Current Phase: Phase 0" "$DOC" || fail "missing_current_phase"
grep -Fq "Validator contest authority is not active yet." "$DOC" || fail "missing_validator_contest_inactive"
grep -Fq "Validator quorum is not active yet." "$DOC" || fail "missing_validator_quorum_inactive"
grep -Fq "Public mutation authority is not active." "$DOC" || fail "missing_public_mutation_inactive"
grep -Fq "Signer/wallet authority is not granted." "$DOC" || fail "missing_signer_wallet_inactive"
grep -Fq "Execution authority is not granted." "$DOC" || fail "missing_execution_inactive"

grep -Fq "Authority must be legible, typed, bounded, and contestable at every layer." "$DOC" || fail "missing_authority_spine"
grep -Fq "Validators are not just infrastructure. Validators are protected witnesses to VOID truth." "$DOC" || fail "missing_protected_witnesses"
grep -Fq "Constitutional authority may stop the machine. It may not secretly become the machine." "$DOC" || fail "missing_constitutional_limit"
grep -Fq "Emergency authority can preserve truth, pause risk, and force review. It cannot create ordinary truth without validator-visible process." "$DOC" || fail "missing_emergency_rule"

grep -Fq "The break-glass authority is a brake, not a steering wheel." "$DOC" || fail "missing_break_glass_brake"
grep -Fq "Phase 0 objections do not hard-block founder/operator action." "$DOC" || fail "missing_phase0_objection_boundary"
grep -Fq "An amendment to this document does not itself activate any authority." "$DOC" || fail "missing_amendment_boundary"

python3 - "$FIXTURE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == "VOID_CONSTITUTIONAL_AUTHORITY_BOUNDARY_V1_PHASE0_DRAFT"
assert data["current_phase"]["phase"] == 0
assert data["current_phase"]["validator_contest_authority_active"] is False
assert data["current_phase"]["validator_quorum_active"] is False
assert data["current_phase"]["public_mutation_authority_active"] is False
assert data["current_phase"]["signer_or_wallet_access_granted"] is False
assert data["current_phase"]["execution_authority_granted"] is False
assert data["authority_boundary"]["constraint_only"] is True
assert data["authority_boundary"]["activates_new_authority"] is False
assert data["authority_boundary"]["creates_validator_quorum"] is False
assert data["authority_boundary"]["enables_public_mutation"] is False
assert data["authority_boundary"]["authorizes_execution"] is False
assert data["authority_boundary"]["grants_signer_wallet_access"] is False
assert data["authority_boundary"]["moves_funds"] is False
assert data["authority_boundary"]["mutates_ledgers"] is False

print("fixture_json_green=true")
PY

echo "void_constitutional_authority_boundary_v1_proof=GREEN marker=$MARKER"
