#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-public-discovery-closeout-rollup-html-card-runtime-visibility-hold-v1"
MARKER="VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

INDEX="public/public-node/datanet/index.json"
CARD="public/public-node/datanet/${BRICK}.json"
DOC="docs/public-node/datanet/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"
SRC_HTML="public/public-node/datanet/datanet-public-discovery-closeout-rollup-html-card-hold-v1.html"
SRC_JSON="public/public-node/datanet/datanet-public-discovery-closeout-rollup-html-card-hold-v1.json"
ROLLUP="public/public-node/datanet/datanet-public-discovery-closeout-rollup-hold-v1.json"

echo "== files/json =="
test -f "$INDEX"
test -f "$CARD"
test -f "$DOC"
test -f "$SRC_HTML"
test -f "$SRC_JSON"
test -f "$ROLLUP"
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$SRC_JSON" >/dev/null
python3 -m json.tool "$ROLLUP" >/dev/null
echo "files_json_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-public-discovery-closeout-rollup-html-card-runtime-visibility-hold-v1"
marker = "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

idx = json.loads(Path("public/public-node/datanet/index.json").read_text())
card = json.loads(Path(f"public/public-node/datanet/{brick}.json").read_text())
html = Path("public/public-node/datanet/datanet-public-discovery-closeout-rollup-html-card-hold-v1.html").read_text()
rollup = json.loads(Path("public/public-node/datanet/datanet-public-discovery-closeout-rollup-hold-v1.json").read_text())

entries = {e["id"]: e for e in idx["entries"]}
assert brick in entries
e = entries[brick]

assert e["status"] == "hold"
assert e["path"] == f"/public-node/datanet/{brick}.json"
assert e["runtime_visibility_hold_only"] is True
assert e["runtime_fetch_optional"] is True
assert e["runtime_fetch_success_required"] is False
assert e["public_safe"] is True
assert e["read_only"] is True
assert e["discovery_only"] is True
assert e["marker"] == marker

assert card["schema"] == "void.public_node.datanet.public_discovery_closeout_rollup_html_card_runtime_visibility.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker

policy = card["visibility_policy"]
assert policy["runtime_server_required_for_green"] is False
assert policy["local_runtime_fetch_optional"] is True
assert policy["local_runtime_not_seen_static_html_remains_green"] is True
assert policy["runtime_fetch_success_required"] is False
assert policy["runtime_mutation_route_enabled"] is False
assert policy["mutation_handler_enabled"] is False

state = card["visibility_state"]
assert state["source_static_html_present"] is True
assert state["source_static_json_present"] is True
assert state["closeout_rollup_json_present"] is True
assert state["runtime_fetch_required"] is False
assert state["runtime_fetch_success_required"] is False

false_keys = [
  "public_intake_enabled", "upload_enabled", "object_write_enabled",
  "mirror_command_enabled", "peer_pin_command_enabled",
  "wc_claim_enabled", "wc_issuance_enabled",
  "runtime_mutation_route_enabled", "mutation_handler_enabled"
]
for k in false_keys:
    assert e[k] is False, k
    assert state[k] is False, k

assert state["wallet_or_signer_accessed"] is False
assert rollup["marker"] == "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1"
assert "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1" in html

print("datanet_public_discovery_closeout_rollup_html_card_runtime_visibility_binding_green=true")
PY

echo "== optional runtime fetch =="
mkdir -p .runtime/mainnet0
BASE="${BASE:-http://127.0.0.1:${HTTP_PORT:-4100}}"
OUT=".runtime/mainnet0/${BRICK}.runtime-fetch.html"
set +e
curl -fsS --max-time 5 "$BASE/public-node/datanet/datanet-public-discovery-closeout-rollup-html-card-hold-v1.html" > "$OUT"
RC="$?"
set -e
if [ "$RC" = "0" ]; then
  grep -F "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1" "$OUT" >/dev/null
  echo "runtime_fetch_optional_available=true"
else
  echo "runtime_fetch_optional_available=false"
  echo "runtime_fetch_optional_rc=$RC"
fi
echo "runtime_fetch_optional_green=true"

echo "== component proof =="
bash ops/mainnet0/void-datanet-public-discovery-closeout-rollup-html-card-hold-v1-proof.sh >/tmp/void-datanet-closeout-rollup-html-runtime-source-proof.log 2>&1
grep -F "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1_GREEN" /tmp/void-datanet-closeout-rollup-html-runtime-source-proof.log >/dev/null
echo "component_proof_stack_green=true"

echo "== marker/forbidden =="
grep -R "$MARKER" "$INDEX" "$CARD" "$DOC" "$PROOF" >/dev/null
grep -RInE '"public_intake_enabled": true|"upload_enabled": true|"object_write_enabled": true|"runtime_mutation_route_enabled": true|"mutation_handler_enabled": true|"wallet_or_signer_required": true|"wallet_or_signer_accessed": true' "$INDEX" "$CARD" "$DOC" \
  && { echo "forbidden_enablement_scan_green=false"; exit 1; } \
  || echo "forbidden_enablement_scan_green=true"

echo "== result =="
echo "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN"
