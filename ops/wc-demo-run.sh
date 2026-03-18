#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART="${ART:-/tmp/wc-demo-e2e-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$ART"

NODE_BASE="${NODE_BASE:-http://127.0.0.1:4100}"
HELPER_BASE="${HELPER_BASE:-}"
RELAYER_BASE="${RELAYER_BASE:-http://127.0.0.1:4313}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
RELAYER_HEALTH_PATH="${RELAYER_HEALTH_PATH:-/api/wc-relayer/v1/health}"
RELAYER_QUOTE_PATH="${RELAYER_QUOTE_PATH:-/api/wc-relayer/v1/quote}"
RELAYER_EXECUTE_PATH="${RELAYER_EXECUTE_PATH:-/api/wc-relayer/v1/execute}"
ACCOUNT="${ACCOUNT:-demo-user}"
WALLET="${WALLET:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
JOB_KIND="${JOB_KIND:-datanet_publish}"
PLAINTEXT="${PLAINTEXT:-wc-demo-e2e-$(date +%s)}"
TRADE_WC="${TRADE_WC:-1}"
MAX_POLLS="${MAX_POLLS:-20}"
POLL_SLEEP="${POLL_SLEEP:-1}"

have() { command -v "$1" >/dev/null 2>&1; }
need() { have "$1" || { echo "[fail] missing required command: $1" >&2; exit 1; }; }
need curl
need python3
need grep
need sed
need awk
need mktemp

json_get() {
  local file="$1" expr="$2"
  python3 - "$file" "$expr" <<'PY'
import json, sys
path, expr = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    obj = json.load(f)
cur = obj
for part in expr.split("."):
    if not part:
        continue
    if isinstance(cur, dict):
        cur = cur.get(part)
    else:
        cur = None
        break
if isinstance(cur, (dict, list)):
    print(json.dumps(cur))
elif cur is None:
    print("")
else:
    print(cur)
PY
}

fetch_json() {
  local url="$1" out="$2"
  curl -fsS "$url" > "$out"
}

fetch_post_json() {
  local url="$1" body="$2" out="$3"
  curl -fsS -H 'content-type: application/json' -d "$body" "$url" > "$out"
}

read_local_wc_state() {
  local account="$1" out="$2" ledger="$3" redeemed="$4"
  python3 - "$account" "$out" "$ledger" "$redeemed" <<'PY2'
import json, sys, pathlib
account, out, ledger, redeemed = sys.argv[1:]
earned = 0.0
count = 0
redeemed_amt = 0.0

lp = pathlib.Path(ledger)
rp = pathlib.Path(redeemed)

if lp.exists():
    for line in lp.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            j = json.loads(line)
        except Exception:
            continue
        if str(j.get("account", "")) != str(account):
            continue
        try:
            d = float(j.get("delta", 0) or 0)
        except Exception:
            d = 0.0
        if d > 0:
            earned += d
        count += 1

if rp.exists():
    for line in rp.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            j = json.loads(line)
        except Exception:
            continue
        if str(j.get("account", "")) != str(account):
            continue
        try:
            d = float(j.get("amount", 0) or 0)
        except Exception:
            d = 0.0
        if d > 0:
            redeemed_amt += d

earned = round(earned, 9)
redeemed_amt = round(redeemed_amt, 9)
redeemable = round(max(0.0, earned - redeemed_amt), 9)

obj = {
    "ok": True,
    "account": account,
    "balance": earned,
    "count": count,
    "earned": earned,
    "redeemed": redeemed_amt,
    "redeemable": redeemable,
    "ledger_file": str(lp),
    "redeemed_file": str(rp),
}
pathlib.Path(out).write_text(json.dumps(obj, indent=2), encoding="utf-8")
PY2
}

assert_url_ok() {
  local name="$1" url="$2" out="$3"
  if ! curl -fsS --max-time 5 "$url" > "$out"; then
    echo "[fail] $name not reachable: $url" >&2
    exit 1
  fi
  echo "[ok] $name reachable"
}

