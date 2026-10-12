#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

MARKER="VOID_CROSSBOX_BOOTSTRAP_MUTATION_BOUNDARY_V1"
LEGACY_MARKER="VOID_CROSSBOX_BOOTSTRAP_EXPLICIT_TARGET_V1"
ROOT="${VOID_REPO:-$HOME/dev/void-node}"
ALIEN="${ALIEN:-}"
: "${ALIEN:?set ALIEN to an explicit non-retired remote SSH target}"
HTTP_PORT="${HTTP_PORT:-4100}"

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
    (( 10#$octet >= 0 && 10#$octet <= 255 )) || return 1
  done
}

[ -n "$ALIEN" ] || hold "missing explicit ALIEN remote SSH target"
valid_ssh_target "$ALIEN" || hold "ALIEN must be a destination-only SSH alias or user@host"
valid_port "$HTTP_PORT" || hold "HTTP_PORT must be an integer in 1..65535"

cd "$ROOT" || hold "repository root unavailable"

TS_IP="${TS_IP:-$(tailscale ip -4 2>/dev/null | head -n1)}"
valid_ipv4 "$TS_IP" || hold "TS_IP must be a valid IPv4 address"

EXPECTED_PUBLIC_BASE="http://${TS_IP}:${HTTP_PORT}"
PUBLIC_BASE="${PUBLIC_LOCAL_NODE_BASE:-$EXPECTED_PUBLIC_BASE}"
[ "$PUBLIC_BASE" = "$EXPECTED_PUBLIC_BASE" ] \
  || hold "PUBLIC_LOCAL_NODE_BASE must exactly match the reviewed Tailnet HTTP base"

TARGET_GUARD="$(printf '%s\n' "$ALIEN" "$TS_IP" "$PUBLIC_BASE" | tr '[:upper:]' '[:lower:]')"
case "$TARGET_GUARD" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    hold "retired Alienware target is forbidden"
    ;;
esac

DROPIN="${DROPIN:-$HOME/.config/systemd/user/void-node.service.d/98-tailnet-http.conf}"
OUT="${OUT:-/tmp/tailnet-http-public-base-proof-$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "=== tailnet HTTP public base proof ==="
echo "marker=$MARKER"
echo "mutation=false"
echo "remote=$ALIEN"
echo "ts_ip=$TS_IP"
echo "public_base=$PUBLIC_BASE"
echo "dropin=$DROPIN"

echo
echo "=== [1] systemd drop-in exists and advertises current tailnet HTTP base ==="
test -f "$DROPIN"

grep -q '^Environment=HTTP_HOST=0\.0\.0\.0$' "$DROPIN"
grep -Fq "Environment=PUBLIC_HTTP_BASE=${PUBLIC_BASE}" "$DROPIN"

systemctl --user cat void-node.service > "$OUT/systemd-cat.txt"
grep -Fq 'Environment=HTTP_HOST=0.0.0.0' "$OUT/systemd-cat.txt"
grep -Fq "Environment=PUBLIC_HTTP_BASE=${PUBLIC_BASE}" "$OUT/systemd-cat.txt"

echo "[ok] drop-in and effective systemd config present"

echo
echo "=== [2] socket is bound beyond localhost ==="
ss -ltnp > "$OUT/sockets.txt"
grep -Eq "0\.0\.0\.0:${HTTP_PORT}|\\[::\\]:${HTTP_PORT}" "$OUT/sockets.txt"

echo "[ok] HTTP socket is externally reachable on this host"

echo
echo "=== [3] local ready through localhost and tailnet base ==="
curl -fsS --max-time 8 "http://127.0.0.1:${HTTP_PORT}/__void/ready.json" > "$OUT/local-ready.json"
curl -fsS --max-time 8 "${PUBLIC_BASE}/__void/ready.json" > "$OUT/tailnet-ready.json"

python3 - "$OUT/local-ready.json" "$OUT/tailnet-ready.json" <<'PY'
import json, sys
for file in sys.argv[1:]:
    value=json.load(open(file))
    assert value.get("ready") is True, (file, value)
    assert int(value.get("gap", -1)) == 0, (file, value)
    assert int(value.get("txroot_live", 0)) == 1, (file, value)
print("[ok] local and tailnet ready are green")
PY

echo
echo "=== [4] remote peer can reach Precision public base ==="
ssh "$ALIEN" "curl -fsS --max-time 8 '${PUBLIC_BASE}/__void/ready.json'" > "$OUT/remote-reaches-precision-ready.json"

python3 - "$OUT/remote-reaches-precision-ready.json" <<'PY'
import json, sys
value=json.load(open(sys.argv[1]))
assert value.get("ready") is True, value
assert int(value.get("gap", -1)) == 0, value
assert int(value.get("txroot_live", 0)) == 1, value
print("[ok] remote peer can reach Precision tailnet HTTP")
PY

echo
echo "=== [5] functional backstop: participant share/open E2E ==="
PUBLIC_LOCAL_NODE_BASE="$PUBLIC_BASE" make participant-share-open-e2e-proof

echo
echo "=== [6] status smoke ==="
make mainnet0-status-smoke

echo
echo "=== [7] summary ==="
python3 - "$TS_IP" "$PUBLIC_BASE" <<'PY'
import json, sys
print(json.dumps({
  "tailnet_http_public_base_v1": "green",
  "ts_ip": sys.argv[1],
  "public_base": sys.argv[2],
  "dropin": "98-tailnet-http.conf",
  "http_host": "0.0.0.0",
  "remote_can_reach_precision_http": True,
  "participant_share_open_e2e": True,
  "buy_void_fulfillment": False,
  "validator_mutation": False,
  "wallet_send": False,
  "wc_to_void_swap": False,
}, indent=2))
PY

echo
echo "[ok] tailnet HTTP public base proof passed"
