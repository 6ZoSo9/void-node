#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
LIMIT="${LIMIT:-3}"
WHO="${WHO:-zoso}"
APPLY="${APPLY:-0}"

echo "=== [1] sync remote to current main ==="
ssh "$ALIEN" '
set -euo pipefail
cd "$HOME/dev/void-node"
git fetch origin
git checkout main
git reset --hard origin/main
systemctl --user restart void-node.service
sleep 2
git rev-parse --short HEAD
curl -fsS http://127.0.0.1:4100/health
echo
'

echo
echo "=== [2] provenance diff before ==="
bash ops/two-box-datanet-provenance-diff.sh

if [ "$APPLY" != "1" ]; then
  echo
  echo "[dry-run] set APPLY=1 to materialize and prove"
  exit 0
fi

echo
echo "=== [3] bounded materialize ==="
APPLY=1 LIMIT="$LIMIT" WHO="$WHO" bash ops/two-box-datanet-materialize-from-peer.sh

echo
echo "=== [4] proof count drop ==="
LIMIT="$LIMIT" WHO="$WHO" bash ops/two-box-datanet-materialize-proof.sh
