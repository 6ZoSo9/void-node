#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

HTML="/tmp/participant-public-ui-polish-proof.html"
TXT="/tmp/participant-public-ui-polish-proof.txt"

echo "=== participant public UI polish proof ==="
echo "mutation=false"
echo

echo "=== [1] source markers/copy ==="
grep -q 'VOID_HOME_PUBLIC_UI_POLISH_V1' src/index.ts
grep -q 'Start with Wallet. Then earn WC, use DataNet, create a guided Buy VOID request, or preview staking when ready.' src/index.ts
grep -q 'Earn WC through approved work, use DataNet, or create a guided Buy VOID request.' src/index.ts
grep -q 'Preview candidate/waiting status. Active validator admission stays gated.' src/index.ts
grep -q 'Wallet sends, swaps, VOID delivery, and active validator admission stay explicit and guarded.' src/index.ts
grep -q 'Mainnet-0 is public-live. Guided actions are available now; money-moving and active-validator paths stay explicit and guarded.' src/index.ts
grep -q 'guided Buy VOID request creation, and staking preview' src/index.ts
grep -q 'No blind deposits' src/index.ts
echo "[ok] source polish markers/copy present"
echo

echo "=== [2] build/restart/ready ==="
npm run build >/tmp/participant-public-ui-polish-build.log 2>&1
systemctl --user restart void-node.service
sleep 3
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > /tmp/participant-public-ui-polish-ready.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/participant-public-ui-polish-ready.json"))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY
echo

echo "=== [3] served participant copy ==="
curl -fsS --max-time 8 http://127.0.0.1:4100/participant > "$HTML"
python3 - <<'PY'
from pathlib import Path
import re

html = Path("/tmp/participant-public-ui-polish-proof.html").read_text(errors="replace")
text = re.sub(r"<[^>]+>", "\n", html)
text = re.sub(r"\n{2,}", "\n", text)

checks = [
    "VOID_HOME_PUBLIC_UI_POLISH_V1",
    "Start with Wallet. Then earn WC, use DataNet, create a guided Buy VOID request, or preview staking when ready.",
    "Earn WC through approved work, use DataNet, or create a guided Buy VOID request.",
    "Preview candidate/waiting status. Active validator admission stays gated.",
    "swap WC to VOID",
    "Wallet sends, swaps, VOID delivery, and active validator admission stay explicit and guarded.",
    "Mainnet-0 is public-live. Guided actions are available now; money-moving and active-validator paths stay explicit and guarded.",
    "Safe now:",
    "Guarded:",
    "No blind deposits",
    "payment confirmation is not VOID fulfillment",
    "Public Registration ≠ Active Validator Admission",
]

missing = [c for c in checks if c not in html and c not in text]
if missing:
    print("[ERR] missing served copy:")
    for m in missing:
        print(" -", m)
    raise SystemExit(1)

Path("/tmp/participant-public-ui-polish-proof.txt").write_text(text)
print("[ok] served participant public polish copy present")
PY
echo

echo "=== [4] backstop proofs ==="
make participant-first-user-clarity-proof
make public-first60-user-journey-proof
make mainnet0-public-communications-stack-proof
make mainnet0-status-smoke
echo

echo "=== [5] no unsafe promotional claims in touched source ==="
if grep -RInE '(guaranteed return|guaranteed profit|risk-free|moon|100x|financial advice|payment confirmation automatically sends VOID)' src/index.ts; then
  echo "[ERR] unsafe promotional claim found"
  exit 1
fi
echo "[ok] unsafe promotional claims absent"
echo

echo "=== [6] summary ==="
python3 - <<'PY'
summary = {
  "participant_public_ui_polish_v1": "green",
  "wallet_first": True,
  "safe_now_copy": True,
  "guarded_copy": True,
  "guided_actions": True,
  "no_blind_deposits": True,
  "public_communications_stack": "green",
  "buy_void_fulfillment": False,
  "validator_mutation": False,
}
print(summary)
PY

echo "[ok] participant public UI polish proof passed"
