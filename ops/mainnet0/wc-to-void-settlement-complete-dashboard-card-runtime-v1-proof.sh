#!/usr/bin/env bash
set -euo pipefail

echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_RUNTIME_V1_PROOF_BEGIN"

src="src/index.ts"
marker="VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_RUNTIME_V1"
known_live_anchor="VOID_WC_TO_VOID_CLOSEOUT_SEAL_DASHBOARD_LINK_V1"
tx="0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"

test -f "$src"

grep -F "$known_live_anchor" "$src" >/dev/null
grep -F "$marker" "$src" >/dev/null
grep -F "WC → VOID Settlement Complete" "$src" >/dev/null
grep -F "sealed_live_index_ready" "$src" >/dev/null
grep -F "$tx" "$src" >/dev/null
grep -F "/public-node/wc-to-void/settlement-evidence-final-public-index-v1" "$src" >/dev/null
grep -F "/public-node/wc-to-void/settlement-evidence-final-public-index-v1.json" "$src" >/dev/null
grep -F "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1" "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path

s = Path("src/index.ts").read_text()
anchor = "VOID_WC_TO_VOID_CLOSEOUT_SEAL_DASHBOARD_LINK_V1"
marker = "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_RUNTIME_V1"

ai = s.find(anchor)
mi = s.find(marker)

assert ai >= 0, "missing known live anchor"
assert mi >= 0, "missing runtime card marker"
assert mi > ai, "runtime card should be inserted after known live anchor"
assert mi - ai < 8000, "runtime card is too far from known live dashboard card anchor"
PY

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_RUNTIME_V1_ASSERT_GREEN"
echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_RUNTIME_V1_PROOF_GREEN"