assert_port_open() {
  local name="$1" hostport="$2"
  python3 - "$name" "$hostport" <<'PY'
import socket, sys
name, hostport = sys.argv[1], sys.argv[2]
host, port = hostport.split(":")
s = socket.socket()
s.settimeout(2.0)
try:
    s.connect((host, int(port)))
    print(f"[ok] {name} port open: {hostport}")
except Exception:
    print(f"[fail] {name} port closed: {hostport}", file=sys.stderr)
    raise SystemExit(1)
finally:
    try: s.close()
    except Exception: pass
PY
}

assert_file_exists() {
  local f="$1"
  [ -f "$f" ] || { echo "[fail] missing file: $f" >&2; exit 1; }
  echo "[ok] file present: $f"
}

detect_helper_base() {
  if [ -n "${HELPER_BASE:-}" ]; then
    echo "$HELPER_BASE"
    return 0
  fi

  local wallet="$1"
  local cands=(
    "http://127.0.0.1:4312"
    "http://127.0.0.1:4312/workcredits/devnet"
  )

  local c
  for c in "${cands[@]}"; do
    if curl -fsS --max-time 3 "$c/workcredits/devnet/dashboard/$wallet.json" >/dev/null 2>&1; then
      echo "$c"
      return 0
    fi
  done

  echo "[fail] could not detect helper dashboard base on :4312" >&2
  echo "[hint] tried:" >&2
  printf '  %s\n' "${cands[@]}" >&2
  exit 1
}

num_assert_ge() {
  local lhs="$1" rhs="$2" msg="$3"
  python3 - "$lhs" "$rhs" "$msg" <<'PY'
import sys
lhs=float(sys.argv[1]); rhs=float(sys.argv[2]); msg=sys.argv[3]
if lhs + 1e-12 < rhs:
    print(f"[fail] {msg}: {lhs} < {rhs}", file=sys.stderr)
    raise SystemExit(1)
print(f"[ok] {msg}: {lhs} >= {rhs}")
PY
}

num_assert_gt() {
  local lhs="$1" rhs="$2" msg="$3"
  python3 - "$lhs" "$rhs" "$msg" <<'PY'
import sys
lhs=float(sys.argv[1]); rhs=float(sys.argv[2]); msg=sys.argv[3]
if lhs <= rhs:
    print(f"[fail] {msg}: {lhs} <= {rhs}", file=sys.stderr)
    raise SystemExit(1)
print(f"[ok] {msg}: {lhs} > {rhs}")
PY
}

num_assert_eqish() {
  local lhs="$1" rhs="$2" tol="$3" msg="$4"
  python3 - "$lhs" "$rhs" "$tol" "$msg" <<'PY'
import sys, math
lhs=float(sys.argv[1]); rhs=float(sys.argv[2]); tol=float(sys.argv[3]); msg=sys.argv[4]
if math.fabs(lhs-rhs) > tol:
    print(f"[fail] {msg}: |{lhs}-{rhs}| > {tol}", file=sys.stderr)
    raise SystemExit(1)
print(f"[ok] {msg}: {lhs} ~= {rhs} (tol={tol})")
PY
}

echo "=== [1] preflight ==="
assert_port_open "node" "127.0.0.1:4100"
assert_port_open "helper" "127.0.0.1:4312"
assert_port_open "relayer" "127.0.0.1:4313"
assert_port_open "anvil" "127.0.0.1:8545"

HELPER_BASE="$(detect_helper_base "$WALLET")"
echo "[ok] helper_base=$HELPER_BASE"
echo "[ok] relayer_health_path=$RELAYER_HEALTH_PATH"
echo "[ok] relayer_quote_path=$RELAYER_QUOTE_PATH"
echo "[ok] relayer_execute_path=$RELAYER_EXECUTE_PATH"

assert_url_ok "node health" "$NODE_BASE/health" "$ART/node-health.json"
assert_url_ok "helper dashboard" "$HELPER_BASE/workcredits/devnet/dashboard/$WALLET.json" "$ART/dashboard-before.json"

