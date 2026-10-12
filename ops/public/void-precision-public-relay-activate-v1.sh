#!/usr/bin/env bash
set -euo pipefail
umask 077

MARKER="VOID_PRECISION_PUBLIC_RELAY_ACTIVATE_V1"
ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
UNIT="void-node-live.service"
RELAY_UNIT="void-public-relay-natpmp-v1.service"
SYSTEMD_DIR="$HOME/.config/systemd/user"
DROPIN_DIR="$SYSTEMD_DIR/$UNIT.d"
DROPIN="$DROPIN_DIR/40-public-relay-v1.conf"
ADVERTISE_TRUTH="$DROPIN_DIR/~VOID-P2P-ADVERTISEMENT-TRUTH-V1.conf"
RELAY_UNIT_PATH="$SYSTEMD_DIR/$RELAY_UNIT"
WAN="24.40.99.171"
GATEWAY="192.168.1.1"
IFACE="enp11s0"
NODE_ID="9d89483769e469e0473b489dc50dba96"
TCP_PORT="4700"
UDP_PORT="4711"
HELPER="$ROOT/ops/public/void-public-relay-natpmp-v1.mjs"

echo "$MARKER"
echo "repo=$ROOT"
echo "node_unit=$UNIT"
echo "natpmp_unit=$RELAY_UNIT"
echo "public_tcp_endpoint=$WAN:$TCP_PORT"
echo "public_udp_endpoint=$WAN:$UDP_PORT"
echo "expected_node_id=$NODE_ID"
echo "systemd_dropin_mutation=true"
echo "advertisement_truth_mutation=true"
echo "ufw_mutation=true"
echo "nat_pmp_mapping_mutation=true"
echo "service_restart=true"
echo "repository_mutation=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "funds_movement=false"

for cmd in git node systemctl journalctl sudo ufw curl ss ip; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "REFUSE: missing command: $cmd" >&2
    exit 2
  }
done

test -d "$ROOT/.git" || { echo "REFUSE: repo missing: $ROOT" >&2; exit 2; }
test -f "$HELPER" || { echo "REFUSE: canonical NAT-PMP helper missing: $HELPER" >&2; exit 2; }

branch="$(git -C "$ROOT" branch --show-current)"
status="$(git -C "$ROOT" status --porcelain=v1)"
head="$(git -C "$ROOT" rev-parse HEAD)"
test "$branch" = "main" || { echo "REFUSE: repo branch is not main: $branch" >&2; exit 3; }
test -z "$status" || { echo "REFUSE: repo is dirty" >&2; exit 3; }
echo "repo_head=$head"

default_line="$(ip -4 route show default | head -n1 || true)"
actual_gateway="$(awk '{for(i=1;i<=NF;i++) if($i=="via"){print $(i+1); exit}}' <<<"$default_line")"
actual_iface="$(awk '{for(i=1;i<=NF;i++) if($i=="dev"){print $(i+1); exit}}' <<<"$default_line")"
actual_local_ip="$(awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}' <<<"$default_line")"
test "$actual_gateway" = "$GATEWAY" || { echo "REFUSE: gateway changed: $actual_gateway" >&2; exit 3; }
test "$actual_iface" = "$IFACE" || { echo "REFUSE: interface changed: $actual_iface" >&2; exit 3; }
printf '%s\n' "$actual_local_ip" | grep -Eq '^192\.168\.1\.[0-9]{1,3}$' || {
  echo "REFUSE: unexpected local IPv4: $actual_local_ip" >&2
  exit 3
}

health="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 http://127.0.0.1:4100/health)"
HEALTH_JSON="$health" EXPECTED_ID="$NODE_ID" node --input-type=module <<'NODE'
const value=JSON.parse(process.env.HEALTH_JSON);
const id=value?.nodeId ?? value?.node_id ?? null;
if(id!==process.env.EXPECTED_ID) throw new Error(`node id mismatch: ${id}`);
if(value?.p2p!==4700) throw new Error(`P2P port mismatch: ${value?.p2p}`);
console.log(`pre_node_id=${id}`);
console.log(`pre_listen=${JSON.stringify(value?.listen ?? [])}`);
NODE

systemctl --user is-active "$UNIT" >/dev/null || {
  echo "REFUSE: $UNIT is not active" >&2
  exit 3
}

