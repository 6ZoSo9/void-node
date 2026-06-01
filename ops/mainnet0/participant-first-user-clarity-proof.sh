#!/usr/bin/env bash
set -uo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}" || exit 1

NODE="${NODE:-http://127.0.0.1:4100}"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

FAIL=0

ok() {
  echo "[ok] $*"
}

fail() {
  echo "[fail] $*"
  FAIL=1
}

need_file() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if [ ! -f "$file" ]; then
    fail "$label: missing file $file"
    return
  fi
  if grep -qiE "$pattern" "$file"; then
    ok "$label"
  else
    fail "$label: missing pattern $pattern in $file"
  fi
}

need_html() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if grep -qiE "$pattern" "$file"; then
    ok "$label"
  else
    fail "$label: missing served pattern $pattern"
  fi
}

echo "=== participant first-user clarity proof ==="
echo "mutation=false"

echo
echo "=== [1] runtime ready ==="
READY="$TMPDIR/ready.json"
if curl -fsS --max-time 8 "$NODE/__void/ready.json" > "$READY"; then
  python3 - "$READY" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    o = json.load(f)
assert o.get("ready") is True, o
assert int(o.get("gap", -1)) == 0, o
assert int(o.get("txroot_live", 0)) == 1, o
print("[ok] ready/gap/txroot")
PY
  if [ "$?" -ne 0 ]; then FAIL=1; fi
else
  fail "ready endpoint unavailable"
fi

echo
echo "=== [2] docs onboarding anchors ==="
need_file README.md 'public-live|public_mainnet0_live|GO_PUBLIC_MAINNET0' "README public-live"
need_file README.md 'docs/public/start-here.md' "README links start-here"
need_file README.md 'docs/public/participant-onboarding.md' "README links participant onboarding"
need_file docs/public/start-here.md '127\.0\.0\.1:4100/participant' "start-here points to participant page"
need_file docs/public/start-here.md 'participant-onboarding.md' "start-here links participant onboarding"
need_file docs/public/participant-onboarding.md 'participant_surface: local node participant page' "participant onboarding local surface"
need_file docs/public/participant-onboarding.md 'wallet' "participant onboarding wallet guidance"
need_file docs/public/participant-onboarding.md 'Back up your wallet' "participant onboarding backup warning"
need_file docs/public/participant-onboarding.md 'Payment confirmation does not equal VOID sent' "participant onboarding Buy VOID safety"

echo
echo "=== [3] served participant page anchors ==="
HTML="$TMPDIR/participant.html"
if curl -fsS --max-time 8 "$NODE/participant" > "$HTML"; then
  ok "participant page served"
else
  fail "participant page not served"
fi

need_html "$HTML" 'VOID_HOME_START_PUBLIC_CLARITY_V1' "home public clarity marker"
need_html "$HTML" 'VOID_HOME_FIRST_SCREEN_COPY_V1' "home first-screen marker"
need_html "$HTML" 'Start Here' "home Start Here"
need_html "$HTML" 'VOID_HOME_HERO_WALLET_FIRST_V1' "wallet-first hero marker"
need_html "$HTML" 'Open Wallet' "Open Wallet action"
need_html "$HTML" 'Earn WC' "Earn WC action"
need_html "$HTML" 'Buy VOID' "Buy VOID action"
need_html "$HTML" 'Preview Staking' "Preview Staking action"
need_html "$HTML" 'Mainnet-0: public-live' "public-live top strip"

echo
echo "=== [4] wallet-first setup path ==="
need_html "$HTML" 'VOID_WALLET_TAB_FIRST_STEP_CLARITY_V1' "wallet first-step marker"
need_html "$HTML" 'VOID_WALLET_FIRST_SCREEN_COPY_V1' "wallet first-screen marker"
need_html "$HTML" 'Set up your Account Wallet first' "wallet setup instruction"
need_html "$HTML" 'Account Wallet Setup' "wallet setup panel"
need_html "$HTML" 'Recent Wallet Activity' "wallet activity visible"

echo
echo "=== [5] earn / WC -> VOID path stays guided ==="
need_html "$HTML" 'Earn Work Credits' "earn tab visible"
need_html "$HTML" 'Run Once' "manual Run Once visible"
need_html "$HTML" 'automatic background earning is disabled' "manual earning safety copy"
need_html "$HTML" 'Swap WC / VOID' "swap tab visible"
need_html "$HTML" 'VOID_TRADE_GUIDED_SWAP_COPY_V1' "guided swap marker"
need_html "$HTML" 'Move WC On-Chain' "bridge WC panel visible"
need_html "$HTML" 'Bridge WC On-Chain' "bridge WC action visible"
need_html "$HTML" 'Approve \+ Swap WC for VOID|Checking Trade Readiness|Needs Devnet Gas|Unlock Native Wallet|No On-chain WC' "swap readiness button/state visible"

echo
echo "=== [6] advanced/operator controls remain separated ==="
need_html "$HTML" 'Settings.*Advanced|Advanced status, records, swap preview, receipts, and validator-plan tools live here' "settings/advanced separation"
need_html "$HTML" 'Operator-only validator controls are not part of public staking or candidate registration' "operator controls warning"

echo
echo "=== [7] WC -> VOID closed-lane note remains present ==="
need_file ops/mainnet0/participant-wc-to-void.current.md 'WC -> VOID is closed for this lane\.' "WC->VOID closed lane note"
need_file ops/mainnet0/participant-wc-to-void.current.md 'ckpt-wc-to-void-trade-receipt-activity-green-20260601-084635' "WC->VOID receipt checkpoint anchor"
need_file ops/mainnet0/participant-wc-to-void.current.md 'previous_readiness_checkpoint: ckpt-participant-wc-to-void-readiness-proof-green-20260601-023517' "WC->VOID readiness checkpoint anchor"

echo
if [ "$FAIL" -eq 0 ]; then
  echo "[ok] participant first-user clarity proof passed"
  exit 0
fi

echo "[fail] participant first-user clarity proof failed"
exit 1