RELAYER_PREFLIGHT_BODY="$(python3 - "$ACCOUNT" "$WALLET" <<'PY2'
import json, sys
account, wallet = sys.argv[1], sys.argv[2]
print(json.dumps({
  "account": account,
  "wallet": wallet,
  "side": "wc_to_void",
  "amount": 1
}))
PY2
)"
if curl -fsS --max-time 10 "$RELAYER_BASE$RELAYER_HEALTH_PATH" > "$ART/relayer-health.json" 2>/dev/null; then
  RELAYER_HEALTH_OK="$(python3 - "$ART/relayer-health.json" <<'PY2'
import json, sys
j = json.load(open(sys.argv[1]))
print(str(j.get("ok", "")))
PY2
)"
  if [ "$RELAYER_HEALTH_OK" = "True" ] || [ "$RELAYER_HEALTH_OK" = "true" ]; then
    echo "[ok] relayer health reachable"
  else
    echo "[fail] relayer health replied but ok!=true ($RELAYER_BASE$RELAYER_HEALTH_PATH)" >&2
    cat "$ART/relayer-health.json" >&2 || true
    exit 1
  fi
else
  echo "[fail] relayer health not reachable at $RELAYER_BASE$RELAYER_HEALTH_PATH" >&2
  exit 1
fi

if curl -fsS --max-time 10 -H 'content-type: application/json' -d "$RELAYER_PREFLIGHT_BODY" "$RELAYER_BASE$RELAYER_QUOTE_PATH" > "$ART/relayer-quote-preflight.json" 2>/dev/null; then
  RELAYER_QUOTE_OK="$(python3 - "$ART/relayer-quote-preflight.json" <<'PY2'
import json, sys
j = json.load(open(sys.argv[1]))
print(str(j.get("ok", "")))
PY2
)"
  if [ "$RELAYER_QUOTE_OK" = "True" ] || [ "$RELAYER_QUOTE_OK" = "true" ]; then
    echo "[ok] relayer quote reachable"
  else
    echo "[fail] relayer quote replied but ok!=true ($RELAYER_BASE$RELAYER_QUOTE_PATH)" >&2
    cat "$ART/relayer-quote-preflight.json" >&2 || true
    exit 1
  fi
else
  echo "[fail] relayer quote not reachable at $RELAYER_BASE$RELAYER_QUOTE_PATH" >&2
  exit 1
fi

STATE_JSON="$ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json"
BROADCAST_JSON="$ROOT/broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json"
LEDGER_JSONL="$ROOT/data_a/wc_v1/ledger.jsonl"
REDEEMED_JSONL="$ROOT/data_a/wc_v1/redeemed.jsonl"

assert_file_exists "$STATE_JSON"
assert_file_exists "$BROADCAST_JSON"
assert_file_exists "$LEDGER_JSONL"
assert_file_exists "$REDEEMED_JSONL"

echo
echo "=== [2] baseline reads ==="
echo "[dbg] GET $NODE_BASE/health"
fetch_json "$NODE_BASE/health" "$ART/node-health.json"
echo "[dbg] GET $HELPER_BASE/workcredits/devnet/dashboard/$WALLET.json"
fetch_json "$HELPER_BASE/workcredits/devnet/dashboard/$WALLET.json" "$ART/dashboard-before.json"
echo "[dbg] READ ledger truth for $ACCOUNT"
read_local_wc_state "$ACCOUNT" "$ART/local-before.json" "$LEDGER_JSONL" "$REDEEMED_JSONL"
cp -f "$ART/local-before.json" "$ART/redeemable-before.json"

cat "$ART/node-health.json"
echo
cat "$ART/dashboard-before.json"
echo
cat "$ART/local-before.json"
echo
cat "$ART/redeemable-before.json"

