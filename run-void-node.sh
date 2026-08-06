#!/usr/bin/env bash
set -Eeuo pipefail
set +H
umask 077

MARKER="VOID_NODE_CLONE_AND_RUN_V1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
COMMAND="${1:-run}"

SUPPORTED_NODE_MAJORS="22 24 26"
NODE_VERSION="v24.18.0"
NODE_ARCHIVE="node-${NODE_VERSION}-linux-x64.tar.gz"
NODE_DIRECTORY="node-${NODE_VERSION}-linux-x64"
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_ARCHIVE}"
NODE_SHA256="783130984963db7ba9cbd01089eaf2c2efb055c7c1693c943174b967b3050cb8"
RUNTIME_ROOT="$ROOT/.runtime/clone-run-v1"
RUNTIME_DIR="$RUNTIME_ROOT/$NODE_DIRECTORY"
RUNTIME_MARKER="$RUNTIME_DIR/.void-runtime-sha256"
LOCK_DIR="$RUNTIME_ROOT/.prepare-lock"
STAMP_FILE="$RUNTIME_ROOT/prepared-source-v1"
ENV_FILE="$ROOT/.env"
NODE_KEY_FILE="$ROOT/.nodekey"
PUBLIC_BOOTSTRAP_RESOLVER="$ROOT/scripts/resolve_void_public_bootstrap_v1.mjs"
PUBLIC_BOOTSTRAP_SUPERVISOR="$ROOT/scripts/run_void_public_bootstrap_supervisor_v1.mjs"
LOCAL_PUBLIC_BOOTSTRAP_MANIFEST="$ROOT/public/bootstrap/v1.json"
DEFAULT_PUBLIC_BOOTSTRAP_MANIFEST="https://raw.githubusercontent.com/6ZoSo9/void-node/main/public/bootstrap/v1.json"

NODE_BIN=""
NPM_BIN=""
RUNTIME_SOURCE=""
LOCK_HELD=0
PUBLIC_BOOTSTRAP_STATE="not_checked"

say() { printf '%s\n' "$*"; }
die() { say "ERROR: $*" >&2; exit 1; }

usage() {
  cat <<'HELP'
VOID node clone-and-run launcher

Usage:
  ./run-void-node.sh          Prepare and run the node.
  ./run-void-node.sh run      Prepare and run the node.
  ./run-void-node.sh prepare  Download/select runtime, install, configure, and build.
  ./run-void-node.sh doctor   Report clone-and-run readiness without starting the node.
  ./run-void-node.sh help     Show this help.

Supported host runtimes are Node.js 22, 24, and 26. Node.js 24 LTS is the
repository default. When no supported host runtime is available, the launcher
downloads the pinned official Node.js 24 LTS runtime into .runtime/. It does not
use sudo or install Node.js globally. It creates a local .env and a private
node-identity key at .nodekey when they do not already exist. That identity key
is not a wallet, validator, treasury, or operator-authority key.

The normal run path retrieves the canonical public bootstrap manifest, verifies
its content address and authority boundary, and live-probes stable HTTPS seeds
through DNS-pinned requests. When a stable seed exists, the node follows only a
numeric-loopback client adapter. A hold manifest starts the local node without
claiming public synchronization. Before the canonical artifact is first merged,
an explicit HTTP 404 may fall back only to the checked-in, verified hold file.
Set VOID_PUBLIC_BOOTSTRAP_REQUIRE=1 when the run must fail unless stable public
synchronization is available.
HELP
}

release_lock() {
  if test "$LOCK_HELD" = 1; then
    rmdir "$LOCK_DIR" 2>/dev/null || true
    LOCK_HELD=0
  fi
}
trap release_lock EXIT INT TERM

acquire_lock() {
  mkdir -p "$RUNTIME_ROOT"
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    die "another clone-and-run preparation is active: $LOCK_DIR"
  fi
  LOCK_HELD=1
}

node_major_supported() {
  case "${1:-}" in
    22|24|26) return 0 ;;
    *) return 1 ;;
  esac
}

