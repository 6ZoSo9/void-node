#!/usr/bin/env bash
# shellcheck shell=bash
# Shared fail-closed admission for legacy two-box proof wrappers.
# Source-only helper: callers decide whether the admitted proof is read-only or mutation-capable.

void_two_box_hold() {
  local message="$*"
  printf '%s HOLD: %s\n' "${MARKER:-VOID_TWO_BOX_LEGACY_PROOF_EXPLICIT_TARGET_V1}" "$message" >&2
  exit 2
}

void_two_box_guard_retired() {
  local guard
  guard="$(printf '%s\n' "$@" | tr '[:upper:]' '[:lower:]')"
  case "$guard" in
    *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
      void_two_box_hold "retired Alienware target is forbidden"
      ;;
  esac
}

void_two_box_validate_ssh_destination() {
  local value="${1:-}"
  [ -n "$value" ] || void_two_box_hold "missing explicit ALIEN"
  case "$value" in
    -*|*[[:space:]]*|*[\"\'\`\$\;\|\&\<\>\(\)\{\}\[\]\!]*)
      void_two_box_hold "invalid SSH destination syntax"
      ;;
  esac
  if ! [[ "$value" =~ ^([A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
    void_two_box_hold "invalid SSH destination syntax"
  fi
}

void_two_box_validate_http_origin() {
  local name="${1:-origin}"
  local value="${2:-}"
  [ -n "$value" ] || void_two_box_hold "missing explicit $name"
  case "$value" in
    *[\"\'\`\$\;\|\&\<\>\(\)\{\}\[\]\!]*|*[[:space:]]*)
      void_two_box_hold "invalid $name syntax"
      ;;
  esac
  if ! [[ "$value" =~ ^https?://[A-Za-z0-9][A-Za-z0-9._-]*:[0-9]{1,5}/?$ ]]; then
    void_two_box_hold "invalid $name origin"
  fi
  local rest hostport port
  rest="${value#*://}"
  hostport="${rest%/}"
  port="${hostport##*:}"
  if ! [[ "$port" =~ ^[0-9]+$ ]] || (( 10#$port < 1 || 10#$port > 65535 )); then
    void_two_box_hold "invalid $name port"
  fi
}

void_two_box_validate_loopback_origin() {
  local name="${1:-origin}"
  local value="${2:-}"
  void_two_box_validate_http_origin "$name" "$value"
  local rest hostport host
  rest="${value#*://}"
  hostport="${rest%/}"
  host="${hostport%:*}"
  case "${host,,}" in
    127.0.0.1|localhost) ;;
    *) void_two_box_hold "$name must be loopback" ;;
  esac
}

void_two_box_origin_host() {
  local value="$1"
  local rest hostport
  rest="${value#*://}"
  hostport="${rest%/}"
  printf '%s\n' "${hostport%:*}"
}

void_two_box_require_mutation_confirmation() {
  local script_path="${1:-$0}"
  local script_name expected
  script_name="$(basename "$script_path")"
  expected="runVoidTwoBoxLegacyProofV1:$script_name"
  if [ "${CONFIRM_TWO_BOX_LEGACY_PROOF:-}" != "$expected" ]; then
    void_two_box_hold "confirmation required: CONFIRM_TWO_BOX_LEGACY_PROOF=$expected"
  fi
}

void_two_box_require_source_parity_and_bind_remote() {
  local ssh_target="${1:-}"
  shift || true
  void_two_box_validate_ssh_destination "$ssh_target"

  local local_branch local_head local_dirty
  local_branch="$(git branch --show-current 2>/dev/null || true)"
  local_head="$(git rev-parse HEAD 2>/dev/null || true)"
  local_dirty="$(git status --porcelain=v1 --untracked-files=all 2>/dev/null || true)"
  [ "$local_branch" = "main" ] || void_two_box_hold "local repository must be on main"
  [[ "$local_head" =~ ^[0-9a-f]{40}$ ]] || void_two_box_hold "local repository HEAD unavailable"
  [ -z "$local_dirty" ] || void_two_box_hold "local repository must be clean"

  local remote_meta
  if ! remote_meta="$(ssh -o BatchMode=yes -o ConnectTimeout=8 "$ssh_target" '
set -euo pipefail
cd "$HOME/dev/void-node"
test "$(git branch --show-current)" = main
test -z "$(git status --porcelain=v1 --untracked-files=all)"
printf "HEAD=%s\n" "$(git rev-parse HEAD)"
printf "HOST=%s\n" "$(hostname)"
printf "FQDN=%s\n" "$(hostname -f 2>/dev/null || hostname)"
printf "TSIP=%s\n" "$(tailscale ip -4 2>/dev/null | head -n1 || true)"
printf "TSDNS=%s\n" "$(tailscale status --json 2>/dev/null | python3 -c '"'"'import json,sys; x=json.load(sys.stdin); print(str((x.get("Self") or {}).get("DNSName") or "").rstrip("."))'"'"' 2>/dev/null || true)"
')"; then
    void_two_box_hold "remote source identity check failed"
  fi

  local remote_head remote_host remote_fqdn remote_tsip remote_tsdns
  remote_head="$(printf '%s\n' "$remote_meta" | sed -n 's/^HEAD=//p' | head -n1)"
  remote_host="$(printf '%s\n' "$remote_meta" | sed -n 's/^HOST=//p' | head -n1)"
  remote_fqdn="$(printf '%s\n' "$remote_meta" | sed -n 's/^FQDN=//p' | head -n1)"
  remote_tsip="$(printf '%s\n' "$remote_meta" | sed -n 's/^TSIP=//p' | head -n1)"
  remote_tsdns="$(printf '%s\n' "$remote_meta" | sed -n 's/^TSDNS=//p' | head -n1)"

  [ "$remote_head" = "$local_head" ] || void_two_box_hold "local/remote Git HEAD mismatch"
  [ -n "$remote_host" ] || void_two_box_hold "remote hostname unavailable"
  [ "${remote_host,,}" != "$(hostname | tr '[:upper:]' '[:lower:]')" ] ||
    void_two_box_hold "remote host must be distinct from local host"

  local origin origin_host matched
  for origin in "$@"; do
    [ -n "$origin" ] || continue
    origin_host="$(void_two_box_origin_host "$origin")"
    matched=0
    for candidate in "$remote_host" "$remote_fqdn" "$remote_tsip" "$remote_tsdns"; do
      [ -n "$candidate" ] || continue
      if [ "${origin_host,,}" = "${candidate,,}" ]; then
        matched=1
        break
      fi
    done
    [ "$matched" = 1 ] || void_two_box_hold "remote HTTP origin host does not match selected SSH peer"
  done
}