BEFORE_EARNED="$(json_get "$ART/redeemable-before.json" "earned")"
BEFORE_REDEEMED="$(json_get "$ART/redeemable-before.json" "redeemed")"
BEFORE_REDEEMABLE="$(json_get "$ART/redeemable-before.json" "redeemable")"
BEFORE_BALANCE="$(json_get "$ART/local-before.json" "balance")"
BEFORE_COUNT="$(json_get "$ART/local-before.json" "count")"
BEFORE_VOID="$(json_get "$ART/dashboard-before.json" "account.balances.void")"
BEFORE_PENDING="$(json_get "$ART/dashboard-before.json" "account.earnings.pending_wc")"
BEFORE_HELPER_REDEEMED="$(json_get "$ART/dashboard-before.json" "account.earnings.redeemed_wc")"

num_assert_ge "${BEFORE_REDEEMABLE:-0}" "0" "baseline redeemable non-negative"

echo
echo "=== [3] submit job ==="
JOB_BODY="$(python3 - "$ACCOUNT" "$JOB_KIND" "$PLAINTEXT" <<'PY'
import json, sys
account, kind, plaintext = sys.argv[1], sys.argv[2], sys.argv[3]
print(json.dumps({
  "account": account,
  "kind": kind,
  "plaintext": plaintext
}))
PY
)"
fetch_post_json "$NODE_BASE/jobs/submit" "$JOB_BODY" "$ART/job-submit.json"
cat "$ART/job-submit.json"

JOB_ID="$(json_get "$ART/job-submit.json" "job.job_id")"
if [ -z "${JOB_ID:-}" ]; then
  JOB_ID="$(json_get "$ART/job-submit.json" "job.id")"
fi
if [ -z "${JOB_ID:-}" ]; then
  JOB_ID="$(json_get "$ART/job-submit.json" "id")"
fi
[ -n "${JOB_ID:-}" ] || { echo "[fail] missing job_id/id from job submit" >&2; exit 1; }
echo "[ok] job_id=$JOB_ID"

echo
echo
echo "=== [4] wait for completion via /jobs/:id ==="
DONE=0
for i in $(seq 1 "$MAX_POLLS"); do
  echo "--- poll $i/$MAX_POLLS"
  fetch_json "$NODE_BASE/jobs/$JOB_ID" "$ART/job-poll-$i.json"
  cat "$ART/job-poll-$i.json"
  STATUS="$(json_get "$ART/job-poll-$i.json" "job.status")"
  RECEIPT_ID="$(json_get "$ART/job-poll-$i.json" "job.receipt_id")"
  DATASET_ID="$(json_get "$ART/job-poll-$i.json" "job.dataset_id")"
  if [ -z "${STATUS:-}" ]; then STATUS="$(json_get "$ART/job-poll-$i.json" "status")"; fi
  echo "status=$STATUS receipt_id=$RECEIPT_ID dataset_id=$DATASET_ID"
  if [ "$STATUS" = "completed" ]; then
    cp -f "$ART/job-poll-$i.json" "$ART/job-completed.json"
    DONE=1
    break
  fi
  sleep "$POLL_SLEEP"
done
[ "$DONE" = "1" ] || { echo "[fail] job did not complete in time" >&2; exit 1; }

echo "=== [5] verify WC increased after job ==="
read_local_wc_state "$ACCOUNT" "$ART/local-after-job.json" "$LEDGER_JSONL" "$REDEEMED_JSONL"
cp -f "$ART/local-after-job.json" "$ART/redeemable-after-job.json"
fetch_json "$HELPER_BASE/workcredits/devnet/dashboard/$WALLET.json" "$ART/dashboard-after-job.json"
fetch_json "$NODE_BASE/receipts?account=$ACCOUNT&limit=20" "$ART/receipts-after-job.json"

cat "$ART/local-after-job.json"
echo
cat "$ART/redeemable-after-job.json"
echo
cat "$ART/dashboard-after-job.json"
echo
cat "$ART/receipts-after-job.json"

AFTER_JOB_BALANCE="$(json_get "$ART/local-after-job.json" "balance")"
AFTER_JOB_COUNT="$(json_get "$ART/local-after-job.json" "count")"
AFTER_JOB_EARNED="$(json_get "$ART/redeemable-after-job.json" "earned")"
AFTER_JOB_REDEEMED="$(json_get "$ART/redeemable-after-job.json" "redeemed")"
AFTER_JOB_REDEEMABLE="$(json_get "$ART/redeemable-after-job.json" "redeemable")"
AFTER_JOB_PENDING="$(json_get "$ART/dashboard-after-job.json" "account.earnings.pending_wc")"

