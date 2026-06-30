#!/usr/bin/env bash
set -euo pipefail

ROOT_INDEX="public/public-node/index.json"
RECORD="public/public-node/mainnet0-public-node-operator-reviewer-stack-closeout-audit-rollup-hold-v1.json"
HANDOFF="public/public-node/mainnet0-public-node-operator-reviewer-handoff-pack-hold-v1.json"
FINAL="public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.json"
FINAL_HTML="public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.html"
INDEX_LINK="public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.json"
DOC="docs/public-node/mainnet0-public-node-operator-reviewer-stack-closeout-audit-rollup-hold-v1.md"

echo "== JSON parse =="
python3 - <<'PY2'
import json
from pathlib import Path
for path in [
    "public/public-node/index.json",
    "public/public-node/mainnet0-public-node-operator-reviewer-stack-closeout-audit-rollup-hold-v1.json",
    "public/public-node/mainnet0-public-node-operator-reviewer-handoff-pack-hold-v1.json",
    "public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.json",
    "public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.json",
]:
    json.loads(Path(path).read_text())
print("json_green=true")
PY2

echo "== source chain binding =="
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

record = json.loads(Path("public/public-node/mainnet0-public-node-operator-reviewer-stack-closeout-audit-rollup-hold-v1.json").read_text())
handoff = json.loads(Path("public/public-node/mainnet0-public-node-operator-reviewer-handoff-pack-hold-v1.json").read_text())
final = json.loads(Path("public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.json").read_text())
index_link = json.loads(Path("public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-index-link-hold-v1.json").read_text())
final_html = Path("public/public-node/mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1.html")

assert record["source_chain"]["reviewer_handoff_pack"]["marker"] in set(walk_strings(handoff))
assert record["source_chain"]["reviewer_final_seal"]["marker"] in set(walk_strings(final))
assert record["source_chain"]["reviewer_final_seal_index_link"]["marker"] in set(walk_strings(index_link))
assert final_html.exists()
assert final_html.stat().st_size > 0
print("source_chain_binding_green=true")
PY2

echo "== closeout audit binding =="
python3 - <<'PY2'
import json
from pathlib import Path
root = json.loads(Path("public/public-node/index.json").read_text())
record = json.loads(Path("public/public-node/mainnet0-public-node-operator-reviewer-stack-closeout-audit-rollup-hold-v1.json").read_text())
entry = root["mainnet0_public_node_operator_reviewer_stack_closeout_audit_rollup"]

assert record["marker"] == "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_REVIEWER_STACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
assert record["route"] == "/public-node/mainnet0-public-node-operator-reviewer-stack-closeout-audit-rollup-hold-v1.json"
assert entry["marker"] == "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_REVIEWER_STACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
assert entry["route"] == "/public-node/mainnet0-public-node-operator-reviewer-stack-closeout-audit-rollup-hold-v1.json"

audit = record["closeout_audit"]
assert audit["reviewer_handoff_pack_present"] is True
assert audit["reviewer_final_seal_present"] is True
assert audit["reviewer_final_seal_html_present"] is True
assert audit["reviewer_final_seal_index_link_present"] is True
assert audit["root_public_node_discovery_present"] is True
assert audit["operator_reviewer_stack_state"] == "public_visible_read_only_closeout_audited"

print("operator_reviewer_stack_closeout_audit_rollup_binding_green=true")
PY2

echo "== marker presence =="
grep -R "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_REVIEWER_STACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1" "$ROOT_INDEX" "$RECORD" "$DOC" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/mainnet0-public-node-operator-reviewer-stack-closeout-audit-rollup-hold-v1.json").read_text())
for key, value in record["boundary"].items():
    if key in ("public_safe", "read_only", "definition_only", "closeout_audit_only"):
        assert value is True, key
    else:
        assert value is False, key
print("forbidden_enablement_scan_green=true")
PY2

echo "== result =="
echo "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_REVIEWER_STACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