NODE_ENV=production \
VOID_PUBLIC_RELAY_EXPECTED_WAN_IPV4="$WAN" \
VOID_PUBLIC_RELAY_EXPECTED_GATEWAY="$GATEWAY" \
VOID_PUBLIC_RELAY_EXPECTED_IFACE="$IFACE" \
VOID_PUBLIC_RELAY_TCP_PORT="$TCP_PORT" \
VOID_PUBLIC_RELAY_UDP_PORT="$UDP_PORT" \
node "$HELPER" --probe

sudo -v

existing_tcp="$(sudo ufw status | grep -E "${TCP_PORT}/tcp on ${IFACE}" || true)"
existing_udp="$(sudo ufw status | grep -E "${UDP_PORT}/udp on ${IFACE}" || true)"
if [ -n "$existing_tcp" ] || [ -n "$existing_udp" ]; then
  echo "REFUSE: public relay UFW rule already exists; reconcile before activation" >&2
  printf '%s\n%s\n' "$existing_tcp" "$existing_udp" >&2
  exit 3
fi

test ! -e "$DROPIN" || { echo "REFUSE: drop-in already exists: $DROPIN" >&2; exit 3; }
test ! -e "$RELAY_UNIT_PATH" || { echo "REFUSE: relay unit already exists: $RELAY_UNIT_PATH" >&2; exit 3; }
test -f "$ADVERTISE_TRUTH" || { echo "REFUSE: advertisement truth file missing: $ADVERTISE_TRUTH" >&2; exit 3; }
test ! -L "$ADVERTISE_TRUTH" || { echo "REFUSE: advertisement truth file must not be a symlink" >&2; exit 3; }
grep -Fxq '[Service]' "$ADVERTISE_TRUTH" || { echo "REFUSE: advertisement truth service section missing" >&2; exit 3; }
grep -Fxq 'Environment=P2P_ADVERTISE_HOST=100.122.245.125' "$ADVERTISE_TRUTH" || {
  echo "REFUSE: expected current P2P advertise truth is absent" >&2
  exit 3
}
grep -Fxq 'Environment=VOID_P2P_ADVERTISE_HOST=100.122.245.125' "$ADVERTISE_TRUTH" || {
  echo "REFUSE: expected current VOID P2P advertise truth is absent" >&2
  exit 3
}
truth_advertise_count="$(grep -Ec '^[[:space:]]*Environment=(P2P_ADVERTISE_HOST|VOID_P2P_ADVERTISE_HOST)=' "$ADVERTISE_TRUTH" || true)"
test "$truth_advertise_count" -eq 2 || {
  echo "REFUSE: advertisement truth contains unexpected advertise assignments: $truth_advertise_count" >&2
  exit 3
}

backup_dir="$HOME/.local/share/void/public-relay-activation-v1/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
systemctl --user cat "$UNIT" >"$backup_dir/void-node-live.before.txt"
cp -- "$ADVERTISE_TRUTH" "$backup_dir/advertisement-truth.before.conf"
sudo ufw status numbered >"$backup_dir/ufw.before.txt"

rule_tcp=0
rule_udp=0
dropin_created=0
advertise_truth_modified=0
relay_unit_created=0
relay_enabled=0

rollback() {
  rc=$?
  trap - EXIT INT TERM HUP
  if [ "$rc" -eq 0 ]; then
    return
  fi
  set +e
  echo
  echo "=== ROLLBACK ==="
  systemctl --user disable --now "$RELAY_UNIT" >/dev/null 2>&1 || true
  if [ "$relay_unit_created" -eq 1 ]; then rm -f "$RELAY_UNIT_PATH"; fi
  if [ "$dropin_created" -eq 1 ]; then rm -f "$DROPIN"; fi
  if [ "$advertise_truth_modified" -eq 1 ]; then cp -- "$backup_dir/advertisement-truth.before.conf" "$ADVERTISE_TRUTH"; fi
  systemctl --user daemon-reload || true
  systemctl --user restart "$UNIT" || true
  if [ "$rule_udp" -eq 1 ]; then
    sudo ufw --force delete allow in on "$IFACE" proto udp from 0.0.0.0/0 to any port "$UDP_PORT" >/dev/null 2>&1 || true
  fi
  if [ "$rule_tcp" -eq 1 ]; then
    sudo ufw --force delete allow in on "$IFACE" proto tcp from 0.0.0.0/0 to any port "$TCP_PORT" >/dev/null 2>&1 || true
  fi
  echo "rollback_complete=true"
  exit "$rc"
}
trap rollback EXIT