num_assert_gt "${AFTER_JOB_BALANCE:-0}" "${BEFORE_BALANCE:-0}" "WC balance increased after job"
num_assert_gt "${AFTER_JOB_COUNT:-0}" "${BEFORE_COUNT:-0}" "ledger event count increased after job"
num_assert_gt "${AFTER_JOB_EARNED:-0}" "${BEFORE_EARNED:-0}" "earned WC increased after job"
num_assert_eqish "${AFTER_JOB_REDEEMED:-0}" "${BEFORE_REDEEMED:-0}" "0.000001" "redeemed unchanged after job"
num_assert_gt "${AFTER_JOB_REDEEMABLE:-0}" "${BEFORE_REDEEMABLE:-0}" "redeemable increased after job"
num_assert_gt "${AFTER_JOB_PENDING:-0}" "${BEFORE_PENDING:-0}" "helper pending WC increased after job"

echo
echo "=== [6] quote trade ==="
QUOTE_BODY="$(python3 - "$ACCOUNT" "$WALLET" "$TRADE_WC" <<'PY'
import json, sys
account, wallet, trade_wc = sys.argv[1], sys.argv[2], float(sys.argv[3])
print(json.dumps({
  "account": account,
  "wallet": wallet,
  "side": "wc_to_void",
  "amount": trade_wc
}))
PY
)"
fetch_post_json "$RELAYER_BASE$RELAYER_QUOTE_PATH" "$QUOTE_BODY" "$ART/quote.json"
cat "$ART/quote.json"

QUOTE_OK="$(json_get "$ART/quote.json" "ok")"
[ "$QUOTE_OK" = "True" ] || [ "$QUOTE_OK" = "true" ] || { echo "[fail] relayer quote not ok" >&2; exit 1; }

QUOTED_VOID="$(json_get "$ART/quote.json" "amount_out")"
POOL_WC_PER_VOID="$(json_get "$ART/quote.json" "pool_price.wc_per_void")"
num_assert_gt "${QUOTED_VOID:-0}" "0" "quoted VOID positive"
num_assert_gt "${POOL_WC_PER_VOID:-0}" "0" "pool wc_per_void positive"
num_assert_ge "${AFTER_JOB_REDEEMABLE:-0}" "${TRADE_WC:-0}" "redeemable covers requested trade"

echo
echo "=== [7] execute trade ==="
EXEC_BODY="$(python3 - "$ACCOUNT" "$WALLET" "$TRADE_WC" <<'PY'
import json, sys
account, wallet, trade_wc = sys.argv[1], sys.argv[2], float(sys.argv[3])
print(json.dumps({
  "account": account,
  "wallet": wallet,
  "side": "wc_to_void",
  "amount": trade_wc,
  "execute": True,
  "max_slippage_bps": 50
}))
PY
)"
fetch_post_json "$RELAYER_BASE$RELAYER_EXECUTE_PATH" "$EXEC_BODY" "$ART/execute.json"
cat "$ART/execute.json"

EXEC_OK="$(json_get "$ART/execute.json" "ok")"
[ "$EXEC_OK" = "True" ] || [ "$EXEC_OK" = "true" ] || { echo "[fail] relayer execute not ok" >&2; exit 1; }

APPROVE_TX="$(json_get "$ART/execute.json" "approve_tx.tx_hash")"
SWAP_TX="$(json_get "$ART/execute.json" "swap_tx.tx_hash")"
[ -n "${APPROVE_TX:-}" ] || { echo "[fail] missing approve tx hash" >&2; exit 1; }
[ -n "${SWAP_TX:-}" ] || { echo "[fail] missing swap tx hash" >&2; exit 1; }

echo "[ok] approve_tx=$APPROVE_TX"
echo "[ok] swap_tx=$SWAP_TX"

