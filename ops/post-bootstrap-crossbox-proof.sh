#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

MARKER="VOID_CROSSBOX_BOOTSTRAP_MUTATION_BOUNDARY_V1"
ALIEN="${ALIEN:-}"
PREC_TS="${PREC_TS:-}"

hold(){
  echo "$MARKER HOLD: $*" >&2
  exit 2
}

valid_ssh_target(){
  local target="$1"
  [[ "$target" =~ ^([A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
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
[ -n "$PREC_TS" ] || hold "missing explicit PREC_TS"
valid_ssh_target "$ALIEN" || hold "ALIEN must be a destination-only SSH alias or user@host"
valid_ipv4 "$PREC_TS" || hold "PREC_TS must be a valid IPv4 address"

TARGET_GUARD="$(printf '%s\n' "$ALIEN" "$PREC_TS" | tr '[:upper:]' '[:lower:]')"
case "$TARGET_GUARD" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    hold "retired Alienware target is forbidden"
    ;;
esac

echo "marker=$MARKER"
echo "=== remote host truth ==="
ssh "$ALIEN" 'hostname'
echo

echo "=== precision over tailscale: health ==="
ssh "$ALIEN" "curl -fsS --max-time 5 http://${PREC_TS}:4100/health ; echo"
echo

echo "=== precision over tailscale: ready ==="
ssh "$ALIEN" "curl -fsS --max-time 5 http://${PREC_TS}:4100/__void/ready.json ; echo"
echo

echo "=== precision remote rpc should be closed ==="
ssh "$ALIEN" "curl --max-time 5 -H 'content-type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}' http://${PREC_TS}:8545 ; echo || true"
echo

echo "=== local guard: precision tailscale still healthy ==="
curl -fsS --max-time 5 "http://${PREC_TS}:4100/health" ; echo
curl -fsS --max-time 5 "http://${PREC_TS}:4100/__void/ready.json" ; echo
