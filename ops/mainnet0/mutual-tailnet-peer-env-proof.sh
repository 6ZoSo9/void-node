#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

MARKER="VOID_CROSSBOX_BOOTSTRAP_MUTATION_BOUNDARY_V1"
ROOT="${VOID_REPO:-$HOME/dev/void-node}"
ALIEN="${ALIEN:-}"
HTTP_PORT="${HTTP_PORT:-4100}"
CONFIRM_MUTUAL_TAILNET_PEER_ENV="${CONFIRM_MUTUAL_TAILNET_PEER_ENV:-}"

hold(){
  echo "$MARKER HOLD: $*" >&2
  exit 2
}

valid_ssh_target(){
  local target="$1"
  [[ "$target" =~ ^([A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
}

valid_port(){
  local value="$1"
  [[ "$value" =~ ^[0-9]{1,5}$ ]] || return 1
  local number=$((10#$value))
  (( number >= 1 && number <= 65535 ))
}

valid_ipv4(){
  local value="$1"
  [[ "$value" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]] || return 1
  local a b c d octet
  IFS=. read -r a b c d <<<"$value"
  for octet in "$a" "$b" "$c" "$d"; do
    [[ "$octet" =~ ^[0-9]{1,3}$ ]] || return 1
    (( 10#$octet >= 0 && 10#$octet <= 255 )) || return 1
  done
}

prove_source_parity(){
  local local_status local_head local_host local_short
  local remote_truth remote_host remote_head

  local_status="$(git -C "$ROOT" status --porcelain=v1 --untracked-files=all)" \
    || hold "local repository status unavailable"
  [ -z "$local_status" ] || hold "local repository must be clean before peer-env mutation"

  local_head="$(git -C "$ROOT" rev-parse HEAD)" \
    || hold "local repository HEAD unavailable"
  [[ "$local_head" =~ ^[0-9a-f]{40}$ ]] || hold "local repository HEAD invalid"

  remote_truth="$(
    ssh -o BatchMode=yes -o ConnectTimeout=6 "$ALIEN" '
set -euo pipefail
cd "$HOME/dev/void-node"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
printf "%s\n%s\n" "$(hostname)" "$(git rev-parse HEAD)"
'
  )" || hold "remote clean repository identity unavailable"

  remote_host="$(printf '%s\n' "$remote_truth" | sed -n '1p')"
  remote_head="$(printf '%s\n' "$remote_truth" | sed -n '2p')"
  [[ "$remote_head" =~ ^[0-9a-f]{40}$ ]] || hold "remote repository HEAD invalid"
  [ "$remote_head" = "$local_head" ] || hold "local/remote repository HEAD mismatch"

  local_host="$(hostname)"
  local_short="$(hostname -s)"
  [ -n "$remote_host" ] || hold "remote hostname missing"
  [ "$remote_host" != "$local_host" ] || hold "remote resolved to local host"
  [ "$remote_host" != "$local_short" ] || hold "remote resolved to local host"

  printf 'local_source_head=%s\n' "$local_head"
  printf 'remote_source_head=%s\n' "$remote_head"
  printf 'remote_source_host=%s\n' "$remote_host"
}

[ -n "$ALIEN" ] || hold "missing explicit ALIEN remote SSH target"
valid_ssh_target "$ALIEN" || hold "ALIEN must be a destination-only SSH alias or user@host"
valid_port "$HTTP_PORT" || hold "HTTP_PORT must be an integer in 1..65535"

[ "$CONFIRM_MUTUAL_TAILNET_PEER_ENV" = "applyVoidMutualTailnetPeerEnvV1" ] \
  || hold "confirmation token required"

cd "$ROOT" || hold "repository root unavailable"

PRECISION_TS="${PRECISION_TS:-$(tailscale ip -4 2>/dev/null | head -n1)}"
ALIEN_TS="${ALIEN_TS:-${ALIEN##*@}}"

valid_ipv4 "$PRECISION_TS" || hold "PRECISION_TS must be an explicit valid IPv4 address"
valid_ipv4 "$ALIEN_TS" || hold "ALIEN_TS must be an explicit valid IPv4 address"
[ "$PRECISION_TS" != "$ALIEN_TS" ] || hold "Precision and remote Tailnet IPs must be distinct"

TARGET_GUARD="$(printf '%s\n' "$ALIEN" "$ALIEN_TS" "$PRECISION_TS" | tr '[:upper:]' '[:lower:]')"
case "$TARGET_GUARD" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    hold "retired Alienware target is forbidden"
    ;;
esac

prove_source_parity

PRECISION_BASE="http://${PRECISION_TS}:${HTTP_PORT}"
REMOTE_BASE="http://${ALIEN_TS}:${HTTP_PORT}"

DROPIN_DIR="$HOME/.config/systemd/user/void-node.service.d"
DROPIN_NAME="97-mutual-tailnet-peers.conf"
DROPIN="$DROPIN_DIR/$DROPIN_NAME"
OUT="${OUT:-/tmp/mutual-tailnet-peer-env-proof-$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "=== mutual tailnet peer env proof ==="
echo "marker=$MARKER"
echo "mutation=idempotent_systemd_user_dropin_update"
echo "confirmation_verified=true"
echo "source_parity_verified=true"
echo "precision_base=$PRECISION_BASE"
echo "remote_base=$REMOTE_BASE"
echo "dropin=$DROPIN_NAME"

echo
echo "=== [1] install Precision durable peer env ==="
mkdir -p "$DROPIN_DIR"
cat > "$DROPIN" <<EOF
[Service]
Environment=VOID_SITE_BUNDLE_PEERS=${REMOTE_BASE}
EOF

systemctl --user daemon-reload
systemctl --user restart void-node.service
sleep 3

systemctl --user cat void-node.service > "$OUT/precision-systemd-cat.txt"
grep -Fq "Environment=VOID_SITE_BUNDLE_PEERS=${REMOTE_BASE}" "$OUT/precision-systemd-cat.txt"

echo "[ok] Precision durable peer env installed"

echo
echo "=== [2] install remote durable peer env ==="
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

systemctl --user cat void-node.service > /tmp/mutual-tailnet-peer-env-remote-systemd-cat.txt
grep -Fq "Environment=VOID_SITE_BUNDLE_PEERS=${PRECISION_BASE}" /tmp/mutual-tailnet-peer-env-remote-systemd-cat.txt
REMOTE

ssh "$ALIEN" "cat /tmp/mutual-tailnet-peer-env-remote-systemd-cat.txt" > "$OUT/remote-systemd-cat.txt"
echo "[ok] remote durable peer env installed"

echo
echo "=== [3] local and cross reachability ==="
curl -fsS --max-time 8 "http://127.0.0.1:${HTTP_PORT}/__void/ready.json" > "$OUT/precision-local-ready.json"
curl -fsS --max-time 8 "${PRECISION_BASE}/__void/ready.json" > "$OUT/precision-tailnet-ready.json"
curl -fsS --max-time 8 "${REMOTE_BASE}/__void/ready.json" > "$OUT/remote-tailnet-ready.json"
ssh "$ALIEN" "curl -fsS --max-time 8 '${PRECISION_BASE}/__void/ready.json'" > "$OUT/remote-reaches-precision-ready.json"

python3 - "$OUT/precision-local-ready.json" "$OUT/precision-tailnet-ready.json" "$OUT/remote-tailnet-ready.json" "$OUT/remote-reaches-precision-ready.json" <<'PY'
import json, sys
for file in sys.argv[1:]:
    value=json.load(open(file))
    assert value.get("ready") is True, (file, value)
    assert int(value.get("gap", -1)) == 0, (file, value)
    assert int(value.get("txroot_live", 0)) == 1, (file, value)
print("[ok] all ready/reachability checks green")
PY

echo
echo "=== [4] effective env sanity ==="
grep -Fq "Environment=VOID_SITE_BUNDLE_PEERS=${REMOTE_BASE}" "$OUT/precision-systemd-cat.txt"
grep -Fq "Environment=VOID_SITE_BUNDLE_PEERS=${PRECISION_BASE}" "$OUT/remote-systemd-cat.txt"

echo "[ok] mutual peer env effective"

echo
echo "=== [5] functional backstop ==="
PUBLIC_LOCAL_NODE_BASE="$PRECISION_BASE" make participant-share-open-e2e-proof

echo
echo "=== [6] status smoke ==="
make mainnet0-status-smoke

echo
echo "=== [7] summary ==="
python3 - "$PRECISION_BASE" "$REMOTE_BASE" <<'PY'
import json, sys
print(json.dumps({
  "mutual_tailnet_peer_env_v1": "green",
  "precision_peer": sys.argv[1],
  "remote_peer": sys.argv[2],
  "dropin": "97-mutual-tailnet-peers.conf",
  "source_parity_verified": True,
  "confirmation_verified": True,
  "precision_reaches_remote": True,
  "remote_reaches_precision": True,
  "participant_share_open_e2e_backstop": True,
  "buy_void_fulfillment": False,
  "validator_mutation": False,
  "wallet_send": False,
  "wc_to_void_swap": False,
}, indent=2))
PY

echo
echo "[ok] mutual tailnet peer env proof passed"
