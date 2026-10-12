#!/usr/bin/env bash
set -euo pipefail

INDEX="public/public-node/validators/index.json"
ROOT_INDEX="public/public-node/index.json"
RECORD="public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-closeout-audit-rollup-hold-v1.json"
DOC="docs/public-node/validators/mainnet0-validator-candidate-readiness-matrix-closeout-audit-rollup-hold-v1.md"

echo "== JSON parse =="
python3 - <<'PY2'
import json
from pathlib import Path
for path in [
    "public/public-node/validators/index.json",
    "public/public-node/index.json",
    "public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-closeout-audit-rollup-hold-v1.json",
    "public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json",
    "public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.json",
    "public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json",
    "public/public-node/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.json",
]:
    json.loads(Path(path).read_text())
print("json_green=true")
PY2

echo "== source chain binding =="
python3 - <<'PY2'
import json
from pathlib import Path

record = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-closeout-audit-rollup-hold-v1.json").read_text())
matrix = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json").read_text())
card = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.json").read_text())
runtime = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json").read_text())
root_link = json.loads(Path("public/public-node/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.json").read_text())
root_index = json.loads(Path("public/public-node/index.json").read_text())

assert record["source_chain"]["matrix"]["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1"
assert matrix["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1"

assert record["source_chain"]["html_card"]["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1"
assert card["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1"

assert record["source_chain"]["runtime_visibility"]["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1"
assert runtime["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1"

assert record["source_chain"]["root_link"]["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_ROOT_LINK_HOLD_V1"
assert root_link["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_ROOT_LINK_HOLD_V1"
assert root_index["mainnet0_validator_candidate_readiness_matrix_html_runtime_visibility_root_link"]["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_ROOT_LINK_HOLD_V1"

print("source_chain_binding_green=true")
PY2

echo "== closeout audit binding =="
python3 - <<'PY2'
import json
from pathlib import Path
idx = json.loads(Path("public/public-node/validators/index.json").read_text())
record = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-closeout-audit-rollup-hold-v1.json").read_text())
entry = idx["mainnet0_validator_candidate_readiness_matrix_closeout_audit_rollup"]

assert record["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
assert record["route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-closeout-audit-rollup-hold-v1.json"
assert entry["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
assert entry["route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-closeout-audit-rollup-hold-v1.json"

audit = record["closeout_audit"]
assert audit["matrix_record_present"] is True
assert audit["browser_visible_html_card_present"] is True
assert audit["runtime_visibility_record_present"] is True
assert audit["root_discovery_link_present"] is True
assert audit["candidate_readiness_lane_state"] == "public_visible_read_only_closeout_audited"

print("validator_candidate_readiness_matrix_closeout_audit_rollup_binding_green=true")
PY2

echo "== marker presence =="
grep -R "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1" "$INDEX" "$RECORD" "$DOC" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-closeout-audit-rollup-hold-v1.json").read_text())
boundary = record["boundary"]
for key, value in boundary.items():
    if key in ("public_safe", "read_only", "definition_only", "audit_rollup_only"):
        assert value is True, key
    else:
        assert value is False, key
print("forbidden_enablement_scan_green=true")
PY2

echo "== result =="
echo "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