host_node_supported() {
  command -v node >/dev/null 2>&1 || return 1
  command -v npm >/dev/null 2>&1 || return 1
  local major
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
  node_major_supported "$major"
}

download_file() {
  local url="$1" destination="$2"
  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --show-error --location \
      --proto '=https' --tlsv1.2 --max-time 600 \
      "$url" -o "$destination"
  elif command -v wget >/dev/null 2>&1; then
    wget --https-only --timeout=60 --tries=3 -O "$destination" "$url"
  else
    die "curl or wget is required for the one-time Node.js runtime download"
  fi
}

local_runtime_green() {
  test -x "$RUNTIME_DIR/bin/node" || return 1
  test -x "$RUNTIME_DIR/bin/npm" || return 1
  test -f "$RUNTIME_MARKER" || return 1
  test "$(cat "$RUNTIME_MARKER" 2>/dev/null || true)" = "$NODE_SHA256" || return 1
  test "$($RUNTIME_DIR/bin/node --version 2>/dev/null || true)" = "$NODE_VERSION"
}

ensure_local_runtime() {
  test "$(uname -s)" = Linux || die "automatic runtime bootstrap currently supports Linux only"
  case "$(uname -m)" in
    x86_64|amd64) ;;
    *) die "automatic runtime bootstrap currently supports Linux x86-64 only" ;;
  esac
  command -v tar >/dev/null 2>&1 || die "required command not found: tar"
  command -v gzip >/dev/null 2>&1 || die "required command not found: gzip"
  command -v sha256sum >/dev/null 2>&1 || die "required command not found: sha256sum"
  command -v mktemp >/dev/null 2>&1 || die "required command not found: mktemp"

  if local_runtime_green; then
    return
  fi

  mkdir -p "$RUNTIME_ROOT"
  local tmp archive extracted
  tmp="$(mktemp -d "$RUNTIME_ROOT/.runtime-download.XXXXXXXX")"
  archive="$tmp/$NODE_ARCHIVE"
  extracted="$tmp/extract"
  mkdir -p "$extracted"

  say "[$MARKER] downloading pinned Node.js runtime $NODE_VERSION"
  download_file "$NODE_URL" "$archive"
  printf '%s  %s\n' "$NODE_SHA256" "$archive" | sha256sum --check --strict - >/dev/null \
    || die "downloaded Node.js runtime failed SHA-256 verification"

  tar -xzf "$archive" -C "$extracted" --no-same-owner --no-same-permissions
  test -x "$extracted/$NODE_DIRECTORY/bin/node" || die "downloaded runtime is missing bin/node"
  test -x "$extracted/$NODE_DIRECTORY/bin/npm" || die "downloaded runtime is missing bin/npm"
  test "$($extracted/$NODE_DIRECTORY/bin/node --version)" = "$NODE_VERSION" \
    || die "downloaded runtime is not the pinned Node.js 24 LTS release"

  rm -rf "$RUNTIME_DIR"
  mv "$extracted/$NODE_DIRECTORY" "$RUNTIME_DIR"
  printf '%s\n' "$NODE_SHA256" > "$RUNTIME_MARKER"
  chmod 600 "$RUNTIME_MARKER"
  rm -rf "$tmp"

  local_runtime_green || die "installed local runtime failed verification"
}

select_runtime() {
  if test "${VOID_CLONE_RUN_FORCE_LOCAL_RUNTIME:-0}" != 1 && host_node_supported; then
    local major
    major="$(node -p 'process.versions.node.split(".")[0]')"
    NODE_BIN="$(command -v node)"
    NPM_BIN="$(command -v npm)"
    RUNTIME_SOURCE="host_node${major}"
  else
    ensure_local_runtime
    NODE_BIN="$RUNTIME_DIR/bin/node"
    NPM_BIN="$RUNTIME_DIR/bin/npm"
    RUNTIME_SOURCE="repo_local_node24"
  fi
  export PATH="$(dirname "$NODE_BIN"):$PATH"
}