mkdir -p "$DROPIN_DIR"
cat >"$DROPIN" <<EOF
[Service]
Environment=P2P_BIND_HOST=0.0.0.0
Environment=VOID_P2P_BIND_HOST=0.0.0.0
Environment=VOID_P2P_REACHABILITY_FAILURE_DOMAIN=precision-home-edge
Environment=VOID_P2P_RELAY_SERVER_ENABLED=1
Environment=VOID_P2P_UDP_SWARM_RUNTIME_ENABLED=1
Environment=VOID_P2P_UDP_SWARM_FAMILY=udp4
Environment=VOID_P2P_UDP_SWARM_BIND_HOST=0.0.0.0
Environment=VOID_P2P_UDP_SWARM_BIND_PORT=$UDP_PORT
Environment=VOID_P2P_UDP_SWARM_RELAY_ENDPOINT=$WAN:$UDP_PORT
Environment=VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED=0
Environment=VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES=
Environment=VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENABLED=0
EOF
dropin_created=1

cat >"$ADVERTISE_TRUTH" <<EOF
[Service]
Environment=P2P_ADVERTISE_HOST=$WAN
Environment=VOID_P2P_ADVERTISE_HOST=$WAN
EOF
advertise_truth_modified=1

cat >"$RELAY_UNIT_PATH" <<EOF
[Unit]
Description=VOID Precision public relay NAT-PMP lease v1
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment=VOID_PUBLIC_RELAY_EXPECTED_WAN_IPV4=$WAN
Environment=VOID_PUBLIC_RELAY_EXPECTED_GATEWAY=$GATEWAY
Environment=VOID_PUBLIC_RELAY_EXPECTED_IFACE=$IFACE
Environment=VOID_PUBLIC_RELAY_TCP_PORT=$TCP_PORT
Environment=VOID_PUBLIC_RELAY_UDP_PORT=$UDP_PORT
Environment=VOID_PUBLIC_RELAY_NATPMP_LIFETIME_SECONDS=600
Environment=VOID_PUBLIC_RELAY_NATPMP_RENEW_SECONDS=240
ExecStart=/usr/bin/node $HELPER --serve
Restart=always
RestartSec=30
TimeoutStopSec=10

[Install]
WantedBy=default.target
EOF
relay_unit_created=1

sudo ufw allow in on "$IFACE" proto tcp from 0.0.0.0/0 to any port "$TCP_PORT" comment "VOID_PUBLIC_RELAY_TCP4700_V1"
rule_tcp=1
sudo ufw allow in on "$IFACE" proto udp from 0.0.0.0/0 to any port "$UDP_PORT" comment "VOID_PUBLIC_RELAY_UDP4711_V1"
rule_udp=1

systemctl --user daemon-reload

effective_p2p_env="$(systemctl --user show "$UNIT" -p Environment --value --no-pager | tr ' ' '\n')"
printf '%s\n' "$effective_p2p_env" | grep -Fxq "P2P_ADVERTISE_HOST=$WAN" || {
  echo "REFUSE: effective P2P_ADVERTISE_HOST did not resolve to public WAN" >&2
  exit 4
}
printf '%s\n' "$effective_p2p_env" | grep -Fxq "VOID_P2P_ADVERTISE_HOST=$WAN" || {
  echo "REFUSE: effective VOID_P2P_ADVERTISE_HOST did not resolve to public WAN" >&2
  exit 4
}
echo "effective_public_advertisement_green=true"

systemctl --user enable --now "$RELAY_UNIT"
relay_enabled=1

for _ in $(seq 1 30); do
  systemctl --user is-active "$RELAY_UNIT" >/dev/null 2>&1 && break
  sleep 1
done
systemctl --user is-active "$RELAY_UNIT" >/dev/null || {
  systemctl --user status "$RELAY_UNIT" --no-pager || true
  echo "REFUSE: NAT-PMP lease service failed to activate" >&2
  exit 4
}

lease_green=0
for _ in $(seq 1 20); do
  if journalctl --user-unit "$RELAY_UNIT" -n 80 --no-pager 2>/dev/null |       grep -Fq "VOID_PUBLIC_RELAY_NATPMP_LEASE_V1_RENEW_GREEN"; then
    lease_green=1
    break
  fi
  sleep 1
done
if [ "$lease_green" -ne 1 ]; then
  systemctl --user status "$RELAY_UNIT" --no-pager || true
  journalctl --user-unit "$RELAY_UNIT" -n 80 --no-pager || true
  echo "REFUSE: NAT-PMP lease service did not prove a granted renewal" >&2
  exit 4
fi
echo "natpmp_initial_renew_green=true"

systemctl --user restart "$UNIT"