echo
echo "=== [8] verify post-trade state ==="
fetch_json "$HELPER_BASE/workcredits/devnet/dashboard/$WALLET.json" "$ART/dashboard-after-trade.json"
read_local_wc_state "$ACCOUNT" "$ART/redeemable-after-trade.json" "$LEDGER_JSONL" "$REDEEMED_JSONL"
cat "$ART/dashboard-after-trade.json"
echo
cat "$ART/redeemable-after-trade.json"

AFTER_TRADE_VOID="$(json_get "$ART/dashboard-after-trade.json" "account.balances.void")"
AFTER_TRADE_PENDING="$(json_get "$ART/dashboard-after-trade.json" "account.earnings.pending_wc")"
AFTER_TRADE_REDEEMED_HELPER="$(json_get "$ART/dashboard-after-trade.json" "account.earnings.redeemed_wc")"
AFTER_TRADE_EARNED="$(json_get "$ART/redeemable-after-trade.json" "earned")"
AFTER_TRADE_REDEEMED="$(json_get "$ART/redeemable-after-trade.json" "redeemed")"
AFTER_TRADE_REDEEMABLE="$(json_get "$ART/redeemable-after-trade.json" "redeemable")"

num_assert_gt "${AFTER_TRADE_VOID:-0}" "${BEFORE_VOID:-0}" "VOID balance increased after trade"
num_assert_lt_script="$(mktemp)"
cat > "$num_assert_lt_script" <<'PY'
import sys
lhs=float(sys.argv[1]); rhs=float(sys.argv[2]); msg=sys.argv[3]
if lhs >= rhs:
    print(f"[fail] {msg}: {lhs} >= {rhs}", file=sys.stderr)
    raise SystemExit(1)
print(f"[ok] {msg}: {lhs} < {rhs}")
PY
python3 "$num_assert_lt_script" "${AFTER_TRADE_PENDING:-0}" "${AFTER_JOB_PENDING:-0}" "pending WC decreased after trade"
python3 "$num_assert_lt_script" "${AFTER_TRADE_REDEEMABLE:-0}" "${AFTER_JOB_REDEEMABLE:-0}" "redeemable decreased after trade"
rm -f "$num_assert_lt_script"

num_assert_gt "${AFTER_TRADE_REDEEMED:-0}" "${AFTER_JOB_REDEEMED:-0}" "redeemed increased after trade"
num_assert_eqish "${AFTER_TRADE_EARNED:-0}" "${AFTER_JOB_EARNED:-0}" "0.000001" "earned unchanged by trade"

echo
echo "=== [9] summary ==="
python3 - "$ART" \
  "$JOB_ID" \
  "$APPROVE_TX" \
  "$SWAP_TX" \
  "$BEFORE_PENDING" \
  "$AFTER_JOB_PENDING" \
  "$AFTER_TRADE_PENDING" \
  "$BEFORE_REDEEMED" \
  "$AFTER_JOB_REDEEMED" \
  "$AFTER_TRADE_REDEEMED" \
  "$BEFORE_VOID" \
  "$AFTER_TRADE_VOID" <<'PY'
import json, sys
art, job_id, approve_tx, swap_tx, bpend, ajpend, atpend, bred, ajred, atred, bvoid, avoid = sys.argv[1:]
print(json.dumps({
  "ok": True,
  "job_id": job_id,
  "approve_tx_hash": approve_tx,
  "swap_tx_hash": swap_tx,
  "flow_before_pending_wc": float(bpend or 0),
  "flow_after_job_pending_wc": float(ajpend or 0),
  "flow_after_trade_pending_wc": float(atpend or 0),
  "flow_before_redeemed_wc": float(bred or 0),
  "flow_after_job_redeemed_wc": float(ajred or 0),
  "flow_after_trade_redeemed_wc": float(atred or 0),
  "before_void": float(bvoid or 0),
  "after_void": float(avoid or 0),
  "artifacts_dir": art
}, indent=2))
PY

echo
echo "[ok] demo artifacts: $ART"
