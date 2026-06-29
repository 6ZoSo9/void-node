#!/usr/bin/env bash
set -euo pipefail

RUNTIME="public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json"
INDEX="public/public-node/validators/index.json"
MATRIX="public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json"
CARD_JSON="public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.json"
CARD_HTML="public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.html"
DOC="docs/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.md"
MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1"
MATRIX_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1"
CARD_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1"
SECTION_KEY="mainnet0_validator_candidate_readiness_matrix_html_runtime_visibility"

echo "== JSON parse =="
python3 - <<'PY2'
import json
from pathlib import Path
for path in [
    "public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json",
    "public/public-node/validators/index.json",
    "public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json",
    "public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.json",
]:
    json.loads(Path(path).read_text())
print("json_green=true")
PY2

echo "== source matrix binding =="
python3 - <<'PY2'
import json
from pathlib import Path
runtime = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json").read_text())
matrix = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json").read_text())
assert runtime["source_matrix"]["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1"
assert matrix["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1"
assert runtime["source_matrix"]["route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json"
print("source_matrix_binding_green=true")
PY2

echo "== source html card binding =="
python3 - <<'PY2'
import json
from pathlib import Path
runtime = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json").read_text())
card = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.json").read_text())
html = Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.html").read_text()
assert runtime["source_html_card"]["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1"
assert card["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1"
assert runtime["source_html_card"]["html_route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.html"
assert "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1" in html or "candidate readiness matrix" in html.lower()
print("source_html_card_binding_green=true")
PY2

echo "== runtime visibility binding =="
python3 - <<'PY2'
import json
from pathlib import Path
idx = json.loads(Path("public/public-node/validators/index.json").read_text())
runtime = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json").read_text())
entry = idx["mainnet0_validator_candidate_readiness_matrix_html_runtime_visibility"]
assert runtime["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1"
assert runtime["route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json"
assert runtime["runtime_visibility"]["browser_visible_route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.html"
assert runtime["runtime_visibility"]["mutation_state"] == "read_only"
assert entry["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1"
assert entry["route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json"
print("validator_candidate_readiness_matrix_html_runtime_visibility_binding_green=true")
PY2

echo "== marker presence =="
grep -R "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1" \
  "$RUNTIME" \
  "$INDEX" \
  "$DOC" \
  "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PY2'
import json
from pathlib import Path
runtime = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json").read_text())
boundary = runtime["boundary"]
for key, value in boundary.items():
    if key == "public_safe":
        assert value is True
    elif key == "read_only":
        assert value is True
    elif key == "definition_only":
        assert value is True
    else:
        assert value is False, key
rv = runtime["runtime_visibility"]
assert rv["candidate_intake_state"] == "not_open"
assert rv["stake_lock_state"] == "not_enabled"
assert rv["wallet_connect_state"] == "not_enabled"
assert rv["active_validator_admission_state"] == "not_enabled"
assert rv["epoch_activation_state"] == "not_enabled"
assert rv["validator_set_write_state"] == "not_enabled"
print("forbidden_enablement_scan_green=true")
PY2

echo "== result =="
echo "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1_GREEN"
