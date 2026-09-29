#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  echo "run this installer with bash; do not source it" >&2
  return 2
fi

MARKER="VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_INSTALL_V1"
ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_HOST="${VOID_EPOCH2_PUBLIC_READ_HOSTNAME:-zoso-Precision-Tower-7810}"
STATE_DIR="$HOME/.local/state/void-economic-epoch2-public-read-runtime-v1"
GENESIS="$STATE_DIR/genesis.json"
GENESIS_EVIDENCE="$STATE_DIR/genesis-builder-evidence.json"
STATE_MANIFEST="$ROOT/public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json"
QBFT_EXTRA_DATA="$ROOT/ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json"
STATE_MANIFEST_SHA="affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9"
QBFT_EXTRA_DATA_FILE_SHA="c4a98142cc09ddc2c2a2036ffe5a59a1f7e06ff4b213a2d09f39d20bb698adee"
EXPECTED_GENESIS_SHA="6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941"
BESU_IMAGE="hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042"
REPLICA_UNIT="void-economic-epoch2-successor-read-replica-v1.service"
READ_UNIT="void-economic-epoch2-public-read-runtime-v1.service"
COMPOSITION_UNIT="${VOID_EPOCH2_PUBLIC_COMPOSITION_SERVICE:-void-public-app-composition-gateway-v1.service}"
UNIT_DIR="$HOME/.config/systemd/user"
REPLICA_UNIT_PATH="$UNIT_DIR/$REPLICA_UNIT"
READ_UNIT_PATH="$UNIT_DIR/$READ_UNIT"
COMPOSITION_UNIT_PATH="$UNIT_DIR/$COMPOSITION_UNIT"
COMPOSITION_UNIT_TEMPLATE="$ROOT/ops/systemd/user/void-public-app-composition-gateway-v1.service.example"
COMPOSITION_DROPIN_DIR="$UNIT_DIR/$COMPOSITION_UNIT.d"
COMPOSITION_DROPIN="$COMPOSITION_DROPIN_DIR/70-epoch2-public-economic-read-v1.conf"
RPC_PORT="18552"
READ_PORT="4124"
APPLY="${APPLY:-0}"
START_SERVICES="${START_SERVICES:-0}"
RESTART_COMPOSITION="${RESTART_COMPOSITION:-0}"
CONFIRM="${CONFIRM:-}"
EXPECTED_CONFIRM="installEpoch2PublicEconomicReadRuntimeV1"

say(){ printf '%s\n' "$*"; }
die(){ say "$MARKER HOLD: $*" >&2; exit 1; }

say "$MARKER"
say "production_rpc_contact=false"
say "raw_public_rpc_allowed=false"
say "transaction_submission=false"
say "transaction_broadcast=false"
say "authoritative_chain2050_write=false"
say "funds_movement=false"

for cmd in git node docker curl grep ln readlink rm seq sleep sha256sum ss systemctl; do
  command -v "$cmd" >/dev/null 2>&1 || die "required_command_missing:$cmd"
done

test "$(hostname)" = "$EXPECTED_HOST" || die "wrong_host"
test -d "$ROOT/.git" || die "repo_missing"
cd "$ROOT"
test "$(git branch --show-current)" = "main" || die "main_branch_required"
test -z "$(git status --porcelain=v1 --untracked-files=all)" ||
  die "clean_worktree_required"
test -f "$STATE_MANIFEST" || die "state_manifest_missing"
test -f "$QBFT_EXTRA_DATA" || die "qbft_extra_data_missing"
test -f "$COMPOSITION_UNIT_TEMPLATE" || die "composition_unit_template_missing"
test "$(sha256sum "$STATE_MANIFEST" | awk '{print $1}')" = "$STATE_MANIFEST_SHA" ||
  die "state_manifest_sha256_mismatch"
test "$(sha256sum "$QBFT_EXTRA_DATA" | awk '{print $1}')" = "$QBFT_EXTRA_DATA_FILE_SHA" ||
  die "qbft_extra_data_sha256_mismatch"

node_bin="$(readlink -f "$(command -v node)")"
docker_bin="$(readlink -f "$(command -v docker)")"
docker_context="$("$docker_bin" context show 2>/dev/null || true)"
test -n "$docker_context" || die "docker_context_unresolved"
docker_host="$("$docker_bin" context inspect "$docker_context" \
  --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)"
case "$docker_host" in
  unix:///*) ;;
  *) die "local_unix_docker_host_required:$docker_host" ;;
