#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

MARKER="VOID_TWO_BOX_DATANET_OPERATOR_CYCLE_DRY_RUN_V1"

if [ -z "${ALIEN:-}" ]; then
  echo "$MARKER HOLD: missing explicit ALIEN" >&2
  exit 2
fi
if [ -z "${REMOTE_BASE:-}" ]; then
  echo "$MARKER HOLD: missing explicit REMOTE_BASE" >&2
  exit 2
fi

TARGET_GUARD="$(printf '%s\n' "$ALIEN" "$REMOTE_BASE" | tr '[:upper:]' '[:lower:]')"
case "$TARGET_GUARD" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    echo "$MARKER HOLD: retired Alienware target is forbidden" >&2
    exit 2
    ;;
esac

export ALIEN REMOTE_BASE

LIMIT="${LIMIT:-3}"
WHO="${WHO:-zoso}"
APPLY="${APPLY:-0}"

echo "=== [1] provenance diff before ==="
ALIEN="$ALIEN" REMOTE_BASE="$REMOTE_BASE" \
  bash ops/two-box-datanet-provenance-diff.sh

if [ "$APPLY" != "1" ]; then
  echo
  echo "[dry-run] remote sync/restart/materialization skipped; set APPLY=1 to mutate"
  exit 0
fi

echo
echo "=== [2] sync remote to current main ==="
ssh "$ALIEN" "REMOTE_BASE='$REMOTE_BASE' bash -s" <<'REMOTE'
set -euo pipefail
cd "$HOME/dev/void-node"
git fetch origin
git checkout main
git reset --hard origin/main
systemctl --user restart void-node.service
sleep 2
git rev-parse --short HEAD
curl -fsS "$REMOTE_BASE/health"
echo
REMOTE

echo
echo "=== [3] bounded materialize ==="
ALIEN="$ALIEN" REMOTE_BASE="$REMOTE_BASE" APPLY=1 LIMIT="$LIMIT" WHO="$WHO" \
  bash ops/two-box-datanet-materialize-from-peer.sh

echo
echo "=== [4] proof count drop ==="
ALIEN="$ALIEN" REMOTE_BASE="$REMOTE_BASE" LIMIT="$LIMIT" WHO="$WHO" \
  bash ops/two-box-datanet-materialize-proof.sh
