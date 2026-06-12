#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Proof Mode Status Card Live Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"

test -x ops/mainnet0/public-node-proof-mode-status-card-source-proof.sh
test -x ops/mainnet0/public-node-precision-only-storm-baseline-proof.sh
test -x ops/mainnet0/public-node-alienware-rejoin-runbook-proof.sh

curl -fsS --max-time 8 "$BASE/__void/ready.json" > /tmp/void-proof-mode-status-ready.json
curl -fsS --max-time 8 "$BASE/public-node" > /tmp/void-proof-mode-status-public-node.html

grep -Fq "publicNodeProofModeStatusCard" /tmp/void-proof-mode-status-public-node.html
grep -Fq "VOID_PUBLIC_NODE_PROOF_MODE_STATUS_UI_V1" /tmp/void-proof-mode-status-public-node.html
grep -Fq "Proof Mode Status" /tmp/void-proof-mode-status-public-node.html
grep -Fq "Precision-only green" /tmp/void-proof-mode-status-public-node.html
grep -Fq "Alienware is temporarily offline after a storm" /tmp/void-proof-mode-status-public-node.html
grep -Fq "cross-box confirmation is pending" /tmp/void-proof-mode-status-public-node.html
grep -Fq "ckpt-public-node-precision-only-storm-baseline-green-20260612-084430" /tmp/void-proof-mode-status-public-node.html
grep -Fq "ckpt-public-node-alienware-rejoin-runbook-green-20260612-085138" /tmp/void-proof-mode-status-public-node.html
grep -Fq "Precision-only green / Alienware deferred / cross-box pending" /tmp/void-proof-mode-status-public-node.html
grep -Fq "not yet re-confirmed cross-box" /tmp/void-proof-mode-status-public-node.html

python3 - <<'PY'
import json
from pathlib import Path

ready = json.loads(Path("/tmp/void-proof-mode-status-ready.json").read_text())
html = Path("/tmp/void-proof-mode-status-public-node.html").read_text()

assert ready.get("ready") is True, ready
assert ready.get("gap") == 0, ready

proof = html.index("publicNodeProofModeStatusCard")
demo = html.index("publicNodeLocalDataDropHumanDemoTopCard")
assert proof < demo, "proof mode status should appear before the public demo"

assert "cross-box green" not in html[proof:proof + 1200].replace("not yet re-confirmed cross-box", ""), "card must not overclaim cross-box green"

print("validated_precision_ready=true")
print("validated_proof_mode_status_card_live=true")
print("validated_proof_mode_before_demo=true")
print("validated_no_crossbox_overclaim=true")
PY

bash ops/mainnet0/public-node-proof-mode-status-card-source-proof.sh
bash ops/mainnet0/public-node-precision-only-storm-baseline-proof.sh
bash ops/mainnet0/public-node-alienware-rejoin-runbook-proof.sh

echo "VOID_PUBLIC_NODE_PROOF_MODE_STATUS_CARD_LIVE_V1_GREEN"