esac
docker_socket="${docker_host#unix://}"
test -S "$docker_socket" || die "docker_socket_missing:$docker_socket"
"$docker_bin" version --format 'client={{.Client.Version}} server={{.Server.Version}}' \
  >/dev/null 2>&1 || die "docker_runtime_unreachable"

besu_uid="$(
  "$docker_bin" run --rm \
    --entrypoint /bin/sh \
    "$BESU_IMAGE" \
    -lc 'id -u besu'
)"
besu_gid="$(
  "$docker_bin" run --rm \
    --entrypoint /bin/sh \
    "$BESU_IMAGE" \
    -lc 'id -g besu'
)"
test "$besu_uid" = "1000" || die "unexpected_besu_uid:$besu_uid"
test "$besu_gid" = "1000" || die "unexpected_besu_gid:$besu_gid"

if [ "$APPLY" != "0" ] && [ "$APPLY" != "1" ]; then
  die "APPLY_must_be_0_or_1"
fi
if [ "$START_SERVICES" != "0" ] && [ "$START_SERVICES" != "1" ]; then
  die "START_SERVICES_must_be_0_or_1"
fi
if [ "$RESTART_COMPOSITION" != "0" ] && [ "$RESTART_COMPOSITION" != "1" ]; then
  die "RESTART_COMPOSITION_must_be_0_or_1"
fi
if [ "$RESTART_COMPOSITION" = "1" ] && [ "$START_SERVICES" != "1" ]; then
  die "composition_restart_requires_started_local_services"
fi

say "state_manifest_sha256=$STATE_MANIFEST_SHA"
say "qbft_extra_data_file_sha256=$QBFT_EXTRA_DATA_FILE_SHA"
say "expected_genesis_sha256=$EXPECTED_GENESIS_SHA"
say "besu_image=$BESU_IMAGE"
say "docker_context=$docker_context"
say "docker_host=$docker_host"
say "besu_uid=$besu_uid"
say "besu_gid=$besu_gid"
say "replica_rpc=http://127.0.0.1:$RPC_PORT/"
say "bounded_read_runtime=http://127.0.0.1:$READ_PORT/"
say "composition_dropin=$COMPOSITION_DROPIN"
say "apply=$APPLY"
say "start_services=$START_SERVICES"
say "restart_composition=$RESTART_COMPOSITION"

if [ "$APPLY" = "0" ]; then
  say "status=PLAN_READY"
  say "required_confirmation=$EXPECTED_CONFIRM"
  say "${MARKER}_PLAN_GREEN"
  exit 0
fi

test "$CONFIRM" = "$EXPECTED_CONFIRM" || die "explicit_confirmation_required"

mkdir -p "$STATE_DIR" "$UNIT_DIR" "$COMPOSITION_DROPIN_DIR"
chmod 0700 "$STATE_DIR"

tmp="$(mktemp -d "${TMPDIR:-/tmp}/void-epoch2-public-read-install.XXXXXX")"
cleanup(){ rm -rf "$tmp"; }
trap cleanup EXIT INT TERM

node tools/void-economic-epoch2-besu-genesis-builder-v1.mjs \
  --state-manifest "$STATE_MANIFEST" \
  --qbft-production-extra-data "$QBFT_EXTRA_DATA" \
  --out-genesis "$tmp/genesis.json" \
  --out-evidence "$tmp/genesis-evidence.json" \
  --apply \
  --confirmation buildEpoch2BesuGenesisCandidate \
  >"$tmp/genesis-builder-output.json"

test "$(sha256sum "$tmp/genesis.json" | awk '{print $1}')" = "$EXPECTED_GENESIS_SHA" ||
  die "production_genesis_sha256_mismatch"

install -m 0644 "$tmp/genesis.json" "$GENESIS"
install -m 0600 "$tmp/genesis-evidence.json" "$GENESIS_EVIDENCE"

cat >"$tmp/$REPLICA_UNIT" <<UNIT
[Unit]
Description=VOID Epoch-2 inactive successor read replica v1

