#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
HTTP_PORT="${HTTP_PORT:-4100}"
PRECISION_TS="${PRECISION_TS:-$(tailscale ip -4 2>/dev/null | head -n1)}"
ALIEN_TS="${ALIEN_TS:-${ALIEN##*@}}"

PRECISION_BASE="http://${PRECISION_TS}:${HTTP_PORT}"
ALIEN_BASE="http://${ALIEN_TS}:${HTTP_PORT}"

DROPIN_DIR="$HOME/.config/systemd/user/void-node.service.d"
DROPIN_NAME="97-mutual-tailnet-peers.conf"
DROPIN="$DROPIN_DIR/$DROPIN_NAME"
OUT="${OUT:-/tmp/mutual-tailnet-peer-env-proof-$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "=== mutual tailnet peer env proof ==="
echo "mutation=idempotent_systemd_user_dropin_update"
echo "precision_base=$PRECISION_BASE"
echo "alien_base=$ALIEN_BASE"
echo "dropin=$DROPIN_NAME"

if [ -z "$PRECISION_TS" ] || [ -z "$ALIEN_TS" ]; then
  echo "[ERR] missing Precision or Alienware tailnet IP"
  exit 1
fi

echo
echo "=== [1] install Precision durable peer env ==="
mkdir -p "$DROPIN_DIR"
cat > "$DROPIN" <<EOF
[Service]
Environment=VOID_SITE_BUNDLE_PEERS=${ALIEN_BASE}
EOF

systemctl --user daemon-reload
systemctl --user restart void-node.service
sleep 3

systemctl --user cat void-node.service > "$OUT/precision-systemd-cat.txt"
grep -q "Environment=VOID_SITE_BUNDLE_PEERS=${ALIEN_BASE}" "$OUT/precision-systemd-cat.txt"

echo "[ok] Precision durable peer env installed"

echo
echo "=== [2] install Alienware durable peer env ==="
ssh "$ALIEN" "PRECISION_BASE='$PRECISION_BASE' DROPIN_NAME='$DROPIN_NAME' bash -s" <<'REMOTE'
set -euo pipefail

DROPIN_DIR="$HOME/.config/systemd/user/void-node.service.d"
mkdir -p "$DROPIN_DIR"

cat > "$DROPIN_DIR/$DROPIN_NAME" <<EOF
[Service]
Environment=VOID_SITE_BUNDLE_PEERS=${PRECISION_BASE}
EOF

systemctl --user daemon-reload
systemctl --user restart void-node.service
sleep 3

systemctl --user cat void-node.service > /tmp/mutual-tailnet-peer-env-alien-systemd-cat.txt
grep -q "Environment=VOID_SITE_BUNDLE_PEERS=${PRECISION_BASE}" /tmp/mutual-tailnet-peer-env-alien-systemd-cat.txt
REMOTE

ssh "$ALIEN" "cat /tmp/mutual-tailnet-peer-env-alien-systemd-cat.txt" > "$OUT/alien-systemd-cat.txt"
echo "[ok] Alienware durable peer env installed"

echo
echo "=== [3] local and cross reachability ==="
curl -fsS --max-time 8 "http://127.0.0.1:${HTTP_PORT}/__void/ready.json" > "$OUT/precision-local-ready.json"
curl -fsS --max-time 8 "${PRECISION_BASE}/__void/ready.json" > "$OUT/precision-tailnet-ready.json"
curl -fsS --max-time 8 "${ALIEN_BASE}/__void/ready.json" > "$OUT/alien-tailnet-ready.json"
ssh "$ALIEN" "curl -fsS --max-time 8 '${PRECISION_BASE}/__void/ready.json'" > "$OUT/alien-reaches-precision-ready.json"

python3 - "$OUT/precision-local-ready.json" "$OUT/precision-tailnet-ready.json" "$OUT/alien-tailnet-ready.json" "$OUT/alien-reaches-precision-ready.json" <<'PY'
import json, sys
for path in sys.argv[1:]:
    j=json.load(open(path))
    assert j.get("ready") is True, (path, j)
    assert int(j.get("gap", -1)) == 0, (path, j)
    assert int(j.get("txroot_live", 0)) == 1, (path, j)
print("[ok] all ready/reachability checks green")
PY

echo
echo "=== [4] effective env sanity ==="
grep -q "Environment=VOID_SITE_BUNDLE_PEERS=${ALIEN_BASE}" "$OUT/precision-systemd-cat.txt"
grep -q "Environment=VOID_SITE_BUNDLE_PEERS=${PRECISION_BASE}" "$OUT/alien-systemd-cat.txt"

echo "[ok] mutual peer env effective"

echo
echo "=== [5] functional backstop ==="
PUBLIC_LOCAL_NODE_BASE="$PRECISION_BASE" make participant-share-open-e2e-proof

echo
echo "=== [6] status smoke ==="
make mainnet0-status-smoke

echo
echo "=== [7] summary ==="
python3 - "$PRECISION_BASE" "$ALIEN_BASE" <<'PY'
import json, sys
print(json.dumps({
  "mutual_tailnet_peer_env_v1": "green",
  "precision_peer": sys.argv[2],
  "alienware_peer": sys.argv[1],
  "dropin": "97-mutual-tailnet-peers.conf",
  "precision_reaches_alienware": True,
  "alienware_reaches_precision": True,
  "participant_share_open_e2e_backstop": True,
  "buy_void_fulfillment": False,
  "validator_mutation": False,
  "wallet_send": False,
  "wc_to_void_swap": False,
}, indent=2))
PY

echo
echo "[ok] mutual tailnet peer env proof passed"
