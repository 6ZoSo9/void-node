#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_NODE_ONION_BINDING_V1"
ROOT_LEAF_NAME="tor-onion-v1"

fail() {
  printf '%s\n' "VOID_NODE_ONION_BINDING_V1_FAIL" >&2
  printf '%s\n' "$*" >&2
  exit 1
}

require_command() { command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"; }

resolve_repo() {
  if [[ -n "${VOID_REPO:-}" ]]; then git -C "$VOID_REPO" rev-parse --show-toplevel 2>/dev/null; return; fi
  if git rev-parse --show-toplevel >/dev/null 2>&1; then git rev-parse --show-toplevel; return; fi
  for candidate in "$HOME/dev/void-node" "$HOME/void-node"; do
    if git -C "$candidate" rev-parse --show-toplevel >/dev/null 2>&1; then git -C "$candidate" rev-parse --show-toplevel; return; fi
  done
  return 1
}

canonical_data_root() {
  local raw="$1" resolved home_real
  home_real="$(realpath -e -- "$HOME")"
  resolved="$(realpath -m -- "$raw")"
  [[ "$resolved" == "$home_real"/* ]] || fail "Tor data root must remain beneath HOME"
  [[ "${resolved##*/}" == "$ROOT_LEAF_NAME" ]] || fail "Tor data root must end in /$ROOT_LEAF_NAME"
  printf '%s\n' "$resolved"
}

require_command curl
require_command git
require_command node
require_command realpath

REPO="$(resolve_repo)" || fail "VOID repository not found; set VOID_REPO"
REPO="$(realpath -e -- "$REPO")"
LIFECYCLE="$REPO/ops/tor/void-tor-onion-transport-v1.sh"
BINDING_CLI="$REPO/tools/void-node-onion-binding-v1.mjs"
[[ -f "$LIFECYCLE" ]] || fail "Tor lifecycle missing"
[[ -f "$BINDING_CLI" ]] || fail "binding CLI missing"

XDG_DATA_BASE="${XDG_DATA_HOME:-$HOME/.local/share}"
DATA_ROOT="$(canonical_data_root "${VOID_TOR_DATA_ROOT:-$XDG_DATA_BASE/void/tor-onion-v1}")"
HOSTNAME_FILE="$DATA_ROOT/hidden-service/hostname"
BINDING_FILE="$DATA_ROOT/node-onion-binding-v1.json"
NODE_HTTP_BASE="${VOID_NODE_HTTP_BASE:-http://127.0.0.1:4100}"
VIRTUAL_PORT="${VOID_TOR_VIRTUAL_PORT:-80}"
VALID_DAYS="${VOID_NODE_ONION_BINDING_VALID_DAYS:-180}"

node_key_path() {
  local value="${VOID_NODE_KEY_PATH:-${NODE_PRIVKEY_PATH:-${KEY_FILE:-${VOID_NODE_KEY_A:-}}}}"
  [[ -n "$value" ]] || fail "set VOID_NODE_KEY_PATH to the existing VOID node private key"
  printf '%s\n' "$value"
}

health_node_id() {
  local temp
  temp="$(mktemp)"
  trap 'rm -f "$temp"' RETURN
  curl -q --fail --silent --show-error --max-time 10 --noproxy '*' \
    "$NODE_HTTP_BASE/health" > "$temp"
  node -e '
    const fs = require("node:fs");
    const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const raw = value.nodeId ?? value.node_id ?? value?.node?.id;
    function normalizeNodeId(input) {
      let text = "";
      if (typeof input === "string") text = input;
      else if (input && input.type === "Buffer" && Array.isArray(input.data)) {
        const bytes = Buffer.from(input.data);
        const printable = bytes.length > 0 && bytes.length <= 512 && [...bytes].every((byte) => byte >= 0x21 && byte <= 0x7e);
        text = printable ? bytes.toString("ascii") : bytes.toString("hex");
      } else process.exit(2);
      if (text.length < 1 || text.length > 512 || text.trim() !== text) process.exit(2);
      for (const character of text) {
        const code = character.codePointAt(0);
        if (code < 0x21 || code > 0x7e) process.exit(2);
      }
      return text;
    }
    process.stdout.write(normalizeNodeId(raw));
  ' "$temp" || fail "live /health did not return a canonical printable VOID nodeId"
}

onion_hostname() {
  [[ -s "$HOSTNAME_FILE" ]] || fail "Tor hostname is not ready: $HOSTNAME_FILE"
  tr -d '[:space:]' < "$HOSTNAME_FILE"
}

verify_binding() {
  local node_id onion
  node_id="$(health_node_id)"
  onion="$(onion_hostname)"
  [[ -s "$BINDING_FILE" ]] || fail "binding file is missing: $BINDING_FILE"
  node "$BINDING_CLI" verify \
    --input "$BINDING_FILE" \
    --expected-node-id "$node_id" \
    --expected-onion-hostname "$onion" \
    --virtual-port "$VIRTUAL_PORT"
  VOID_REPO="$REPO" bash "$LIFECYCLE" verify
  printf '%s\n' "VOID_NODE_ONION_BINDING_V1_LIVE_VERIFY_GREEN"
  printf 'binding=%s\n' "$BINDING_FILE"
  printf 'node_id=%s\n' "$node_id"
  printf 'onion_hostname=%s\n' "$onion"
  printf '%s\n' "service_restart=false" "read_only=true"
}

create_binding() {
  local node_id onion key_path temp
  [[ -s "$HOSTNAME_FILE" ]] || fail "Tor hostname is not ready"
  node_id="$(health_node_id)"
  onion="$(onion_hostname)"
  key_path="$(node_key_path)"
  temp="$BINDING_FILE.tmp-create-$$"
  rm -f -- "$temp"
  trap 'rm -f -- "$temp"' RETURN
  node "$BINDING_CLI" create \
    --key-file "$key_path" \
    --hostname-file "$HOSTNAME_FILE" \
    --output "$temp" \
    --expected-node-id "$node_id" \
    --virtual-port "$VIRTUAL_PORT" \
    --valid-days "$VALID_DAYS"
  install -m 600 -- "$temp" "$BINDING_FILE"
  rm -f -- "$temp"
  trap - RETURN
  verify_binding
  printf '%s\n' "VOID_NODE_ONION_BINDING_V1_LIVE_CREATE_GREEN"
  printf '%s\n' "node_private_key_generated=false" "parallel_identity_key=false" "service_restart=false"
}

remove_binding() {
  rm -f -- "$BINDING_FILE"
  VOID_REPO="$REPO" bash "$LIFECYCLE" verify
  printf '%s\n' "VOID_NODE_ONION_BINDING_V1_REMOVE_GREEN"
  printf '%s\n' "tor_identity_preserved=true" "node_private_key_preserved=true" "service_restart=false"
}

status_binding() {
  printf 'marker=%s\n' "$MARKER"
  printf 'binding=%s\n' "$BINDING_FILE"
  if [[ -s "$BINDING_FILE" ]]; then
    printf '%s\n' "binding_status=present"
    node "$BINDING_CLI" verify --input "$BINDING_FILE" --virtual-port "$VIRTUAL_PORT"
  else
    printf '%s\n' "binding_status=absent"
  fi
  printf '%s\n' "read_only=true" "service_restart=false"
}

print_plan() {
  cat <<PLAN
marker=$MARKER
repo=$REPO
node_http_base=$NODE_HTTP_BASE
hostname_file=$HOSTNAME_FILE
binding_file=$BINDING_FILE
valid_days=$VALID_DAYS
uses_existing_void_node_key=true
parallel_identity_key=false
service_restart=false
read_only=true
transaction_submission=false
wallet_or_signer_access=false
work_credit_write=false
void_settlement=false
validator_mutation=false
plan_mutation=false
PLAN
}

case "${1:-plan}" in
  plan) (($# == 1)) || fail "plan accepts no arguments"; print_plan ;;
  create) (($# == 1)) || fail "create accepts no arguments"; create_binding ;;
  verify) (($# == 1)) || fail "verify accepts no arguments"; verify_binding ;;
  status) (($# == 1)) || fail "status accepts no arguments"; status_binding ;;
  remove) (($# == 1)) || fail "remove accepts no arguments"; remove_binding ;;
  help|-h|--help)
    printf '%s\n' "Usage: bash ops/tor/void-node-onion-binding-v1.sh {plan|create|verify|status|remove}"
    ;;
  *) fail "unknown command: ${1:-}" ;;
esac
