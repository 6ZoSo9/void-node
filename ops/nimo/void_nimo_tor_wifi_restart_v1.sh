#!/usr/bin/env bash
set -euo pipefail
umask 077

MARKER="VOID_NIMO_TOR_WIFI_RESTART_V1"
TOR_UNIT="void-public-seed-tor-v1.service"
GATEWAY_UNIT="void-public-seed-tor-gateway-v1.service"
NODE_UNIT="void-nimo-tor-bootstrap-node-v4.service"
HOSTNAME_FILE="$HOME/.local/share/void/tor-public-seed-v1/hidden-service/hostname"
READY_URL="http://127.0.0.1:4100/__void/ready.json"
GATEWAY_URL="http://127.0.0.1:4111/__void/ready.json"
SOCKS_PORT=19051
EXPECTED_ONION="6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion"

echo "$MARKER"
echo "tor_service_restart=true"
echo "gateway_service_restart=false"
echo "void_node_restart=false"
echo "tor_identity_preserved=true"
echo "tor_config_mutation=false"
echo "router_mutation=false"
echo "firewall_mutation=false"
echo "dns_mutation=false"
echo "private_key_content_read=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "funds_movement=false"

for cmd in systemctl journalctl curl ss ip; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "REFUSE: missing command: $cmd" >&2
    exit 2
  }
done

echo
echo "=== NETWORK PRECHECK ==="
mapfile -t defaults < <(ip -4 route show default)
printf '%s\n' "${defaults[@]}"
wifi_default="$(printf '%s\n' "${defaults[@]}" | awk '$0 ~ / dev wlp1s0 / {print}')"
test -n "$wifi_default" || {
  echo "REFUSE: no IPv4 default route through Nimo Wi-Fi interface wlp1s0" >&2
  exit 3
}
wifi_metric="$(printf '%s\n' "$wifi_default" | sed -n 's/.* metric \([0-9][0-9]*\).*/\1/p')"
test -n "$wifi_metric" || wifi_metric=0

for route in "${defaults[@]}"; do
  test -n "$route" || continue
  if [[ "$route" != *" dev wlp1s0 "* ]]; then
    other_metric="$(printf '%s\n' "$route" | sed -n 's/.* metric \([0-9][0-9]*\).*/\1/p')"
    test -n "$other_metric" || other_metric=0
    if (( other_metric <= wifi_metric )); then
      echo "REFUSE: non-Wi-Fi default route has equal/higher priority than Wi-Fi" >&2
      exit 3
    fi
  fi
done
echo "wifi_default_route_primary=true"

test -f "$HOSTNAME_FILE" || { echo "REFUSE: onion hostname missing" >&2; exit 3; }
before_onion="$(tr -d '\r\n' < "$HOSTNAME_FILE")"
test "$before_onion" = "$EXPECTED_ONION" || {
  echo "REFUSE: onion identity mismatch before restart" >&2
  exit 3
}
echo "onion_before=$before_onion"

for unit in "$NODE_UNIT" "$GATEWAY_UNIT" "$TOR_UNIT"; do
  systemctl --user is-active --quiet "$unit" || {
    echo "REFUSE: required unit not active before restart: $unit" >&2
    exit 3
  }
done

node_ready="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$READY_URL")"
gateway_ready="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$GATEWAY_URL")"
echo "node_ready=$node_ready"
echo "gateway_ready=$gateway_ready"

start_epoch="$(date +%s)"
systemctl --user restart "$TOR_UNIT"
echo "tor_restart_issued=true"

for i in $(seq 1 180); do
  if systemctl --user is-active --quiet "$TOR_UNIT"; then
    if ss -H -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "127\\.0\\.0\\.1:$SOCKS_PORT$"; then
      if journalctl --user -u "$TOR_UNIT" --since "@$start_epoch" --no-pager 2>/dev/null |
        grep -Fq 'Bootstrapped 100% (done): Done'; then
        echo "tor_bootstrap_100=true"
        echo "tor_socks_ready=true"
        break
      fi
    fi
  fi
  if (( i == 180 )); then
    echo "REFUSE: Tor did not re-bootstrap after Wi-Fi restart" >&2
    journalctl --user -u "$TOR_UNIT" --since "@$start_epoch" --no-pager >&2 || true
    exit 4
  fi
  sleep 1
done

after_onion="$(tr -d '\r\n' < "$HOSTNAME_FILE")"
test "$after_onion" = "$before_onion" || {
  echo "REFUSE: onion identity changed across restart" >&2
  exit 4
}
echo "onion_after=$after_onion"
echo "onion_identity_unchanged=true"

sleep 5

echo
echo "=== POST-RESTART HEALTH ==="
systemctl --user is-active "$NODE_UNIT"
systemctl --user is-active "$GATEWAY_UNIT"
systemctl --user is-active "$TOR_UNIT"
curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$READY_URL"
echo
curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$GATEWAY_URL"
echo

echo
echo "=== POST-RESTART TOR JOURNAL ==="
journalctl --user -u "$TOR_UNIT" --since "@$start_epoch" --no-pager -o short-iso |
  grep -Ei 'bootstrap|hidden|onion|descriptor|intro|rend|hsdir|upload|publish|warn|error|fail|circuit|clock|consensus' |
  tail -n 300 || true

echo "${MARKER}_GREEN"
echo "next_gate=rerun_exact_head_external_tor_acceptance"