ensure_local_configuration() {
  if test ! -e "$ENV_FILE"; then
    test -f "$ROOT/.env.example" || die "missing .env.example"
    cp -- "$ROOT/.env.example" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    say "[$MARKER] created local configuration: .env"
  fi

  if test ! -e "$NODE_KEY_FILE"; then
    "$NODE_BIN" -e '
      const crypto = require("node:crypto");
      const fs = require("node:fs");
      const target = process.argv[1];
      fs.writeFileSync(target, crypto.randomBytes(32).toString("hex") + "\n", {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
    ' "$NODE_KEY_FILE"
    say "[$MARKER] created local node-identity key: .nodekey"
  fi
  chmod 600 "$NODE_KEY_FILE"
}

load_env_file() {
  test -f "$ENV_FILE" || die "missing local configuration: $ENV_FILE"
  local entry name value
  while IFS= read -r -d '' entry; do
    name="${entry%%=*}"
    value="${entry#*=}"
    if [[ -v $name ]]; then
      continue
    fi
    printf -v "$name" '%s' "$value"
    export "$name"
  done < <(
    cd "$ROOT"
    "$NODE_BIN" - "$ENV_FILE" <<'NODE'
const fs = require("node:fs");
const dotenv = require("dotenv");
const source = fs.readFileSync(process.argv[2], "utf8");
const parsed = dotenv.parse(source);
for (const [name, value] of Object.entries(parsed)) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`invalid environment variable name: ${name}`);
  }
  process.stdout.write(`${name}=${value}\0`);
}
NODE
  )

  if test -z "${NODE_PRIVKEY_PATH:-}" && \
     test -z "${KEY_FILE:-}" && \
     test -z "${VOID_NODE_KEY_A:-}"; then
    export NODE_PRIVKEY_PATH="$NODE_KEY_FILE"
  fi
  export DATA_DIR="${DATA_DIR:-$ROOT/data}"
  export HTTP_PORT="${HTTP_PORT:-4100}"
  export P2P_PORT="${P2P_PORT:-4700}"
}

