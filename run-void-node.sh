#!/usr/bin/env bash
set -Eeuo pipefail
set +H
umask 077

MARKER="VOID_NODE_CLONE_AND_RUN_V1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
COMMAND="${1:-run}"

NODE_VERSION="v22.23.2"
NODE_ARCHIVE="node-${NODE_VERSION}-linux-x64.tar.gz"
NODE_DIRECTORY="node-${NODE_VERSION}-linux-x64"
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_ARCHIVE}"
NODE_SHA256="b294a556e639d64338823920e5866c21c02741742d2e1529ee1a225c1ec9252a"
RUNTIME_ROOT="$ROOT/.runtime/clone-run-v1"
RUNTIME_DIR="$RUNTIME_ROOT/$NODE_DIRECTORY"
RUNTIME_MARKER="$RUNTIME_DIR/.void-runtime-sha256"
LOCK_DIR="$RUNTIME_ROOT/.prepare-lock"
STAMP_FILE="$RUNTIME_ROOT/prepared-source-v1"
ENV_FILE="$ROOT/.env"
NODE_KEY_FILE="$ROOT/.nodekey"

NODE_BIN=""
NPM_BIN=""
RUNTIME_SOURCE=""
LOCK_HELD=0

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

The first run may download the pinned Node.js 22 runtime into .runtime/. It does
not use sudo or install Node.js globally. It creates a local .env and a private
node-identity key at .nodekey when they do not already exist. That identity key
is not a wallet, validator, treasury, or operator-authority key.
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

host_node_supported() {
  command -v node >/dev/null 2>&1 || return 1
  command -v npm >/dev/null 2>&1 || return 1
  local major
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
  test "$major" = 22
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
  test "$($RUNTIME_DIR/bin/node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)" = 22
}

ensure_local_runtime() {
  test "$(uname -s)" = Linux || die "automatic runtime bootstrap currently supports Linux only"
  case "$(uname -m)" in
    x86_64|amd64) ;;
    *) die "automatic runtime bootstrap currently supports Linux x86-64 only";;
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
  test "$($extracted/$NODE_DIRECTORY/bin/node -p 'process.versions.node.split(".")[0]')" = 22 \
    || die "downloaded runtime is not Node.js 22"

  rm -rf "$RUNTIME_DIR"
  mv "$extracted/$NODE_DIRECTORY" "$RUNTIME_DIR"
  printf '%s\n' "$NODE_SHA256" > "$RUNTIME_MARKER"
  chmod 600 "$RUNTIME_MARKER"
  rm -rf "$tmp"

  local_runtime_green || die "installed local runtime failed verification"
}

select_runtime() {
  if test "${VOID_CLONE_RUN_FORCE_LOCAL_RUNTIME:-0}" != 1 && host_node_supported; then
    NODE_BIN="$(command -v node)"
    NPM_BIN="$(command -v npm)"
    RUNTIME_SOURCE="host_node22"
  else
    ensure_local_runtime
    NODE_BIN="$RUNTIME_DIR/bin/node"
    NPM_BIN="$RUNTIME_DIR/bin/npm"
    RUNTIME_SOURCE="repo_local_node22"
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

  export NODE_PRIVKEY_PATH="${NODE_PRIVKEY_PATH:-$NODE_KEY_FILE}"
  export DATA_DIR="${DATA_DIR:-$ROOT/data}"
  export HTTP_PORT="${HTTP_PORT:-4100}"
  export P2P_PORT="${P2P_PORT:-4700}"
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
  say "host_node_required=false"
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
    say "[$MARKER] starting VOID node"
    say "readiness=http://127.0.0.1:4100/__void/ready.json"
    cd "$ROOT"
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
