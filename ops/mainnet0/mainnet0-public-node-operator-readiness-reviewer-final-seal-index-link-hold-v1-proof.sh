#!/usr/bin/env bash
set -euo pipefail

ROOT_INDEX="public/public-node/index.json"
RECORD="public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.json"
SOURCE_JSON="public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.json"
SOURCE_HTML="public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.html"
DOC="docs/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.md"

echo "== JSON parse =="
python3 - <<'PY2'
import json
from pathlib import Path
for path in [
    "public/public-node/index.json",
    "public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.json",
    "public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.json",
]:
    json.loads(Path(path).read_text())
print("json_green=true")
PY2

echo "== source reviewer final seal binding =="
python3 - <<'PY2'
import json
from pathlib import Path

def walk_strings(obj):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for value in obj.values():
            yield from walk_strings(value)
    elif isinstance(obj, list):
        for value in obj:
            yield from walk_strings(value)

record = json.loads(Path("public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.json").read_text())
source = json.loads(Path("public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.json").read_text())
html_path = Path("public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.html")
source_marker = record["source_reviewer_final_seal"]["marker"]

assert source_marker in set(walk_strings(source))
assert record["source_reviewer_final_seal"]["json_route"] == "/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.json"
assert record["source_reviewer_final_seal"]["html_route"] == "/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.html"
assert html_path.exists()
assert html_path.stat().st_size > 0
print("source_reviewer_final_seal_binding_green=true")
PY2

echo "== root index binding =="
python3 - <<'PY2'
import json
from pathlib import Path
root = json.loads(Path("public/public-node/index.json").read_text())
record = json.loads(Path("public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.json").read_text())
entry = root["mainnet0_public_node_operator_readiness_reviewer_final_seal_index_link"]
assert record["marker"] == "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_REVIEWER_FINAL_SEAL_INDEX_LINK_HOLD_V1"
assert record["route"] == "/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.json"
assert entry["marker"] == "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_REVIEWER_FINAL_SEAL_INDEX_LINK_HOLD_V1"
assert entry["route"] == "/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.json"
assert entry["source_reviewer_final_seal_route"] == "/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.json"
assert entry["preferred_reviewer_html_route"] == "/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.html"
assert entry["source_reviewer_final_seal_marker"] == record["source_reviewer_final_seal"]["marker"]
print("operator_readiness_reviewer_final_seal_index_link_binding_green=true")
PY2

echo "== marker presence =="
grep -R "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_REVIEWER_FINAL_SEAL_INDEX_LINK_HOLD_V1" "$ROOT_INDEX" "$RECORD" "$DOC" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.json").read_text())
for key, value in record["boundary"].items():
    if key in ("public_safe", "read_only", "definition_only", "index_link_only"):
        assert value is True, key
    else:
        assert value is False, key
print("forbidden_enablement_scan_green=true")
PY2

echo "== result =="
echo "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_REVIEWER_FINAL_SEAL_INDEX_LINK_HOLD_V1_GREEN"
