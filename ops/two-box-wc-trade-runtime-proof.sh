#!/usr/bin/env bash
# Canonical wallet/trade participant flow-surface proof.
# Verifies two-box runtime truth plus the participant Wallet/Trade UI surfaces
# for send WC, prepare WC, and trade WC->VOID on matched local/remote code.
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ACCOUNT="${ACCOUNT:-0xdf994e1b8c1ac9078c66892b589c8aa76c3be592}"
OUT="${OUT:-/tmp/two-box-wc-trade-runtime-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== [1] local baseline ==="
git branch --show-current | tee "$OUT/local-branch.txt"
git rev-parse --short HEAD | tee "$OUT/local-head.txt"

echo
echo "=== [2] local node/helper/relayer truth ==="
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/ready.json | tee "$OUT/local-ready.json"
echo
curl -fsS --max-time 10 http://127.0.0.1:4312/workcredits/devnet/pool.json | tee "$OUT/local-pool.json"
echo
curl -fsS --max-time 10 http://127.0.0.1:4313/api/wc-relayer/v1/health | tee "$OUT/local-relayer-health.json"
echo
curl -fsS --max-time 10 "http://127.0.0.1:4312/workcredits/devnet/account/$ACCOUNT.json" | tee "$OUT/local-account.json" || true

echo
echo "=== [3] remote node/helper/relayer truth ==="
ssh "$ALIEN" "
set -euo pipefail
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/ready.json
echo
curl -fsS --max-time 10 http://127.0.0.1:4312/workcredits/devnet/pool.json
echo
curl -fsS --max-time 10 http://127.0.0.1:4313/api/wc-relayer/v1/health
echo
curl -fsS --max-time 10 'http://127.0.0.1:4312/workcredits/devnet/account/$ACCOUNT.json' || true
" | tee "$OUT/remote-runtime.txt"

echo
echo
echo "=== [4] participant wallet/trade flow surfaces ==="
curl -fsS --max-time 15 "http://127.0.0.1:4100/participant?account=$ACCOUNT#trade" > "$OUT/local-participant-trade.html"
ssh "$ALIEN" "set -euo pipefail; curl -fsS --max-time 15 'http://127.0.0.1:4100/participant?account=$ACCOUNT#trade'" > "$OUT/remote-participant-trade.html"

python3 - "$OUT/local-participant-trade.html" "$OUT/remote-participant-trade.html" "$ACCOUNT" <<'PY'
import pathlib, sys, json

local_html = pathlib.Path(sys.argv[1]).read_text()
remote_html = pathlib.Path(sys.argv[2]).read_text()
account = sys.argv[3]

def check(html):
    return {
        "has_account_bootstrap": ('window.__void_participant_account_qs=' + json.dumps(account)) in html,
        "has_trade_header": "Trade WC for VOID" in html,
        "has_prepare_header": "Prepare WC" in html,
        "has_send_wc_button": 'id="sendWcBtn"' in html and "Send WC" in html,
        "has_prepare_wc_button": 'id="redeemBtn"' in html and "Prepare WC" in html,
        "has_trade_execute_button": 'id="tradeExecuteBtn"' in html,
        "has_send_out": 'id="sendOut"' in html,
        "has_redeem_out": 'id="redeemOut"' in html,
        "has_trade_out": 'id="tradeOut"' in html,
        "has_latest_action_card": 'id="latestActionCard"' in html,
        "has_use_max_trade": 'id="tradeUseRedeemableBtn"' in html and "Use Max" in html,
        "has_use_max_redeem": 'id="redeemMaxBtn"' in html and "Use Max" in html,
        "has_send_success_text": "WC sent successfully." in html,
        "has_prepare_success_text": "WC prepared for trading. Opening the Trade tab now." in html,
        "has_trade_ready_text": "Ready to trade WC for VOID." in html,
        "has_prepare_ready_text": "Ready to redeem WC for trade." in html,
        "has_trade_unavailable_text": "Trade unavailable: relayer is offline." in html,
        "has_trade_need_prepare_text": "No WC is ready to trade yet. Earn WC first, then prepare it." in html,
        "has_prepare_summary": "Prepare WC here first, then trade it in the Trade tab." in html,
    }

checks = {
    "local": check(local_html),
    "remote": check(remote_html),
}
print(json.dumps(checks, indent=2))

for side, obj in checks.items():
    missing = [k for k, v in obj.items() if not v]
    assert not missing, {side: missing}
PY

echo "=== [5] compact runtime summary ==="
python3 - "$OUT" <<'PY'
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])

local_ready = json.loads((out / "local-ready.json").read_text())
local_pool = json.loads((out / "local-pool.json").read_text())
local_relayer = json.loads((out / "local-relayer-health.json").read_text())
remote_txt = (out / "remote-runtime.txt").read_text()

objs = []
buf = ""
depth = 0
started = False
for ch in remote_txt:
    if ch == "{":
        depth += 1
        started = True
    if started:
        buf += ch
    if ch == "}":
        depth -= 1
        if started and depth == 0:
            objs.append(buf)
            buf = ""
            started = False

remote_ready = json.loads(objs[0]) if len(objs) > 0 else {}
remote_pool = json.loads(objs[1]) if len(objs) > 1 else {}
remote_relayer = json.loads(objs[2]) if len(objs) > 2 else {}

summary = {
    "local_ready": local_ready.get("ready"),
    "remote_ready": remote_ready.get("ready"),
    "local_gap": local_ready.get("gap"),
    "remote_gap": remote_ready.get("gap"),
    "local_pool_ok": local_pool.get("ok", True),
    "remote_pool_ok": remote_pool.get("ok", True),
    "local_relayer_ok": local_relayer.get("ok"),
    "remote_relayer_ok": remote_relayer.get("ok"),
    "local_relayer_node_base": local_relayer.get("node_base"),
    "remote_relayer_node_base": remote_relayer.get("node_base"),
}
print(json.dumps(summary, indent=2))

assert summary["local_ready"] is True, summary
assert summary["remote_ready"] is True, summary
assert summary["local_gap"] == 0, summary
assert summary["remote_gap"] == 0, summary
assert summary["local_relayer_ok"] is True, summary
assert summary["remote_relayer_ok"] is True, summary
PY

echo
echo "[ok] two-box wallet/trade flow-surface proof green"
echo "out=$OUT"
