#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_TOR_ONION_TRANSPORT_V1"
BACKEND_UNIT="void-public-node-tor-backend-v1.service"
TOR_UNIT="void-tor-onion-transport-v1.service"
PURGE_CONFIRMATION="PURGE_VOID_TOR_ONION_IDENTITY_V1"
ROOT_SENTINEL_NAME=".void-tor-onion-transport-v1-owned"
ROOT_LEAF_NAME="tor-onion-v1"

fail() {
  printf '%s\n' "VOID_TOR_ONION_TRANSPORT_V1_FAIL" >&2
  printf '%s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

resolve_repo() {
  if [[ -n "${VOID_REPO:-}" ]]; then
    git -C "$VOID_REPO" rev-parse --show-toplevel 2>/dev/null || return 1
    return
  fi
  if git rev-parse --show-toplevel >/dev/null 2>&1; then
    git rev-parse --show-toplevel
    return
  fi
  for candidate in "$HOME/dev/void-node" "$HOME/void-node"; do
    if git -C "$candidate" rev-parse --show-toplevel >/dev/null 2>&1; then
      git -C "$candidate" rev-parse --show-toplevel
      return
    fi
  done
  return 1
}

assert_port() {
  local value="$1"
  local label="$2"
  [[ "$value" =~ ^[0-9]+$ ]] || fail "$label must be numeric"
  (( value >= 1 && value <= 65535 )) || fail "$label must be from 1 through 65535"
}

assert_single_line() {
  local value="$1"
  local label="$2"
  [[ "$value" != *$'\n'* && "$value" != *$'\r'* ]] || \
    fail "$label contains a line break"
}

canonical_user_tree() {
  local raw="$1"
  local label="$2"
  local resolved
  assert_single_line "$raw" "$label"
  resolved="$(realpath -m -- "$raw")"
  [[ -n "$resolved" && "$resolved" != "/" && "$resolved" != "$HOME_REAL" ]] || \
    fail "unsafe $label: $resolved"
  case "$resolved" in
    "$HOME_REAL"/*) printf '%s\n' "$resolved" ;;
    *) fail "$label must resolve beneath HOME: raw=$raw resolved=$resolved" ;;
  esac
}

assert_user_tree() {
  local path="$1"
  local resolved
  assert_single_line "$path" "user-tree path"
  resolved="$(realpath -m -- "$path")"
  [[ "$resolved" == "$path" ]] || fail "user-tree path is not canonical: $path"
  [[ -n "$resolved" && "$resolved" != "/" && "$resolved" != "$HOME_REAL" ]] || \
    fail "unsafe user-tree path: $resolved"
  case "$resolved" in
    "$HOME_REAL"/*) ;;
    *) fail "path must remain beneath HOME: $resolved" ;;
  esac
}

assert_dedicated_root() {
  local path="$1"
  local label="$2"
  assert_user_tree "$path"
  [[ "${path##*/}" == "$ROOT_LEAF_NAME" ]] || \
    fail "$label must end in /$ROOT_LEAF_NAME: $path"
}

