#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="/tmp/public-node-first-external-tester-wc-operator-decision-packet-proof-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | tail -n 1 || true)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_UI_V1" src/index.ts
grep -Fq "publicNodeFirstExternalTesterWcOperatorDecisionPacketCard" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_V1" docs/public/public-node-first-external-tester-wc-operator-decision-packet.md

echo "source_markers_green=true"

curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-operator-decision-packet.json" > "$OUT/operator-decision-packet.json"
curl -fsS "$LOCAL_BASE/public-node" > "$OUT/public-node.html"
curl -fsS "$LOCAL_BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS "$LOCAL_BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl -fsS "$LOCAL_BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"

python3 - "$OUT/operator-decision-packet.json" "$OUT/route-index.json" "$OUT/self-check-snapshot.json" "$OUT/route-manifest.json" <<'PYJSON'
import json
import sys
from pathlib import Path

packet = json.loads(Path(sys.argv[1]).read_text())
route_index = json.loads(Path(sys.argv[2]).read_text())
self_check = json.loads(Path(sys.argv[3]).read_text())
route_manifest = json.loads(Path(sys.argv[4]).read_text())

path = "/public-node/first-external-tester-wc-operator-decision-packet.json"

assert packet["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_V1"
assert packet["route_marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_ROUTE_V1"
assert packet["packet_state"] == "template_only_no_operator_decision_created"
assert packet["candidate_status"] == "pending_operator_review"
assert packet["allowed_decision_states"] == ["accepted", "rejected", "deferred"]
assert packet["current_decision_state"] == "not_decided"

template = packet["packet_template"]
assert template["decision_state"] == "not_decided"
assert template["wc_delta_if_accepted"] is None
assert template["ledger_write_separate_step"] is True

boundary = packet["safety_boundary"]
for key in [
    "operator_decision_created_now",
    "review_record_created_now",
    "award_created_now",
    "wc_ledger_mutated_now",
    "wc_decision_record_write",
    "wc_review_record_write",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
    "automatic_ledger_write_allowed",
    "public_upload",
    "trusted_as_network_truth",
]:
    assert boundary[key] is False, (key, boundary[key])
assert boundary["wc_credit_delta_now"] == 0

blob = "\n".join([
    json.dumps(route_index, sort_keys=True),
    json.dumps(self_check, sort_keys=True),
    json.dumps(route_manifest, sort_keys=True),
])
assert path in blob
assert "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_V1" in blob
PYJSON

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeFirstExternalTesterWcOperatorDecisionPacketCard" "$OUT/public-node.html"
grep -Fq "First External Tester Operator Decision Packet" "$OUT/public-node.html"
grep -Fq "template_only_no_operator_decision_created" "$OUT/public-node.html"
grep -Fq "/public-node/first-external-tester-wc-operator-decision-packet.json" "$OUT/public-node.html"

echo "route=/public-node/first-external-tester-wc-operator-decision-packet.json"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_UI_V1"
echo "card_id=publicNodeFirstExternalTesterWcOperatorDecisionPacketCard"
echo "packet_state=template_only_no_operator_decision_created"
echo "operator_decision_created_now=false"
echo "review_record_created_now=false"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "automatic_ledger_write_allowed=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_PROOF_V1_GREEN"