resolve_public_bootstrap() {
  if test "${VOID_PUBLIC_BOOTSTRAP_DISABLE:-0}" = 1; then
    if test "${VOID_PUBLIC_BOOTSTRAP_REQUIRE:-0}" = 1; then
      die "VOID_PUBLIC_BOOTSTRAP_REQUIRE=1 conflicts with VOID_PUBLIC_BOOTSTRAP_DISABLE=1"
    fi
    PUBLIC_BOOTSTRAP_STATE="disabled_explicitly"
    say "public_bootstrap=$PUBLIC_BOOTSTRAP_STATE"
    say "public_sync_active=false"
    say "tailnet_required=false"
    return
  fi

  test -f "$PUBLIC_BOOTSTRAP_RESOLVER" || die "missing public bootstrap resolver"
  test -f "$PUBLIC_BOOTSTRAP_SUPERVISOR" || die "missing public bootstrap supervisor"

  local manifest_override=0
  if test -n "${VOID_PUBLIC_BOOTSTRAP_MANIFEST_URLS:-}" || \
     test -n "${VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL:-}"; then
    manifest_override=1
  fi
  export VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL="${VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL:-$DEFAULT_PUBLIC_BOOTSTRAP_MANIFEST}"

  local resolved error_log local_hold_log local_hold_output
  error_log="$RUNTIME_ROOT/public-bootstrap-resolver.log"
  local_hold_log="$RUNTIME_ROOT/public-bootstrap-local-hold.log"
  mkdir -p "$RUNTIME_ROOT"
  : >"$error_log"
  : >"$local_hold_log"

  if ! resolved="$(
    cd "$ROOT"
    "$NODE_BIN" "$PUBLIC_BOOTSTRAP_RESOLVER" --allow-hold 2>"$error_log"
  )"; then
    if test "$manifest_override" = 0 && \
       test "${VOID_PUBLIC_BOOTSTRAP_REQUIRE:-0}" != 1 && \
       grep -Fq 'manifest request returned HTTP 404' "$error_log" && \
       test -f "$LOCAL_PUBLIC_BOOTSTRAP_MANIFEST"; then
      if local_hold_output="$(
        cd "$ROOT"
        "$NODE_BIN" "$PUBLIC_BOOTSTRAP_RESOLVER" \
          --allow-hold \
          --local-hold-file "$LOCAL_PUBLIC_BOOTSTRAP_MANIFEST" \
          2>"$local_hold_log"
      )" && test -z "$(printf '%s' "$local_hold_output" | tr -d '\r\n')"; then
        PUBLIC_BOOTSTRAP_STATE="local_hold_no_stable_seed"
        say "public_bootstrap=$PUBLIC_BOOTSTRAP_STATE"
        say "canonical_manifest_published=false"
        say "local_hold_manifest_verified=true"
        say "public_sync_active=false"
        say "tailnet_required=false"
        return
      fi
    fi

    cat "$error_log" >&2 || true
    cat "$local_hold_log" >&2 || true
    if test "${VOID_PUBLIC_BOOTSTRAP_OPTIONAL:-0}" = 1 && \
       test "${VOID_PUBLIC_BOOTSTRAP_REQUIRE:-0}" != 1; then
      PUBLIC_BOOTSTRAP_STATE="unavailable_optional"
      say "public_bootstrap=$PUBLIC_BOOTSTRAP_STATE"
      say "public_sync_active=false"
      say "tailnet_required=false"
      return
    fi
    die "public bootstrap manifest or stable-seed verification failed"
  fi

  resolved="$(printf '%s' "$resolved" | tail -n 1 | tr -d '\r\n')"
  if test -z "$resolved"; then
    PUBLIC_BOOTSTRAP_STATE="hold_no_stable_seed"
    say "public_bootstrap=$PUBLIC_BOOTSTRAP_STATE"
    say "canonical_manifest_published=true"
    say "public_sync_active=false"
    say "tailnet_required=false"
    if test "${VOID_PUBLIC_BOOTSTRAP_REQUIRE:-0}" = 1; then
      cat "$error_log" >&2 || true
      die "stable public synchronization is required but no stable seed is published"
    fi
    return
  fi

  export VOID_PUBLIC_SEED_CLIENT_PEERS="$resolved"
  export VOID_FOLLOWER_AUTOSTART_INTERVAL_MS="${VOID_FOLLOWER_AUTOSTART_INTERVAL_MS:-1000}"
  export VOID_FOLLOWER_CATCHUP_INTERVAL_MS="${VOID_FOLLOWER_CATCHUP_INTERVAL_MS:-250}"
  export VOID_FOLLOWER_CATCHUP_PULL_LIMIT="${VOID_FOLLOWER_CATCHUP_PULL_LIMIT:-999}"
  export VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS="${VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS:-30000}"
  PUBLIC_BOOTSTRAP_STATE="resolved_stable_https_seed"
  say "public_bootstrap=$PUBLIC_BOOTSTRAP_STATE"
  say "canonical_manifest_published=true"
  say "public_seed_count=$(printf '%s' "$resolved" | awk -F, '{print NF}')"
  say "public_sync_active=true"
  say "public_sync_via_loopback_adapter=true"
  say "tailnet_required=false"
}

source_fingerprint() {
  if command -v git >/dev/null 2>&1 && git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local head dirty
    head="$(git -C "$ROOT" rev-parse HEAD)"
    dirty="clean"
    if ! git -C "$ROOT" diff --quiet --ignore-submodules -- || \
       ! git -C "$ROOT" diff --cached --quiet --ignore-submodules --; then
      dirty="dirty"
    fi
    printf '%s-%s\n' "$head" "$dirty"
    return
  fi
  sha256sum "$ROOT/package.json" "$ROOT/package-lock.json" | sha256sum | awk '{print $1}'
}