[Service]
Type=simple
Environment=DOCKER_HOST=$docker_host
ExecStartPre=-$docker_bin rm -f void-epoch2-successor-read-replica-v1
ExecStart=$docker_bin run --rm --name void-epoch2-successor-read-replica-v1 --user $besu_uid:$besu_gid --entrypoint /opt/besu/bin/besu --cap-drop=ALL --security-opt=no-new-privileges:true --read-only --tmpfs /tmp:rw,exec,nosuid,nodev,size=128m,mode=1777 --tmpfs /var/lib/besu:rw,nosuid,nodev,size=512m,uid=$besu_uid,gid=$besu_gid,mode=700 -v $GENESIS:/config/genesis.json:ro -p 127.0.0.1:$RPC_PORT:8545 $BESU_IMAGE --genesis-file=/config/genesis.json --data-path=/var/lib/besu --network-id=2050 --p2p-enabled=false --discovery-enabled=false --rpc-http-enabled=true --rpc-http-host=0.0.0.0 --rpc-http-port=8545 --rpc-http-api=ETH,NET,WEB3 --host-allowlist=* --min-gas-price=0 --tx-pool-enable-balance-check=false
ExecStop=-$docker_bin stop -t 5 void-epoch2-successor-read-replica-v1
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
# Precision independent systemd-run probes proved that mount-namespace
# hardening on this Docker-launching wrapper breaks access to the rootless
# daemon socket: PrivateTmp=yes, ProtectSystem=strict, and ReadOnlyPaths= each
# independently return EACCES for unix:///run/user/<uid>/docker.sock.
# Do not add mount-namespace directives here. The launched Besu container
# bypasses the root entrypoint and runs directly as the pinned image's besu
# uid/gid. It remains read-only, cap-drop=ALL, no-new-privileges,
# P2P/discovery disabled, and exposes RPC only on 127.0.0.1. /tmp is the only
# executable tmpfs because JNA/native libraries must be mapped from there.
RestrictSUIDSGID=true
KillMode=control-group
TimeoutStopSec=15

[Install]
WantedBy=default.target
UNIT

cat >"$tmp/$READ_UNIT" <<UNIT
[Unit]
Description=VOID Epoch-2 bounded public economic read runtime v1
Requires=$REPLICA_UNIT
After=$REPLICA_UNIT

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment=VOID_EPOCH2_PUBLIC_READ_HOST=127.0.0.1
Environment=VOID_EPOCH2_PUBLIC_READ_PORT=$READ_PORT
Environment=VOID_EPOCH2_SUCCESSOR_RPC_ENDPOINT=http://127.0.0.1:$RPC_PORT/
ExecStart=$node_bin $ROOT/ops/public/void-economic-epoch2-public-read-runtime-v1.mjs
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadOnlyPaths=$ROOT
RestrictAddressFamilies=AF_UNIX AF_INET
RestrictSUIDSGID=true
LockPersonality=true
UMask=0077
KillMode=mixed
TimeoutStopSec=10

[Install]
WantedBy=default.target
UNIT

cat >"$tmp/70-epoch2-public-economic-read-v1.conf" <<DROPIN
[Unit]
Wants=$READ_UNIT
After=$READ_UNIT

[Service]
Environment=VOID_EPOCH2_PUBLIC_READ_UPSTREAM=http://127.0.0.1:$READ_PORT/
Environment=VOID_PUBLIC_NODE_LABEL=Precision public seed
DROPIN

install -m 0644 "$tmp/$REPLICA_UNIT" "$REPLICA_UNIT_PATH"
install -m 0644 "$tmp/$READ_UNIT" "$READ_UNIT_PATH"

