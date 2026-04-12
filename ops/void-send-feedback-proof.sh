#!/usr/bin/env bash
# Small proof for VOID send feedback wiring on the participant page.
set -euo pipefail
set +H
set +o histexpand

NODE_BASE="${NODE_BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-0xdf994e1b8c1ac9078c66892b589c8aa76c3be592}"
OUT="${OUT:-/tmp/void-send-feedback-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

curl -fsS "$NODE_BASE/participant?account=$ACCOUNT#wallet" > "$OUT/participant.html"

python3 - "$OUT/participant.html" <<'PY'
import json, pathlib, sys
html = pathlib.Path(sys.argv[1]).read_text()

checks = {
  "has_void_send_btn": 'id="voidSendBtn"' in html,
  "has_void_send_out": 'id="voidSendOut"' in html,
  "has_send_void_label": "Send VOID" in html,
  "has_wallet_not_connected_msg": 'VOID send unavailable. Connect a wallet first.' in html,
  "has_invalid_recipient_msg": 'Enter a valid recipient wallet before sending VOID.' in html,
  "has_invalid_amount_msg": 'Enter a valid VOID amount before sending.' in html,
  "has_zero_amount_msg": 'Enter a VOID amount greater than zero.' in html,
  "has_token_unavailable_msg": 'VOID send unavailable right now. Token metadata could not be loaded.' in html,
  "has_provider_missing_msg": 'VOID send unavailable. Wallet provider missing.' in html,
  "has_send_start_msg": 'Sending " + amountStr + " VOID to " + shortAddr(to) + "..."' in html,
  "has_send_submitted_msg": 'VOID send submitted • ' in html,
  "has_send_failed_msg": 'VOID send failed • ' in html,
  "clears_recipient_after_send": 'if (toInput) toInput.value = "";' in html,
  "resets_amount_after_send": 'if (amountInput) amountInput.value = "1";' in html,
}

missing = [k for k, v in checks.items() if not v]
print(json.dumps({"ok": not missing, "checks": checks, "missing": missing}, indent=2))
if missing:
    raise SystemExit(1)
PY

echo
echo "[ok] VOID send feedback proof green"
echo "out=$OUT"
