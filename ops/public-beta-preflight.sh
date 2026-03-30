#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE_MAIN="${BASE_MAIN:-http://127.0.0.1:4100}"
BASE_ISO="${BASE_ISO:-http://127.0.0.1:4110}"
WC_BASE_ISO="${WC_BASE_ISO:-http://127.0.0.1:4314/workcredits/devnet}"
WALLET_IDENTITY_ACCOUNT="${WALLET_IDENTITY_ACCOUNT:-}"
WALLET_IDENTITY_WALLET="${WALLET_IDENTITY_WALLET:-}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "FAIL: missing $1" >&2; exit 1; }; }
need curl
need python3
need make

echo "=== [0] main node health ==="
curl -fsS --max-time 5 "${BASE_MAIN}/health" | sed -n '1,120p' || {
  echo "FAIL: main node health failed at ${BASE_MAIN}" >&2
  exit 1
}
echo

echo "=== [1] isolated node health ==="
curl -fsS --max-time 5 "${BASE_ISO}/health" | sed -n '1,120p' || {
  echo "FAIL: isolated node health failed at ${BASE_ISO}" >&2
  exit 1
}
echo

echo "=== [2] isolated helper pool ==="
curl -fsS --max-time 5 "${WC_BASE_ISO}/pool.json" | sed -n '1,180p' || {
  echo "FAIL: isolated helper pool failed at ${WC_BASE_ISO}" >&2
  exit 1
}
echo

echo "=== [3] isolated per-wallet WC proof ==="
make wc-wallet-proof
echo

echo "=== [4] wallet-identity participant smoke ==="
if [ -z "${WALLET_IDENTITY_ACCOUNT}" ]; then
  echo "FAIL: WALLET_IDENTITY_ACCOUNT is required for wallet beta-path preflight" >&2
  exit 1
fi
if [ -z "${WALLET_IDENTITY_WALLET}" ]; then
  WALLET_IDENTITY_WALLET="${WALLET_IDENTITY_ACCOUNT}"
fi

ACCOUNT="${WALLET_IDENTITY_ACCOUNT}" \
WALLET="${WALLET_IDENTITY_WALLET}" \
BASE="${BASE_MAIN}" \
./ops/wallet-identity-smoke.sh >/tmp/public-beta-wallet-identity-smoke.last.log 2>&1 || {
  echo "FAIL: wallet-identity-smoke failed" >&2
  echo "See: /tmp/public-beta-wallet-identity-smoke.last.log" >&2
  exit 1
}

LATEST_WALLET_SMOKE="$(ls -dt /tmp/void-wallet-identity-smoke.* | head -n1)"
python3 - <<'PY' "$LATEST_WALLET_SMOKE"
import json, os, sys
root = sys.argv[1]
poll = json.load(open(os.path.join(root, "poll.result.json")))
before = json.load(open(os.path.join(root, "redeemable.before.json")))
after = json.load(open(os.path.join(root, "redeemable.after.json")))
final = json.load(open(os.path.join(root, "redeemable.final.json")))
job = poll.get("found_job") or {}
rcpt = poll.get("found_receipt") or {}

def num(obj, key):
    try:
        return float(obj.get(key) or 0)
    except Exception:
        return 0.0

print("wallet_identity_smoke_ok=1")
print(f"wallet_identity_job_id={job.get('job_id')}")
print(f"wallet_identity_job_status={job.get('status')}")
print(f"wallet_identity_receipt_id={rcpt.get('receipt_id')}")
print(f"wallet_identity_earned_before={num(before,'earned'):g}")
print(f"wallet_identity_earned_after={num(after,'earned'):g}")
print(f"wallet_identity_earned_final={num(final,'earned'):g}")
print(f"wallet_identity_redeemed_final={num(final,'redeemed'):g}")
print(f"wallet_identity_redeemable_final={num(final,'redeemable'):g}")
PY
echo

echo "=== [5] public-beta preflight summary ==="
python3 - <<'PY'
print("PASS")
print("- main node reachable")
print("- isolated node reachable")
print("- isolated helper reachable")
print("- wallet-specific WC proof green")
print("- wallet identity participant smoke green")
print("- baseline is good enough for continued public-beta hardening")
PY