verify_recovery_composition_candidate() {
  local candidate="$1"
  local fragment working exec_start env status main_pid listener

  systemctl --user is-active --quiet "$candidate" ||
    die "recovery_composition_not_active:$candidate"

  fragment="$(systemctl --user show "$candidate" -p FragmentPath --value)"
  working="$(systemctl --user show "$candidate" -p WorkingDirectory --value)"
  exec_start="$(systemctl --user show "$candidate" -p ExecStart --value)"
  env="$(systemctl --user show "$candidate" -p Environment --value)"
  main_pid="$(systemctl --user show "$candidate" -p MainPID --value)"

  [ "$fragment" = "$UNIT_DIR/$candidate" ] ||
    die "recovery_composition_fragment_unexpected:$fragment"
  [ "$working" = "$ROOT" ] ||
    die "recovery_composition_workdir_unexpected:$working"

  case "$exec_start" in
    *"/usr/bin/node $ROOT/ops/public/void-public-app-composition-gateway-v1.mjs"*) ;;
    *) die "recovery_composition_exec_unexpected" ;;
  esac
  case " $env " in
    *" VOID_COMPOSITION_HOST=127.0.0.1 "*) ;;
    *) die "recovery_composition_host_unexpected" ;;
  esac
  case " $env " in
    *" VOID_COMPOSITION_PORT=8082 "*) ;;
    *) die "recovery_composition_port_unexpected" ;;
  esac
  case " $env " in
    *" VOID_PUBLIC_GATEWAY_UPSTREAM=http://127.0.0.1:8080 "*) ;;
    *) die "recovery_composition_public_upstream_unexpected" ;;
  esac
  case " $env " in
    *" VOID_NODE_UPSTREAM=http://127.0.0.1:4100 "*) ;;
    *) die "recovery_composition_node_upstream_unexpected" ;;
  esac
  case "$env" in
    *"VOID_PUBLIC_NODE_LABEL=Precision public seed"*) ;;
    *) die "recovery_composition_node_label_unexpected" ;;
  esac

  case "$main_pid" in
    ''|*[!0-9]*) die "recovery_composition_main_pid_invalid:$main_pid" ;;
  esac
  [ "$main_pid" -gt 1 ] ||
    die "recovery_composition_main_pid_invalid:$main_pid"

  listener="$(ss -ltnp 2>/dev/null | grep '127.0.0.1:8082' || true)"
  printf '%s' "$listener" | grep -q "pid=$main_pid," ||
    die "recovery_composition_does_not_own_8082:$main_pid"

  status="$(curl -fsS --max-time 3 \
    http://127.0.0.1:8082/__void/public-app/network.json 2>/dev/null || true)"
  printf '%s' "$status" |
    grep -q '"marker"[[:space:]]*:[[:space:]]*"VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1"' ||
    die "recovery_composition_runtime_marker_missing"
}

composition_installed_by_this_run=0
composition_adopted_from=""
composition_effective_dropin=""

discover_active_recovery_compositions() {
  recovery_candidates=()
  local candidate_path candidate
  for candidate_path in "$UNIT_DIR"/void-web-recovery-composition-*.service; do
    [ -f "$candidate_path" ] || continue
    candidate="${candidate_path##*/}"
    if systemctl --user is-active --quiet "$candidate"; then
      recovery_candidates+=("$candidate")
    fi
  done
}

if [ -L "$COMPOSITION_UNIT_PATH" ]; then
  candidate="$(readlink "$COMPOSITION_UNIT_PATH")"
  candidate="${candidate##*/}"
  case "$candidate" in
    void-web-recovery-composition-*.service) ;;
    *) die "canonical_composition_alias_target_unexpected:$candidate" ;;
  esac
  verify_recovery_composition_candidate "$candidate"
  composition_adopted_from="$candidate"

elif [ -f "$COMPOSITION_UNIT_PATH" ]; then
  discover_active_recovery_compositions

  if [ "${#recovery_candidates[@]}" -eq 1 ]; then
    candidate="${recovery_candidates[0]}"
    verify_recovery_composition_candidate "$candidate"

    canonical_fragment="$(systemctl --user show "$COMPOSITION_UNIT" -p FragmentPath --value 2>/dev/null || true)"
    [ "$canonical_fragment" = "$COMPOSITION_UNIT_PATH" ] ||
      die "stale_canonical_composition_fragment_unexpected:$canonical_fragment"

    systemctl --user stop "$COMPOSITION_UNIT" 2>/dev/null || true
    systemctl --user disable "$COMPOSITION_UNIT" >/dev/null 2>&1 || true
    systemctl --user reset-failed "$COMPOSITION_UNIT" 2>/dev/null || true

    rm -f "$COMPOSITION_UNIT_PATH"
    ln -s "$candidate" "$COMPOSITION_UNIT_PATH"
    composition_adopted_from="$candidate"
  fi

elif ! systemctl --user cat "$COMPOSITION_UNIT" >/dev/null 2>&1; then
  discover_active_recovery_compositions

  case "${#recovery_candidates[@]}" in
    0)
      install -m 0644 "$COMPOSITION_UNIT_TEMPLATE" "$COMPOSITION_UNIT_PATH"
      composition_installed_by_this_run=1
      ;;
    1)
      candidate="${recovery_candidates[0]}"
      verify_recovery_composition_candidate "$candidate"

      [ ! -e "$COMPOSITION_UNIT_PATH" ] && [ ! -L "$COMPOSITION_UNIT_PATH" ] ||
        die "canonical_composition_path_already_exists_but_not_loadable"

      ln -s "$candidate" "$COMPOSITION_UNIT_PATH"
      composition_adopted_from="$candidate"
      ;;
    *)
      die "canonical_composition_missing_and_active_recovery_candidate_count:${#recovery_candidates[@]}"
      ;;
  esac