prepare_node() {
  acquire_lock
  select_runtime
  ensure_local_configuration

  local fingerprint previous
  fingerprint="$(source_fingerprint)"
  previous="$(cat "$STAMP_FILE" 2>/dev/null || true)"

  if test "${VOID_CLONE_RUN_REBUILD:-0}" != 1 && \
     test "$previous" = "$fingerprint" && \
     test -d "$ROOT/node_modules" && \
     test -f "$ROOT/dist/index.js"; then
    say "[$MARKER] existing locked install and build are current"
  else
    say "[$MARKER] installing locked dependencies"
    (
      cd "$ROOT"
      "$NPM_BIN" ci --ignore-scripts --no-audit --no-fund
    )
    say "[$MARKER] building VOID node"
    (
      cd "$ROOT"
      "$NPM_BIN" run build
    )
    printf '%s\n' "$fingerprint" > "$STAMP_FILE"
    chmod 600 "$STAMP_FILE"
  fi

  test -f "$ROOT/dist/index.js" || die "build completed without dist/index.js"
  release_lock
  say "$MARKER PREPARE_GREEN"
  say "runtime_source=$RUNTIME_SOURCE"
  say "node_version=$($NODE_BIN --version)"
  say "supported_node_majors=$SUPPORTED_NODE_MAJORS"
  say "env_file=$ENV_FILE"
  say "node_identity_key=$NODE_KEY_FILE"
  say "wallet_key_generated=false"
  say "validator_key_generated=false"
  say "treasury_key_generated=false"
  say "authority_activated=false"
}

doctor() {
  acquire_lock
  select_runtime
  release_lock
  local rc=0
  say "marker=$MARKER"
  say "os=$(uname -s)"
  say "arch=$(uname -m)"
  say "runtime_source=$RUNTIME_SOURCE"
  say "node_version=$($NODE_BIN --version 2>/dev/null || echo unavailable)"
  say "npm_version=$($NPM_BIN --version 2>/dev/null || echo unavailable)"
  say "supported_node_majors=$SUPPORTED_NODE_MAJORS"
  say "default_node_major=24"
  say "host_node_required=false"
  say "public_bootstrap_manifest=${VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL:-$DEFAULT_PUBLIC_BOOTSTRAP_MANIFEST}"
  say "public_sync_via_loopback_adapter=true"
  say "tailnet_required=false"
  if test -f "$ENV_FILE"; then say "env_file=true"; else say "env_file=false"; rc=1; fi
  if test -f "$NODE_KEY_FILE" && test "$(stat -c '%a' "$NODE_KEY_FILE" 2>/dev/null || true)" = 600; then
    say "node_identity_key=true"
    say "node_identity_key_permissions=true"
  else
    say "node_identity_key=false"
    say "node_identity_key_permissions=false"
    rc=1
  fi
  if test -d "$ROOT/node_modules"; then say "dependencies=true"; else say "dependencies=false"; rc=1; fi
  if test -f "$ROOT/dist/index.js"; then say "build=true"; else say "build=false"; rc=1; fi
  say "wallet_key_generated=false"
  say "validator_key_generated=false"
  say "treasury_key_generated=false"
  say "authority_activated=false"
  return "$rc"
}

case "$COMMAND" in
  run)
    if test "$(id -u)" = 0 && test "${VOID_CLONE_RUN_ALLOW_ROOT:-0}" != 1; then
      die "do not run VOID as root; use the intended normal user account"
    fi
    prepare_node
    load_env_file
    resolve_public_bootstrap
    say "[$MARKER] starting VOID node"
    say "readiness=http://127.0.0.1:4100/__void/ready.json"
    cd "$ROOT"
    if test "$PUBLIC_BOOTSTRAP_STATE" = "resolved_stable_https_seed"; then
      export VOID_PUBLIC_BOOTSTRAP_NODE_ENTRY="$ROOT/dist/index.js"
      exec "$NODE_BIN" "$PUBLIC_BOOTSTRAP_SUPERVISOR"
    fi
    exec "$NODE_BIN" "$ROOT/dist/index.js"
    ;;
  prepare)
    if test "$(id -u)" = 0 && test "${VOID_CLONE_RUN_ALLOW_ROOT:-0}" != 1; then
      die "do not prepare VOID as root; use the intended normal user account"
    fi
    prepare_node
    ;;
  doctor)
    doctor
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    usage >&2
    die "unknown command: $COMMAND"
    ;;
esac
