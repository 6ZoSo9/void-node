#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

VF_ROOT="${VF_ROOT:-/home/voidfresh/dev/void-node}"
BASE="${BASE:-http://127.0.0.1:4110}"
WC_BASE="${WC_BASE:-http://127.0.0.1:4314/workcredits/devnet}"
A_ADDR="${A_ADDR:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
B_ADDR="${B_ADDR:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478}"

fail() { echo "FAIL: $*" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"; }

need curl
need python3
need sudo

echo "=== [0] health ==="
curl -fsS --max-time 5 "${BASE}/health" | sed -n '1,120p'
echo
curl -fsS --max-time 5 "${WC_BASE}/pool.json" | sed -n '1,160p'
echo

echo "=== [1] reset isolated receipt + ledger ==="
sudo -u voidfresh bash <<INNER
set -euo pipefail
mkdir -p "$VF_ROOT/data_a/wc_v1" "$VF_ROOT/data_a/datanet/receipts"
: > "$VF_ROOT/data_a/wc_v1/ledger.jsonl"
rm -f "$VF_ROOT/data_a/wc_v1/redeemed.jsonl"
: > "$VF_ROOT/data_a/datanet/receipts/datanet.jsonl"
ls -lah "$VF_ROOT/data_a/wc_v1/ledger.jsonl" "$VF_ROOT/data_a/datanet/receipts/datanet.jsonl"
INNER

echo
echo "=== [2] run isolated demo for wallet A ==="
sudo -u voidfresh env \
  BASE="$BASE" \
  MAIN_BASE="$BASE" \
  WC_BASE="$WC_BASE" \
  WC_ADDR="$A_ADDR" \
  bash "$VF_ROOT/ops/full-demo-smoke.sh"

echo
echo "=== [3] account jsons ==="
A_JSON="$(curl -fsS --max-time 8 "${WC_BASE}/account/${A_ADDR}.json")"
B_JSON="$(curl -fsS --max-time 8 "${WC_BASE}/account/${B_ADDR}.json")"

echo "--- wallet A ---"
printf '%s\n' "$A_JSON" | sed -n '1,220p'
echo
echo "--- wallet B ---"
printf '%s\n' "$B_JSON" | sed -n '1,220p'
echo

echo "=== [4] isolated ledger truth ==="
sudo -u voidfresh tail -n 20 "$VF_ROOT/data_a/wc_v1/ledger.jsonl"
echo
echo "=== [5] isolated receipts truth ==="
sudo -u voidfresh tail -n 20 "$VF_ROOT/data_a/datanet/receipts/datanet.jsonl" || true
echo

echo "=== [6] assert wallet-specific award ==="
python3 - <<'PY' "$A_JSON" "$B_JSON" "$A_ADDR" "$B_ADDR"
import json, sys
a = json.loads(sys.argv[1])
b = json.loads(sys.argv[2])
a_addr = sys.argv[3].lower()
b_addr = sys.argv[4].lower()

def get_num(obj, path, default=None):
    cur = obj
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur

a_pending = get_num(a, ["earnings", "pending_wc"], -1)
a_local = get_num(a, ["earnings", "local_earned_wc"], -1)
a_events = get_num(a, ["earnings", "local_ledger_events"], -1)
b_pending = get_num(b, ["earnings", "pending_wc"], -1)
b_local = get_num(b, ["earnings", "local_earned_wc"], -1)
b_events = get_num(b, ["earnings", "local_ledger_events"], -1)

errors = []
if str(a.get("address","")).lower() != a_addr:
    errors.append(f"wallet A address mismatch: {a.get('address')}")
if str(b.get("address","")).lower() != b_addr:
    errors.append(f"wallet B address mismatch: {b.get('address')}")
if not (a_pending == 1 and a_local == 1 and a_events >= 1):
    errors.append(f"wallet A expected pending/local/events = 1/1/>=1 but got {a_pending}/{a_local}/{a_events}")
if not (b_pending == 0 and b_local == 0 and b_events == 0):
    errors.append(f"wallet B expected pending/local/events = 0/0/0 but got {b_pending}/{b_local}/{b_events}")

if errors:
    print("ASSERT FAIL")
    for e in errors:
        print("-", e)
    sys.exit(1)

print("ASSERT OK")
print("wallet A earned 1 WC; wallet B earned 0 WC")
PY

echo
echo "=== [7] PASS ==="
