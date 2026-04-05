#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ACCOUNT="${ACCOUNT:-0xdf994e1b8c1ac9078c66892b589c8aa76c3be592}"
OUT="${OUT:-/tmp/two-box-wc-state-parity-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== [1] local truth ==="
curl -fsS --max-time 10 http://127.0.0.1:4312/workcredits/devnet/pool.json | tee "$OUT/local-pool.json"
echo
curl -fsS --max-time 10 http://127.0.0.1:4313/api/wc-relayer/v1/health | tee "$OUT/local-relayer.json"
echo
curl -fsS --max-time 10 "http://127.0.0.1:4312/workcredits/devnet/account/$ACCOUNT.json" | tee "$OUT/local-account.json" || true
echo
test -f docs/VOID-DEVNET-PROTOCOL-STATE.json && sha256sum docs/VOID-DEVNET-PROTOCOL-STATE.json | tee "$OUT/local-state-json.sha256" || true
test -f broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json && sha256sum broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json | tee "$OUT/local-broadcast.sha256" || true
test -f data_a/wc_v1/ledger.jsonl && sha256sum data_a/wc_v1/ledger.jsonl | tee "$OUT/local-ledger.sha256" || true
test -f data_a/wc_v1/redeemed.jsonl && sha256sum data_a/wc_v1/redeemed.jsonl | tee "$OUT/local-redeemed.sha256" || true

echo
echo "=== [2] remote truth ==="
ssh "$ALIEN" '
set -euo pipefail
curl -fsS --max-time 10 http://127.0.0.1:4312/workcredits/devnet/pool.json
echo
curl -fsS --max-time 10 http://127.0.0.1:4313/api/wc-relayer/v1/health
echo
curl -fsS --max-time 10 "http://127.0.0.1:4312/workcredits/devnet/account/'"$ACCOUNT"'.json" || true
echo
test -f "$HOME/dev/void-node/docs/VOID-DEVNET-PROTOCOL-STATE.json" && sha256sum "$HOME/dev/void-node/docs/VOID-DEVNET-PROTOCOL-STATE.json" || true
echo
test -f "$HOME/dev/void-node/broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json" && sha256sum "$HOME/dev/void-node/broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json" || true
echo
test -f "$HOME/dev/void-node/data_a/wc_v1/ledger.jsonl" && sha256sum "$HOME/dev/void-node/data_a/wc_v1/ledger.jsonl" || true
echo
test -f "$HOME/dev/void-node/data_a/wc_v1/redeemed.jsonl" && sha256sum "$HOME/dev/void-node/data_a/wc_v1/redeemed.jsonl" || true
' | tee "$OUT/remote-truth.txt"

echo
echo "=== [3] compact parity summary ==="
python3 - "$OUT" <<'PY'
import json, pathlib, sys

out = pathlib.Path(sys.argv[1])

local_pool = json.loads((out / "local-pool.json").read_text())
local_relayer = json.loads((out / "local-relayer.json").read_text())
local_account = json.loads((out / "local-account.json").read_text()) if (out / "local-account.json").exists() else {}

remote_txt = (out / "remote-truth.txt").read_text()
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

remote_pool = json.loads(objs[0]) if len(objs) > 0 else {}
remote_relayer = json.loads(objs[1]) if len(objs) > 1 else {}
remote_account = json.loads(objs[2]) if len(objs) > 2 else {}

summary = {
    "local_pool_address": ((local_pool.get("pool") or {}).get("address")),
    "remote_pool_address": ((remote_pool.get("pool") or {}).get("address")),
    "local_pool_rpc": ((local_pool.get("pool") or {}).get("rpcUrl")),
    "remote_pool_rpc": ((remote_pool.get("pool") or {}).get("rpcUrl")),
    "local_void_reserve": (((local_pool.get("reserves") or {}).get("void"))),
    "remote_void_reserve": (((remote_pool.get("reserves") or {}).get("void"))),
    "local_wc_reserve": (((local_pool.get("reserves") or {}).get("wc"))),
    "remote_wc_reserve": (((remote_pool.get("reserves") or {}).get("wc"))),
    "local_relayer_pool": local_relayer.get("pool"),
    "remote_relayer_pool": remote_relayer.get("pool"),
    "local_relayer_wc_token": local_relayer.get("wc_token"),
    "remote_relayer_wc_token": remote_relayer.get("wc_token"),
    "local_relayer_void_token": local_relayer.get("void_token"),
    "remote_relayer_void_token": remote_relayer.get("void_token"),
    "local_account_void": (((local_account.get("balances") or {}).get("void"))),
    "remote_account_void": (((remote_account.get("balances") or {}).get("void"))),
    "local_account_wc": (((local_account.get("balances") or {}).get("wc"))),
    "remote_account_wc": (((remote_account.get("balances") or {}).get("wc"))),
}
print(json.dumps(summary, indent=2))

same_addresses = (
    summary["local_pool_address"] == summary["remote_pool_address"] and
    summary["local_relayer_pool"] == summary["remote_relayer_pool"] and
    summary["local_relayer_wc_token"] == summary["remote_relayer_wc_token"] and
    summary["local_relayer_void_token"] == summary["remote_relayer_void_token"]
)
same_reserves = (
    summary["local_void_reserve"] == summary["remote_void_reserve"] and
    summary["local_wc_reserve"] == summary["remote_wc_reserve"]
)

print()
print("same_addresses=" + str(same_addresses).lower())
print("same_reserves=" + str(same_reserves).lower())
if not same_addresses or not same_reserves:
    print("[warn] WC/devnet state parity is not aligned across boxes")
else:
    print("[ok] WC/devnet state parity aligned across boxes")
PY

echo
echo "=== [4] save artifact list ==="
find "$OUT" -maxdepth 1 -type f | sort

echo
echo "out=$OUT"