for _ in $(seq 1 45); do
  if systemctl --user is-active "$UNIT" >/dev/null 2>&1 && \
     curl -fsS --noproxy '*' --connect-timeout 1 --max-time 2 http://127.0.0.1:4100/health >/dev/null 2>&1 && \
     curl -fsS --noproxy '*' --connect-timeout 1 --max-time 2 http://127.0.0.1:4100/p2p/udp-swarm/runtime-v1 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

health_after="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 http://127.0.0.1:4100/health)"
runtime_after="$(curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 http://127.0.0.1:4100/p2p/udp-swarm/runtime-v1)"

HEALTH_JSON="$health_after" RUNTIME_JSON="$runtime_after" EXPECTED_ID="$NODE_ID" WAN="$WAN" node --input-type=module <<'NODE'
const health=JSON.parse(process.env.HEALTH_JSON);
const runtime=JSON.parse(process.env.RUNTIME_JSON);
const expectedId=process.env.EXPECTED_ID;
const wan=process.env.WAN;
if((health?.nodeId ?? health?.node_id)!==expectedId) throw new Error("post-restart node ID mismatch");
if(health?.p2p!==4700) throw new Error("post-restart P2P port mismatch");
if(!Array.isArray(health?.listen) || health.listen.length!==1 || health.listen[0]!==`${wan}:4700`) {
  throw new Error(`public P2P advertisement mismatch: ${JSON.stringify(health?.listen)}`);
}
if(runtime?.marker!=="VOID_P2P_UDP_SWARM_NODE_RUNTIME_MOUNT_V1") throw new Error("runtime marker mismatch");
if(runtime?.enabled!==true || runtime?.started!==true) throw new Error("UDP swarm runtime not started");
if(runtime?.role!=="rendezvous_relay") throw new Error(`unexpected runtime role: ${runtime?.role}`);
if(runtime?.family!=="udp4") throw new Error("runtime family mismatch");
if(runtime?.bound?.port!==4711) throw new Error(`runtime UDP port mismatch: ${runtime?.bound?.port}`);
if(runtime?.relay_public_endpoint_configured!==true) throw new Error("relay public endpoint not configured");
if(runtime?.orchestration?.enabled!==false) throw new Error("relay should not self-orchestrate routes");
if(runtime?.public_relay_introduction?.running===true) throw new Error("public introduction collector unexpectedly running");
console.log(`post_node_id=${expectedId}`);
console.log(`post_listen=${JSON.stringify(health.listen)}`);
console.log(`post_udp_role=${runtime.role}`);
console.log(`post_udp_bound_port=${runtime.bound.port}`);
console.log("post_public_introduction_running=false");
NODE

ss -H -ltnp | grep -E ":${TCP_PORT}[[:space:]]" >/dev/null || {
  echo "REFUSE: TCP/$TCP_PORT listener missing after restart" >&2
  exit 4
}
ss -H -lunp | grep -E ":${UDP_PORT}[[:space:]]" >/dev/null || {
  echo "REFUSE: UDP/$UDP_PORT listener missing after restart" >&2
  exit 4
}

sudo ufw status | grep -qE "${TCP_PORT}/tcp on ${IFACE}.*ALLOW" || {
  echo "REFUSE: persistent TCP UFW rule missing" >&2
  exit 4
}
sudo ufw status | grep -qE "${UDP_PORT}/udp on ${IFACE}.*ALLOW" || {
  echo "REFUSE: persistent UDP UFW rule missing" >&2
  exit 4
}

systemctl --user cat "$UNIT" >"$backup_dir/void-node-live.after.txt"
cp -- "$ADVERTISE_TRUTH" "$backup_dir/advertisement-truth.after.conf"
systemctl --user cat "$RELAY_UNIT" >"$backup_dir/natpmp-unit.after.txt"
sudo ufw status numbered >"$backup_dir/ufw.after.txt"
printf '%s\n' "$health_after" >"$backup_dir/health.after.json"
printf '%s\n' "$runtime_after" >"$backup_dir/udp-swarm.after.json"

trap - EXIT
echo "backup_dir=$backup_dir"
echo "natpmp_lease_service_active=true"
echo "persistent_tcp_4700_ufw_allow=true"
echo "persistent_udp_4711_ufw_allow=true"
echo "advertisement_truth_file=$ADVERTISE_TRUTH"
echo "public_p2p_advertisement=$WAN:$TCP_PORT"
echo "public_udp_relay_endpoint=$WAN:$UDP_PORT"
echo "external_reverification_required=true"
echo "second_independent_relay_required_for_n_minus_one=true"
echo "VOID_PRECISION_PUBLIC_RELAY_ACTIVATE_V1_GREEN"
