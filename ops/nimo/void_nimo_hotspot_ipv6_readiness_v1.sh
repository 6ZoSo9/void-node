#!/usr/bin/env bash
set -euo pipefail
umask 077

MARKER="VOID_NIMO_HOTSPOT_IPV6_READINESS_V1"
READY_URL="http://127.0.0.1:4100/__void/ready.json"

echo "$MARKER"
echo "host_mutation=false"
echo "service_action=false"
echo "firewall_mutation=false"
echo "router_mutation=false"
echo "network_configuration_mutation=false"
echo "private_key_content_read=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "funds_movement=false"

for cmd in ip ss systemctl curl awk grep; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "REFUSE: missing command: $cmd" >&2
    exit 2
  }
done

echo
echo "=== DEFAULT ROUTES ==="
echo "--- IPv4 ---"
ip -4 route show default || true
echo "--- IPv6 ---"
ip -6 route show default || true

echo
echo "=== GLOBAL IPv6 ADDRESSES ==="
mapfile -t global6 < <(
  ip -6 -o addr show scope global |
    awk '{print $2, $4}' |
    sed 's#/.*##' |
    sort -u
)
if test "${#global6[@]}" -eq 0; then
  echo "global_ipv6_candidate_count=0"
else
  printf 'global_ipv6_candidate=%s\n' "${global6[@]}"
  echo "global_ipv6_candidate_count=${#global6[@]}"
fi

echo
echo "=== IPV6 ROUTE CANDIDATE CHECK ==="
candidate_count=0
while read -r iface cidr; do
  test -n "${iface:-}" || continue
  addr="${cidr%%/*}"
  case "$addr" in
    ::1|fe80:*|fc*|fd*|2001:db8:*) continue ;;
  esac
  candidate_count=$((candidate_count + 1))
  echo "public_ipv6_candidate_interface=$iface"
  echo "public_ipv6_candidate_address=$addr"
  ip -6 route get 2606:4700:4700::1111 from "$addr" 2>/dev/null || true
done < <(
  ip -6 -o addr show scope global |
    awk '{print $2, $4}'
)
echo "public_ipv6_candidate_count=$candidate_count"

echo
echo "=== VOID LISTENERS ==="
ss -H -ltnp 2>/dev/null | grep -E '(:4100|:4700)([[:space:]]|$)' || true
if ss -H -ltn 2>/dev/null | awk '{print $4}' | grep -Eq '^\[::\]:4700$|^\*:\?*4700$'; then
  echo "p2p_ipv6_listener_candidate=true"
else
  echo "p2p_ipv6_listener_candidate=false"
fi

echo
echo "=== VOID UNIT STATE ==="
for unit in   void-nimo-tor-bootstrap-node-v5.service   void-public-seed-tor-gateway-v1.service   void-public-seed-tor-v1.service
do
  echo "unit=$unit"
  systemctl --user show "$unit"     -p LoadState -p ActiveState -p SubState -p MainPID -p Result     --no-pager 2>/dev/null || true
done

echo
echo "=== LOCAL READINESS ==="
if body="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$READY_URL" 2>/dev/null)"; then
  echo "readiness=$body"
else
  echo "readiness_unavailable=true"
fi

echo
echo "${MARKER}_GREEN"
if test "$candidate_count" -gt 0; then
  echo "next_gate=external_ipv6_p2p_probe"
else
  echo "next_gate=use_tor_p2p_fallback_or_other_free_failure_domain"
fi