fi

install -m 0644 \
  "$tmp/70-epoch2-public-economic-read-v1.conf" \
  "$COMPOSITION_DROPIN"

if [ -n "$composition_adopted_from" ]; then
  composition_effective_dropin_dir="$UNIT_DIR/$composition_adopted_from.d"
  composition_effective_dropin="$composition_effective_dropin_dir/70-epoch2-public-economic-read-v1.conf"
  mkdir -p "$composition_effective_dropin_dir"
  install -m 0644 \
    "$tmp/70-epoch2-public-economic-read-v1.conf" \
    "$composition_effective_dropin"
fi

systemctl --user daemon-reload
systemctl --user cat "$COMPOSITION_UNIT" >/dev/null ||
  die "composition_service_not_loadable_after_install_or_adoption"

if [ -n "$composition_adopted_from" ]; then
  systemctl --user enable "$REPLICA_UNIT" "$READ_UNIT" >/dev/null
else
  systemctl --user enable "$REPLICA_UNIT" "$READ_UNIT" "$COMPOSITION_UNIT" >/dev/null
fi

if [ "$START_SERVICES" = "1" ]; then
  systemctl --user restart "$REPLICA_UNIT"
  for _ in $(seq 1 60); do
    if curl -fsS --max-time 2 \
      -H 'content-type: application/json' \
      --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
      "http://127.0.0.1:$RPC_PORT/" \
      | grep -q '"result":"0x802"'
    then
      break
    fi
    sleep 0.5
  done
  curl -fsS --max-time 3 \
    -H 'content-type: application/json' \
    --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
    "http://127.0.0.1:$RPC_PORT/" \
    | grep -q '"result":"0x802"' ||
    die "read_replica_not_ready"

  systemctl --user restart "$READ_UNIT"
  for _ in $(seq 1 40); do
    if curl -fsS --max-time 2 \
      "http://127.0.0.1:$READ_PORT/public-node/economic/epoch2/read-status-v1.json" \
      >/dev/null 2>&1
    then
      break
    fi
    sleep 0.25
  done
  curl -fsS --max-time 3 \
    "http://127.0.0.1:$READ_PORT/public-node/economic/epoch2/read-status-v1.json" \
    >/dev/null ||
    die "bounded_read_runtime_not_ready"
fi

if [ "$RESTART_COMPOSITION" = "1" ]; then
  systemctl --user cat "$COMPOSITION_UNIT" >/dev/null ||
    die "composition_service_not_found:$COMPOSITION_UNIT"

  composition_restart_unit="$COMPOSITION_UNIT"
  if [ -n "$composition_adopted_from" ]; then
    composition_restart_unit="$composition_adopted_from"
  fi
  systemctl --user restart "$composition_restart_unit"

  for _ in $(seq 1 40); do
    if curl -fsS --max-time 2 \
      "http://127.0.0.1:8082/public-node/economic/epoch2/read-status-v1.json" \
      >/dev/null 2>&1
    then
      break
    fi
    sleep 0.25
  done
  curl -fsS --max-time 3 \
    "http://127.0.0.1:8082/public-node/economic/epoch2/read-status-v1.json" \
    >/dev/null ||
    die "composition_epoch2_read_route_not_ready"
fi

say "genesis_sha256=$(sha256sum "$GENESIS" | awk '{print $1}')"
say "replica_unit=$REPLICA_UNIT_PATH"
say "read_unit=$READ_UNIT_PATH"
say "composition_unit=$COMPOSITION_UNIT_PATH"
say "composition_installed_by_this_run=$composition_installed_by_this_run"
say "composition_adopted_from=${composition_adopted_from:-none}"
say "composition_dropin=$COMPOSITION_DROPIN"
say "composition_effective_dropin=${composition_effective_dropin:-none}"
say "production_successor_rpc_endpoint_selected=true"
say "raw_public_rpc_allowed=false"
say "transaction_submission=false"
say "transaction_broadcast=false"
say "authoritative_chain2050_write=false"
say "migration_authorized=false"
say "public_activation_authorized=false"
say "funds_movement=false"
say "${MARKER}_GREEN"