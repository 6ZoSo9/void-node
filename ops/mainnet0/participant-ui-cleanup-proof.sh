#!/usr/bin/env bash
set -euo pipefail

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="${HTML:-/tmp/void-participant-ui-cleanup-proof.html}"

echo "=== Participant UI cleanup proof ==="
echo "repo=$(pwd)"
echo "base=$BASE"

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] build ==="
npm run build

echo
echo "=== [3] node ready ==="
READY_JSON="$(curl -fsS "$BASE/__void/ready.json")"
printf '%s\n' "$READY_JSON"
READY_JSON="$READY_JSON" python3 - <<'PY'
import json, os, sys
j=json.loads(os.environ["READY_JSON"])
bad=[]
if j.get("ready") is not True: bad.append("ready_not_true")
if int(j.get("gap", 999999)) != 0: bad.append("gap_not_zero")
if int(j.get("txroot_live", 0)) != 1: bad.append("txroot_live_not_1")
if bad:
    raise SystemExit("[ERR] ready failed: " + ",".join(bad))
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [4] participant cleanup markers ==="
curl -fsS "$BASE/participant" > "$HTML"

needles=(
  "VOID_HOME_HIDE_BIG_BOXES_V1"
  "VOID_HOME_NEWS_FEED_V1"
  "VOID_HOME_NEWS_FEED_GENERATED_V1"
  "Start with Wallet. Then earn, buy, or preview staking when ready."
  "Normal Home view is quieter."
  "VOID_HOME_STATUS_STRIP_COMPACT_V1"
  "VOID_SIDEBAR_ADVANCED_MENU_V1"
  "VOID_EARN_CLEANUP_V1"
  "VOID_BUY_CHECKOUT_UI_V1"
  "VOID_WALLET_CLEANUP_V1"
  "VOID_TRADE_CLEANUP_V1"
  "VOID_TRADE_MARKET_UNAVAILABLE_V1"
  "VOID_STAKE_CLEANUP_V1"
  "VOID_ACCOUNT_WALLET_BAR_CLEANUP_V1"
  "VOID_ACCOUNT_WALLET_SHORT_STATUS_V1"
  "VOID_PARTICIPANT_RESPONSIVE_POLISH_V1"
  "VOID_STATUS_STRIP_GLOBAL_COMPACT_V1"
  "VOID_TOP_STATUS_HIDE_OPS_CHIPS_V1"
  "VOID_FIRST_RUN_ONBOARDING_V1"
  "Start Here"
  "Set up Account Wallet"
  "voidParticipantWalletManageMenu"
  "participantTopStatusStrip"
  "News &amp; Updates"
  "Preview Registration"
  "Market services are not initialized"
  "Manage Wallet"
)

for n in "${needles[@]}"; do
  grep -q "$n" "$HTML" || {
    echo "[ERR] missing marker/text: $n"
    exit 1
  }
  echo "[ok] $n"
done

echo
echo "=== [5] WC helper/relayer sidecar posture ==="
if ss -ltnp 2>/dev/null | grep -E ':4312|:4313'; then
  echo "[ok] WC helper/relayer ports are listening; this is allowed for current public-live polish"
else
  echo "[ok] WC helper/relayer ports are not listening; participant UI cleanup is not blocked"
fi

echo
echo "=== [6] mainnet0 status smoke ==="
make mainnet0-status-smoke

echo
echo "=== [7] launcher no-open smoke ==="
if [ -x "$HOME/.local/bin/void-launcher" ]; then
  VOID_LAUNCHER_NO_OPEN=1 VOID_READY_TIMEOUT_SECONDS=60 "$HOME/.local/bin/void-launcher"
else
  echo "[warn] launcher not installed at $HOME/.local/bin/void-launcher; skipping launcher smoke"
fi

echo
echo "=== [8] final truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty
curl -fsS "$BASE/__void/ready.json"
echo

echo
echo "[ok] Participant UI cleanup proof passed"
