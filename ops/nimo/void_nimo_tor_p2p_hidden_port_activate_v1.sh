#!/usr/bin/env bash
set -euo pipefail
umask 077

MARKER="VOID_NIMO_TOR_P2P_HIDDEN_PORT_ACTIVATE_V1"
TOR_UNIT="void-public-seed-tor-v1.service"
NODE_UNIT="void-nimo-tor-bootstrap-node-v5.service"
TORRC="$HOME/.config/void/tor-public-seed-v1/torrc"
HOSTNAME_FILE="$HOME/.local/share/void/tor-public-seed-v1/hidden-service/hostname"
EXPECTED_ONION="6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion"
HTTP_READY="http://127.0.0.1:4100/__void/ready.json"
HELLO_URL="http://127.0.0.1:4100/p2p/hello-now"
P2P_LINE="HiddenServicePort 4700 127.0.0.1:4700"

echo "$MARKER"
echo "tor_config_mutation=true"
echo "tor_service_restart=true"
echo "void_node_restart=false"
echo "gateway_service_restart=false"
echo "tor_identity_preserved=true"
echo "hidden_service_http_port_preserved=true"
echo "hidden_service_p2p_port_added=true"
echo "router_mutation=false"
echo "firewall_mutation=false"
echo "private_key_content_read=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "funds_movement=false"

for cmd in systemctl curl grep cp stat tor node; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "REFUSE: missing command: $cmd" >&2
    exit 2
  }
done

test -f "$TORRC" && test ! -L "$TORRC" || {
  echo "REFUSE: Tor config missing or symlinked" >&2
  exit 3
}
test -f "$HOSTNAME_FILE" && test ! -L "$HOSTNAME_FILE" || {
  echo "REFUSE: onion hostname missing or symlinked" >&2
  exit 3
}

before_onion="$(tr -d '\r\n' < "$HOSTNAME_FILE")"
test "$before_onion" = "$EXPECTED_ONION" || {
  echo "REFUSE: unexpected onion identity: $before_onion" >&2
  exit 3
}

systemctl --user is-active --quiet "$TOR_UNIT" || {
  echo "REFUSE: Tor service is not active" >&2
  exit 3
}
systemctl --user is-active --quiet "$NODE_UNIT" || {
  echo "REFUSE: Nimo VOID node service is not active" >&2
  exit 3
}

before_ready="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$HTTP_READY")"
READY_JSON="$before_ready" node -e '
  const v=JSON.parse(process.env.READY_JSON);
  if(v?.ready!==true || v?.gap!==0 || v?.txroot_live!==1 ||
     !Number.isSafeInteger(v?.head) || v.head<=0) process.exit(1);
  console.log(`pre_head=${v.head}`);
  console.log("pre_exact_green=true");
'

http_count="$(grep -Fxc 'HiddenServicePort 80 127.0.0.1:4111' "$TORRC" || true)"
test "$http_count" -eq 1 || {
  echo "REFUSE: expected exactly one HTTP hidden-service mapping, got $http_count" >&2
  exit 3
}

p2p_count="$(grep -Fxc "$P2P_LINE" "$TORRC" || true)"
case "$p2p_count" in
  0|1) ;;
  *)
    echo "REFUSE: duplicate P2P hidden-service mapping already present" >&2
    exit 3
    ;;
esac

backup="$HOME/.local/state/void/tor-public-seed-v1/torrc-before-p2p-v1"
mkdir -p "$(dirname "$backup")"
if test ! -e "$backup"; then
  cp -- "$TORRC" "$backup"
  chmod 600 "$backup"
else
  test -f "$backup" && test ! -L "$backup" || {
    echo "REFUSE: backup path is unsafe" >&2
    exit 3
  }
fi
echo "torrc_backup=$backup"

if test "$p2p_count" -eq 0; then
  tmp="${TORRC}.p2p-v1.tmp"
  test ! -e "$tmp" || rm -f -- "$tmp"
  awk -v line="$P2P_LINE" '
    BEGIN { inserted=0 }
    {
      if (!inserted && $0 == "") {
        print line
        inserted=1
      }
      print
    }
    END {
      if (!inserted) {
        print ""
        print line
      }
    }
  ' "$TORRC" >"$tmp"
  chmod 600 "$tmp"
  mv -- "$tmp" "$TORRC"
  echo "torrc_mutated=true"
else
  echo "torrc_mutated=false"
fi

test "$(grep -Fxc 'HiddenServicePort 80 127.0.0.1:4111' "$TORRC" || true)" -eq 1 || {
  echo "REFUSE: HTTP hidden-service mapping changed" >&2
  exit 4
}
test "$(grep -Fxc "$P2P_LINE" "$TORRC" || true)" -eq 1 || {
  echo "REFUSE: P2P hidden-service mapping not exactly present" >&2
  exit 4
}

tor --verify-config -f "$TORRC"
echo "tor_config_verified=true"

start_epoch="$(date +%s)"
systemctl --user restart "$TOR_UNIT"
echo "tor_restart_issued=true"

for i in $(seq 1 180); do
  if systemctl --user is-active --quiet "$TOR_UNIT"; then
    if journalctl --user -u "$TOR_UNIT" --since "@$start_epoch" --no-pager 2>/dev/null |
      grep -Fq 'Bootstrapped 100% (done): Done'; then
      echo "tor_bootstrap_100=true"
      break
    fi
  fi
  if (( i == 180 )); then
    echo "REFUSE: Tor did not return to 100% bootstrap" >&2
    journalctl --user -u "$TOR_UNIT" --since "@$start_epoch" --no-pager >&2 || true
    exit 4
  fi
  sleep 1
done

after_onion="$(tr -d '\r\n' < "$HOSTNAME_FILE")"
test "$after_onion" = "$before_onion" || {
  echo "REFUSE: onion identity changed across Tor restart" >&2
  exit 4
}
echo "onion_hostname=$after_onion"
echo "onion_identity_unchanged=true"

sleep 3

after_ready="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$HTTP_READY")"
READY_JSON="$after_ready" node -e '
  const v=JSON.parse(process.env.READY_JSON);
  if(v?.ready!==true || v?.gap!==0 || v?.txroot_live!==1 ||
     !Number.isSafeInteger(v?.head) || v.head<=0) process.exit(1);
  console.log(`post_head=${v.head}`);
  console.log("post_exact_green=true");
'

hello="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$HELLO_URL")"
HELLO_JSON="$hello" node -e '
  const v=JSON.parse(process.env.HELLO_JSON);
  if(v?.ok!==true || !/^[0-9a-f]{32}$/.test(String(v?.id||""))) process.exit(1);
  console.log(`nimo_node_id=${v.id}`);
  console.log(`nimo_listen=${JSON.stringify(v.listen||[])}`);
  console.log(`nimo_connected_peer_ids=${JSON.stringify((v.connected||[]).map(x=>x?.id).filter(Boolean).sort())}`);
'

echo "hidden_service_http_virtual_port=80"
echo "hidden_service_p2p_virtual_port=4700"
echo "hidden_service_p2p_target=127.0.0.1:4700"
echo "${MARKER}_GREEN"
echo "next_gate=external_tor_p2p_authentication_probe"