paths_overlap() {
  local left="$1"
  local right="$2"
  [[ "$left" == "$right" || "$left" == "$right"/* || "$right" == "$left"/* ]]
}

assert_no_path_overlap() {
  local left="$1"
  local left_label="$2"
  local right="$3"
  local right_label="$4"
  if paths_overlap "$left" "$right"; then
    fail "$left_label and $right_label must not overlap: $left <> $right"
  fi
  return 0
}

root_sentinel_path() {
  printf '%s/%s\n' "$1" "$ROOT_SENTINEL_NAME"
}

root_sentinel_body() {
  local kind="$1"
  local root="$2"
  printf 'marker=%s\nkind=%s\npath=%s\nowner_uid=%s\n' \
    "$MARKER" "$kind" "$root" "$(id -u)"
}

verify_root_sentinel() {
  local root="$1"
  local kind="$2"
  local sentinel expected actual
  sentinel="$(root_sentinel_path "$root")"
  [[ -f "$sentinel" && ! -L "$sentinel" ]] || \
    fail "$kind root is not owned by $MARKER; sentinel missing: $sentinel"
  [[ "$(stat -c '%u' -- "$sentinel")" == "$(id -u)" ]] || \
    fail "$kind root sentinel is not owned by the current user: $sentinel"
  expected="$(root_sentinel_body "$kind" "$root")"
  actual="$(cat -- "$sentinel")"
  [[ "$actual" == "$expected" ]] || \
    fail "$kind root sentinel mismatch: $sentinel"
}

prepare_owned_root() {
  local root="$1"
  local kind="$2"
  local sentinel
  assert_dedicated_root "$root" "$kind root"
  if [[ -e "$root" && ! -d "$root" ]]; then
    fail "$kind root exists but is not a directory: $root"
  fi
  mkdir -p -- "$root"
  sentinel="$(root_sentinel_path "$root")"
  if [[ -e "$sentinel" || -L "$sentinel" ]]; then
    verify_root_sentinel "$root" "$kind"
  else
    if [[ -n "$(find "$root" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
      fail "$kind root is non-empty but has no ownership sentinel: $root"
    fi
    root_sentinel_body "$kind" "$root" > "$sentinel"
    chmod 600 -- "$sentinel"
    verify_root_sentinel "$root" "$kind"
  fi
  chmod 700 -- "$root"
}

verify_owned_root_or_absent() {
  local root="$1"
  local kind="$2"
  assert_dedicated_root "$root" "$kind root"
  [[ -e "$root" ]] || return 0
  [[ -d "$root" ]] || fail "$kind root exists but is not a directory: $root"
  verify_root_sentinel "$root" "$kind"
}

remove_owned_root() {
  local root="$1"
  local kind="$2"
  verify_owned_root_or_absent "$root" "$kind"
  [[ -e "$root" ]] || return 0
  rm -rf -- "$root"
}

canonical_executable() {
  local raw="$1"
  local label="$2"
  local resolved
  assert_single_line "$raw" "$label"
  [[ "$raw" == /* ]] || fail "$label must be an absolute path: $raw"
  resolved="$(realpath -e -- "$raw")" || fail "$label does not exist: $raw"
  [[ -f "$resolved" && -x "$resolved" ]] || fail "$label is not an executable file: $resolved"
  printf '%s\n' "$resolved"
}

systemd_quote() {
  local value="$1"
  assert_single_line "$value" "systemd value"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//%/%%}"
  printf '"%s"' "$value"
}

torrc_quote() {
  local value="$1"
  assert_single_line "$value" "torrc value"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "$value"
}

require_command cat
require_command find
require_command git
require_command id
require_command node
require_command realpath
require_command stat

HOME_REAL="$(realpath -e -- "$HOME")"
assert_single_line "$HOME_REAL" "HOME"

REPO="$(resolve_repo)" || fail "VOID repository not found; set VOID_REPO explicitly"
REPO="$(realpath -e "$REPO")"
PUBLIC_SERVER="$REPO/tools/void-tor-onion-public-node-v1.mjs"
DESCRIPTOR_TOOL="$REPO/tools/void-tor-onion-descriptor-v1.mjs"
[[ -f "$PUBLIC_SERVER" ]] || fail "Tor public-node server missing: $PUBLIC_SERVER"
[[ -f "$DESCRIPTOR_TOOL" ]] || fail "Tor descriptor tool missing: $DESCRIPTOR_TOOL"
[[ -f "$REPO/public/public-node/index.json" ]] || fail "public-node index missing from repository"

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
(( NODE_MAJOR >= 22 )) || fail "Node.js 22 or newer is required"

PUBLIC_PORT="${VOID_TOR_PUBLIC_NODE_PORT:-18088}"
SOCKS_PORT="${VOID_TOR_SOCKS_PORT:-19050}"
VIRTUAL_PORT="${VOID_TOR_VIRTUAL_PORT:-80}"
assert_port "$PUBLIC_PORT" "VOID_TOR_PUBLIC_NODE_PORT"
assert_port "$SOCKS_PORT" "VOID_TOR_SOCKS_PORT"
assert_port "$VIRTUAL_PORT" "VOID_TOR_VIRTUAL_PORT"
[[ "$PUBLIC_PORT" != "$SOCKS_PORT" ]] || fail "public-node and SOCKS ports must differ"

XDG_CONFIG_BASE="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_DATA_BASE="${XDG_DATA_HOME:-$HOME/.local/share}"
XDG_STATE_BASE="${XDG_STATE_HOME:-$HOME/.local/state}"
CONFIG_ROOT="$(canonical_user_tree "${VOID_TOR_CONFIG_ROOT:-$XDG_CONFIG_BASE/void/tor-onion-v1}" "VOID_TOR_CONFIG_ROOT")"
DATA_ROOT="$(canonical_user_tree "${VOID_TOR_DATA_ROOT:-$XDG_DATA_BASE/void/tor-onion-v1}" "VOID_TOR_DATA_ROOT")"
STATE_ROOT="$(canonical_user_tree "${VOID_TOR_STATE_ROOT:-$XDG_STATE_BASE/void/tor-onion-v1}" "VOID_TOR_STATE_ROOT")"
UNIT_ROOT="$(canonical_user_tree "$XDG_CONFIG_BASE/systemd/user" "systemd user unit root")"
RENDER_ROOT="$CONFIG_ROOT/rendered"
HIDDEN_SERVICE_DIR="$DATA_ROOT/hidden-service"
HOSTNAME_FILE="$HIDDEN_SERVICE_DIR/hostname"
DESCRIPTOR_FILE="$STATE_ROOT/transport.json"
TOR_BIN="${VOID_TOR_BIN:-$(command -v tor 2>/dev/null || printf '/usr/bin/tor')}"
[[ "$TOR_BIN" == /* ]] || fail "VOID_TOR_BIN must be an absolute path: $TOR_BIN"
TOR_BIN="$(realpath -m -- "$TOR_BIN")"
NODE_BIN="$(canonical_executable "$(command -v node)" "node executable")"

assert_dedicated_root "$CONFIG_ROOT" "VOID_TOR_CONFIG_ROOT"
assert_dedicated_root "$DATA_ROOT" "VOID_TOR_DATA_ROOT"
assert_dedicated_root "$STATE_ROOT" "VOID_TOR_STATE_ROOT"
assert_no_path_overlap "$CONFIG_ROOT" "config root" "$DATA_ROOT" "data root"
assert_no_path_overlap "$CONFIG_ROOT" "config root" "$STATE_ROOT" "state root"
assert_no_path_overlap "$DATA_ROOT" "data root" "$STATE_ROOT" "state root"
for guarded_root in "$CONFIG_ROOT" "$DATA_ROOT" "$STATE_ROOT"; do
  assert_no_path_overlap "$guarded_root" "managed Tor root" "$UNIT_ROOT" "systemd user unit root"
  assert_no_path_overlap "$guarded_root" "managed Tor root" "$REPO" "VOID repository"
done
unset guarded_root

render_bundle() {
  local destination="$1"
  destination="$(realpath -m "$destination")"
  mkdir -p "$destination/systemd/user"

  local tor_data_value tor_hidden_value
  tor_data_value="$(torrc_quote "$DATA_ROOT/data")"
  tor_hidden_value="$(torrc_quote "$HIDDEN_SERVICE_DIR")"

  cat > "$destination/torrc" <<TORRC
# Generated by $MARKER. Do not add node RPC, P2P, wallet, or mutation ports.
DataDirectory $tor_data_value
SocksPort 127.0.0.1:$SOCKS_PORT IsolateSOCKSAuth
SafeSocks 1
SafeLogging 1
RunAsDaemon 0
Log notice stdout
HiddenServiceDir $tor_hidden_value
HiddenServiceVersion 3
HiddenServicePort $VIRTUAL_PORT 127.0.0.1:$PUBLIC_PORT
TORRC

  {
    printf '%s\n' '#!/usr/bin/env bash' 'set -Eeuo pipefail' 'umask 077'
    printf 'cd -- %q\n' "$REPO"
    printf 'exec env VOID_TOR_PUBLIC_NODE_BIND=127.0.0.1 VOID_TOR_PUBLIC_NODE_PORT=%q VOID_TOR_VIRTUAL_PORT=%q VOID_TOR_HOSTNAME_FILE=%q %q %q --host 127.0.0.1 --port %q --virtual-port %q --hostname-file %q\n' \
      "$PUBLIC_PORT" "$VIRTUAL_PORT" "$HOSTNAME_FILE" \
      "$NODE_BIN" "$PUBLIC_SERVER" "$PUBLIC_PORT" "$VIRTUAL_PORT" "$HOSTNAME_FILE"
  } > "$destination/run-public-node.sh"

  {
    printf '%s\n' '#!/usr/bin/env bash' 'set -Eeuo pipefail' 'umask 077'
    printf 'exec %q -f %q\n' "$TOR_BIN" "$destination/torrc"
  } > "$destination/run-tor.sh"

  local quoted_repo quoted_backend quoted_tor quoted_data quoted_state
  quoted_repo="$(systemd_quote "$REPO")"
  quoted_backend="$(systemd_quote "$destination/run-public-node.sh")"
  quoted_tor="$(systemd_quote "$destination/run-tor.sh")"
  quoted_data="$(systemd_quote "$DATA_ROOT")"
  quoted_state="$(systemd_quote "$STATE_ROOT")"

  cat > "$destination/systemd/user/$BACKEND_UNIT" <<UNIT
[Unit]
Description=VOID read-only public node backend for Tor v1
After=network.target

[Service]
Type=simple
WorkingDirectory=$quoted_repo
ExecStart=$quoted_backend
Restart=on-failure
RestartSec=3
Environment=NODE_ENV=production
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
RestrictSUIDSGID=true
RestrictRealtime=true
LockPersonality=true
UMask=0077

[Install]
WantedBy=default.target
UNIT

  cat > "$destination/systemd/user/$TOR_UNIT" <<UNIT
[Unit]
Description=VOID Tor v3 onion transport v1
Wants=network-online.target
After=network-online.target $BACKEND_UNIT
Requires=$BACKEND_UNIT

[Service]
Type=simple
ExecStart=$quoted_tor
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$quoted_data $quoted_state
RestrictSUIDSGID=true
RestrictRealtime=true
LockPersonality=true
UMask=0077

[Install]
WantedBy=default.target
UNIT

  cat > "$destination/render-manifest.txt" <<MANIFEST
marker=$MARKER
repo=$REPO
surface=void-public-node-static-read-only-v1
bind=127.0.0.1
public_port=$PUBLIC_PORT
socks_port=$SOCKS_PORT
virtual_port=$VIRTUAL_PORT
hidden_service_dir=$HIDDEN_SERVICE_DIR
descriptor_file=$DESCRIPTOR_FILE
canonical_void_node_identity=false
signed_void_node_binding=false
transaction_submission=false
p2p_listener=false
mcp_listener=false
wallet_or_signer_access=false
work_credit_write=false
void_settlement=false
node_runtime_mutation=false
MANIFEST

  chmod 600 "$destination/torrc" \
    "$destination/render-manifest.txt" \
    "$destination/systemd/user/$BACKEND_UNIT" \
    "$destination/systemd/user/$TOR_UNIT"
  chmod 700 "$destination/run-public-node.sh" "$destination/run-tor.sh"
}

ensure_tor() {
  if [[ -n "${VOID_TOR_BIN:-}" ]]; then
    TOR_BIN="$(canonical_executable "$VOID_TOR_BIN" "VOID_TOR_BIN")"
    return
  fi
  if command -v tor >/dev/null 2>&1; then
    TOR_BIN="$(canonical_executable "$(command -v tor)" "tor executable")"
    return
  fi
  [[ "${VOID_TOR_ALLOW_DISTRO_PACKAGE:-0}" == "1" ]] || \
    fail "tor is not installed; install the current Tor daemon from the Tor Project repository, or explicitly set VOID_TOR_ALLOW_DISTRO_PACKAGE=1 to use the distro package"
  require_command sudo
  require_command apt-get
  printf '%s\n' "Installing the explicitly authorized Ubuntu/Debian tor package..."
  sudo apt-get update
  sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y tor
  command -v tor >/dev/null 2>&1 || fail "tor package installation completed but tor is unavailable"
  TOR_BIN="$(canonical_executable "$(command -v tor)" "tor executable")"
}

wait_for_local_backend() {
  local attempt
  for attempt in $(seq 1 30); do
    if curl -q --fail --silent --show-error --max-time 2 \
      --noproxy '*' "http://127.0.0.1:$PUBLIC_PORT/public-node/index.json" \
      >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_hostname() {
  local attempt
  for attempt in $(seq 1 90); do
    if [[ -s "$HOSTNAME_FILE" ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

parse_json_file() {
  node -e 'const fs=require("node:fs"); JSON.parse(fs.readFileSync(process.argv[1], "utf8"));' "$1"
}

verify_transport() {
  require_command curl
  verify_owned_root_or_absent "$DATA_ROOT" "data"
  [[ -d "$DATA_ROOT" ]] || fail "Tor data root is not installed: $DATA_ROOT"
  prepare_owned_root "$STATE_ROOT" "state"
  local local_index local_descriptor onion_index onion_descriptor onion onion_authority
  local_index="$(mktemp)"
  local_descriptor="$(mktemp)"
  onion_index="$(mktemp)"
  onion_descriptor="$(mktemp)"
  trap 'rm -f "$local_index" "$local_descriptor" "$onion_index" "$onion_descriptor"' EXIT

  [[ -s "$HOSTNAME_FILE" ]] || fail "onion hostname is not ready: $HOSTNAME_FILE"
  onion="$(tr -d '[:space:]' < "$HOSTNAME_FILE")"
  onion_authority="$onion"
  if [[ "$VIRTUAL_PORT" != "80" ]]; then
    onion_authority="$onion:$VIRTUAL_PORT"
  fi

  node "$DESCRIPTOR_TOOL" \
    --hostname-file "$HOSTNAME_FILE" \
    --output "$DESCRIPTOR_FILE" \
    --local-port "$PUBLIC_PORT" \
    --virtual-port "$VIRTUAL_PORT" >/dev/null

  curl -q --fail --silent --show-error --max-time 10 --noproxy '*' \
    "http://127.0.0.1:$PUBLIC_PORT/public-node/index.json" > "$local_index"
  curl -q --fail --silent --show-error --max-time 10 --noproxy '*' \
    "http://127.0.0.1:$PUBLIC_PORT/.well-known/void-tor-onion-transport-v1.json" \
    > "$local_descriptor"
  parse_json_file "$local_index"
  parse_json_file "$local_descriptor"

  local success=0 attempt
  for attempt in $(seq 1 12); do
    if curl -q --fail --silent --show-error \
      --connect-timeout 15 --max-time 45 \
      --socks5-hostname "127.0.0.1:$SOCKS_PORT" \
      "http://$onion_authority/public-node/index.json" > "$onion_index" 2>/dev/null && \
       curl -q --fail --silent --show-error \
      --connect-timeout 15 --max-time 45 \
      --socks5-hostname "127.0.0.1:$SOCKS_PORT" \
      "http://$onion_authority/.well-known/void-tor-onion-transport-v1.json" \
      > "$onion_descriptor" 2>/dev/null; then
      success=1
      break
    fi
    sleep 3
  done
  (( success == 1 )) || fail "Tor end-to-end self-probe failed"

  parse_json_file "$onion_index"
  node -e '
    const fs = require("node:fs");
    const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    if (value.marker !== "VOID_TOR_ONION_TRANSPORT_V1") process.exit(2);
    if (value.status !== "active") process.exit(3);
    if (value.transport?.onion_hostname !== process.argv[2]) process.exit(4);
    if (value.authority?.read_only !== true) process.exit(5);
    const forbidden = [
      "transaction_submission", "p2p_listener", "mcp_listener",
      "wallet_or_signer_access", "work_credit_write", "void_settlement",
      "node_runtime_mutation", "operator_control",
    ];
    if (forbidden.some((key) => value.authority?.[key] !== false)) process.exit(6);
  ' "$onion_descriptor" "$onion"

  rm -f "$local_index" "$local_descriptor" "$onion_index" "$onion_descriptor"
  trap - EXIT
  printf '%s\n' "VOID_TOR_ONION_TRANSPORT_V1_VERIFY_GREEN"
  printf 'onion_uri=http://%s\n' "$onion_authority"
  printf 'descriptor=%s\n' "$DESCRIPTOR_FILE"
  printf '%s\n' "read_only=true" "dangerous_paths_touched=false"
}

install_transport() {
  require_command curl
  require_command systemctl
  systemctl --user show-environment >/dev/null 2>&1 || \
    fail "systemd user manager is unavailable for this login"
  ensure_tor

  assert_user_tree "$UNIT_ROOT"
  prepare_owned_root "$CONFIG_ROOT" "config"
  prepare_owned_root "$DATA_ROOT" "data"
  prepare_owned_root "$STATE_ROOT" "state"

  mkdir -p "$DATA_ROOT/data" "$HIDDEN_SERVICE_DIR" "$UNIT_ROOT"
  chmod 700 "$DATA_ROOT/data" "$HIDDEN_SERVICE_DIR"
  rm -rf -- "$RENDER_ROOT"
  render_bundle "$RENDER_ROOT"

  "$TOR_BIN" --verify-config -f "$RENDER_ROOT/torrc" >/dev/null
  install -m 600 "$RENDER_ROOT/systemd/user/$BACKEND_UNIT" "$UNIT_ROOT/$BACKEND_UNIT"
  install -m 600 "$RENDER_ROOT/systemd/user/$TOR_UNIT" "$UNIT_ROOT/$TOR_UNIT"

  systemctl --user daemon-reload
  systemctl --user enable --now "$BACKEND_UNIT"
  systemctl --user restart "$BACKEND_UNIT"
  wait_for_local_backend || {
    systemctl --user status --no-pager "$BACKEND_UNIT" || true
    fail "loopback public-node backend did not become healthy"
  }

  systemctl --user enable --now "$TOR_UNIT"
  systemctl --user restart "$TOR_UNIT"
  wait_for_hostname || {
    systemctl --user status --no-pager "$TOR_UNIT" || true
    fail "Tor did not create the v3 Onion Service hostname"
  }

  verify_transport
  printf '%s\n' "VOID_TOR_ONION_TRANSPORT_V1_INSTALL_GREEN"
  if command -v loginctl >/dev/null 2>&1; then
    printf 'linger=%s\n' "$(loginctl show-user "${USER:-$(id -un)}" -p Linger --value 2>/dev/null || printf unknown)"
  fi
}

status_transport() {
  printf 'marker=%s\n' "$MARKER"
  printf 'repo=%s\n' "$REPO"
  if systemctl --user is-active --quiet "$BACKEND_UNIT" 2>/dev/null; then
    printf '%s\n' "backend_unit=active"
  else
    printf '%s\n' "backend_unit=inactive"
  fi
  if systemctl --user is-active --quiet "$TOR_UNIT" 2>/dev/null; then
    printf '%s\n' "tor_unit=active"
  else
    printf '%s\n' "tor_unit=inactive"
  fi
  if [[ -s "$HOSTNAME_FILE" ]]; then
    local onion onion_authority
    onion="$(tr -d '[:space:]' < "$HOSTNAME_FILE")"
    onion_authority="$onion"
    if [[ "$VIRTUAL_PORT" != "80" ]]; then
      onion_authority="$onion:$VIRTUAL_PORT"
    fi
    printf 'onion_uri=http://%s\n' "$onion_authority"
  else
    printf '%s\n' "onion_uri=not-ready"
  fi
  printf 'identity_dir=%s\n' "$HIDDEN_SERVICE_DIR"
  printf 'descriptor=%s\n' "$DESCRIPTOR_FILE"
  printf '%s\n' "read_only=true"
}

uninstall_transport() {
  assert_user_tree "$UNIT_ROOT"
  verify_owned_root_or_absent "$CONFIG_ROOT" "config"
  verify_owned_root_or_absent "$STATE_ROOT" "state"
  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user disable --now "$TOR_UNIT" "$BACKEND_UNIT" >/dev/null 2>&1 || true
  fi
  rm -f -- "$UNIT_ROOT/$TOR_UNIT" "$UNIT_ROOT/$BACKEND_UNIT"
  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user daemon-reload >/dev/null 2>&1 || true
    systemctl --user reset-failed "$TOR_UNIT" "$BACKEND_UNIT" >/dev/null 2>&1 || true
  fi
  remove_owned_root "$CONFIG_ROOT" "config"
  remove_owned_root "$STATE_ROOT" "state"
  printf '%s\n' "VOID_TOR_ONION_TRANSPORT_V1_UNINSTALL_GREEN"
  printf '%s\n' "identity_preserved=true"
  printf 'identity_dir=%s\n' "$HIDDEN_SERVICE_DIR"
}

purge_identity() {
  local confirmation="${1:-}"
  [[ "$confirmation" == "$PURGE_CONFIRMATION" ]] || \
    fail "identity purge requires exact confirmation: $PURGE_CONFIRMATION"
  verify_owned_root_or_absent "$DATA_ROOT" "data"
  uninstall_transport
  remove_owned_root "$DATA_ROOT" "data"
  printf '%s\n' "VOID_TOR_ONION_TRANSPORT_V1_IDENTITY_PURGED"
  printf '%s\n' "identity_preserved=false"
}

print_plan() {
  cat <<PLAN
marker=$MARKER
repo=$REPO
surface=void-public-node-static-read-only-v1
bind=127.0.0.1:$PUBLIC_PORT
socks=127.0.0.1:$SOCKS_PORT
onion_virtual_port=$VIRTUAL_PORT
config_root=$CONFIG_ROOT
data_root=$DATA_ROOT
state_root=$STATE_ROOT
identity_dir=$HIDDEN_SERVICE_DIR
root_leaf_guard=$ROOT_LEAF_NAME
root_ownership_sentinel=$ROOT_SENTINEL_NAME
managed_roots_non_overlapping=true
canonical_void_node_identity=false
signed_void_node_binding=false
read_only=true
transaction_submission=false
p2p_listener=false
mcp_listener=false
wallet_or_signer_access=false
work_credit_write=false
void_settlement=false
node_runtime_mutation=false
plan_mutation=false
PLAN
}

usage() {
  cat <<USAGE
Usage: bash ops/tor/void-tor-onion-transport-v1.sh COMMAND

Commands:
  plan                         Print the bounded deployment plan; mutate nothing.
  render [DIRECTORY]           Render torrc and user units for inspection only.
  install                      Install/enable the user-scoped Tor transport.
  verify                       Probe local and Onion Service paths end to end.
  status                       Show units, address, and descriptor paths.
  uninstall                    Remove units/config while preserving onion identity.
  purge-identity TOKEN         Irreversibly delete the Tor identity. TOKEN must be:
                               $PURGE_CONFIRMATION
USAGE
}

command_name="${1:-plan}"
shift || true
case "$command_name" in
  plan)
    (($# == 0)) || fail "plan accepts no arguments"
    print_plan
    ;;
  render)
    (($# <= 1)) || fail "render accepts at most one directory"
    destination="${1:-$PWD/void-tor-onion-transport-v1-render}"
    destination="$(realpath -m "$destination")"
    if [[ -d "$destination" && -n "$(find "$destination" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
      fail "render destination is not empty: $destination"
    fi
    render_bundle "$destination"
    printf '%s\n' "VOID_TOR_ONION_TRANSPORT_V1_RENDER_GREEN"
    printf 'render_dir=%s\n' "$destination"
    printf '%s\n' "runtime_mutation=false"
    ;;
  install)
    (($# == 0)) || fail "install accepts no arguments"
    install_transport
    ;;
  verify)
    (($# == 0)) || fail "verify accepts no arguments"
    verify_transport
    ;;
  status)
    (($# == 0)) || fail "status accepts no arguments"
    require_command systemctl
    status_transport
    ;;
  uninstall)
    (($# == 0)) || fail "uninstall accepts no arguments"
    uninstall_transport
    ;;
  purge-identity)
    (($# <= 1)) || fail "purge-identity accepts one confirmation token"
    purge_identity "${1:-}"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    usage >&2
    fail "unknown command: $command_name"
    ;;
esac
