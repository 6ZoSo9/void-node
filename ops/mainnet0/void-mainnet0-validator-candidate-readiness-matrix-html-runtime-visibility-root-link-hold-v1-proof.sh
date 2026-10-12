#!/usr/bin/env bash
set -euo pipefail

ROOT_INDEX="public/public-node/index.json"
RECORD="public/public-node/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.json"
DOC="docs/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.md"

echo "== JSON parse =="
python3 - <<'PY2'
import json
from pathlib import Path
for path in [
    "public/public-node/index.json",
    "public/public-node/validators/index.json",
    "public/public-node/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.json",
    "public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json",
    "public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.json",
]:
    json.loads(Path(path).read_text())
print("json_green=true")
PY2

echo "== source runtime binding =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.json").read_text())
runtime = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json").read_text())
validators = json.loads(Path("public/public-node/validators/index.json").read_text())
assert record["source_runtime_visibility"]["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1"
assert runtime["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1"
assert validators["mainnet0_validator_candidate_readiness_matrix_html_runtime_visibility"]["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_HOLD_V1"
assert record["source_runtime_visibility"]["route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json"
print("source_runtime_visibility_binding_green=true")
PY2

echo "== source html card binding =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.json").read_text())
card = json.loads(Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.json").read_text())
assert record["source_html_card"]["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1"
assert card["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1"
assert record["source_html_card"]["route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.html"
print("source_html_card_binding_green=true")
PY2

echo "== root link binding =="
python3 - <<'PY2'
import json
from pathlib import Path
root = json.loads(Path("public/public-node/index.json").read_text())
record = json.loads(Path("public/public-node/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.json").read_text())
entry = root["mainnet0_validator_candidate_readiness_matrix_html_runtime_visibility_root_link"]
assert record["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_ROOT_LINK_HOLD_V1"
assert record["route"] == "/public-node/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.json"
assert entry["marker"] == "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_ROOT_LINK_HOLD_V1"
assert entry["route"] == "/public-node/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.json"
assert entry["source_runtime_visibility_route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-hold-v1.json"
assert record["root_discovery"]["preferred_reviewer_route"] == "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.html"
print("validator_candidate_readiness_matrix_html_runtime_visibility_root_link_binding_green=true")
PY2

echo "== marker presence =="
grep -R "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_ROOT_LINK_HOLD_V1" "$ROOT_INDEX" "$RECORD" "$DOC" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/mainnet0-validator-candidate-readiness-matrix-html-runtime-visibility-root-link-hold-v1.json").read_text())
boundary = record["boundary"]
for key, value in boundary.items():
    if key in ("public_safe", "read_only", "definition_only", "root_link_only"):
        assert value is True, key
    else:
        assert value is False, key
print("forbidden_enablement_scan_green=true")
PY2

echo "== result =="
echo "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_RUNTIME_VISIBILITY_ROOT_LINK_HOLD_V1_GREEN"
