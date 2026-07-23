#!/usr/bin/env bash
set -euo pipefail
set +H
umask 077

MARKER="VOID_PUBLIC_RELEASE_INSTALLER_V1"
REPO_SLUG="6ZoSo9/void-node"
DEFAULT_BASE_URL="https://github.com/${REPO_SLUG}/releases/latest/download"
COMMAND="install"
BASE_URL="${VOID_RELEASE_BASE_URL:-$DEFAULT_BASE_URL}"
MANIFEST_URL=""
MANIFEST_FILE=""
ARCHIVE_FILE=""
CHECKSUMS_FILE=""
INSTALL_ROOT="${VOID_NODE_INSTALL_ROOT:-$HOME/.local/share/void-node}"
BIN_DIR="${VOID_NODE_BIN_DIR:-$HOME/.local/bin}"
CONFIG_DIR="${VOID_NODE_CONFIG_DIR:-$HOME/.config/void-node}"
STATE_DIR="${VOID_NODE_STATE_DIR:-$HOME/.local/state/void-node}"
SYSTEMD_DIR="${VOID_NODE_SYSTEMD_DIR:-$HOME/.config/systemd/user}"
YES=0
ENABLE=0
START=0
PURGE=0
VERIFY_ATTESTATION=0
KEEP_RELEASES="${VOID_NODE_KEEP_RELEASES:-3}"
TMP=""

say(){ printf '%s\n' "$*"; }
die(){ say "ERROR: $*" >&2; exit 1; }
cleanup(){ test -z "$TMP" || rm -rf "$TMP"; }
trap cleanup EXIT INT TERM
need(){ command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"; }
manager_available(){ command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; }

usage(){
  cat <<'HELP'
VOID Network release installer v1

Usage:
  install-void-node-v1.sh [install|update] [options]
  install-void-node-v1.sh uninstall [--yes] [--purge]
  install-void-node-v1.sh self-test

Options:
  --base-url URL          Stable release-asset base URL.
  --manifest-url URL      Override release manifest URL.
  --manifest FILE         Use a local release manifest.
  --archive FILE          Use a local release archive.
  --checksums FILE        Use a local SHA256SUMS.
  --install-root DIR      Versioned release root.
  --bin-dir DIR           User command symlink directory.
  --enable                Enable the user service after install.
  --start                 Start the user service after install (implies --enable).
  --verify-attestation    Require GitHub artifact attestation verification.
  --yes                   Confirm non-interactively.
  --purge                 With uninstall, also remove config and state.

The installer verifies an outer SHA-256 manifest, rejects archive traversal,
verifies every file against the archive's internal checksum manifest, installs
atomically, preserves one rollback pointer, and does not start the node by
default. It never creates wallet, validator, or treasury private keys.
HELP
}

if test $# -gt 0; then
  case "$1" in install|update|uninstall|self-test) COMMAND="$1"; shift;; esac
fi
while test $# -gt 0; do
  case "$1" in
    --base-url) BASE_URL="${2:?missing URL}"; shift 2;;
    --manifest-url) MANIFEST_URL="${2:?missing URL}"; shift 2;;
    --manifest) MANIFEST_FILE="${2:?missing file}"; shift 2;;
    --archive) ARCHIVE_FILE="${2:?missing file}"; shift 2;;
    --checksums) CHECKSUMS_FILE="${2:?missing file}"; shift 2;;
    --install-root) INSTALL_ROOT="${2:?missing directory}"; shift 2;;
    --bin-dir) BIN_DIR="${2:?missing directory}"; shift 2;;
    --enable) ENABLE=1; shift;;
    --start) START=1; ENABLE=1; shift;;
    --verify-attestation) VERIFY_ATTESTATION=1; shift;;
    --yes|-y) YES=1; shift;;
    --purge) PURGE=1; shift;;
    --help|-h) usage; exit 0;;
    *) die "unknown argument: $1";;
  esac
done

if test "$COMMAND" = self-test; then
  grep -q '^MARKER="VOID_PUBLIC_RELEASE_INSTALLER_V1"' "${BASH_SOURCE[0]}"
  grep -q 'service_started_implicitly=false' "${BASH_SOURCE[0]}"
  say "$MARKER SELF_TEST_GREEN"
  exit 0
fi

if test "$COMMAND" = uninstall; then
  if test "$YES" != 1; then
    printf 'Remove VOID node release installation at %s? [y/N] ' "$INSTALL_ROOT" >&2
    read -r answer
    case "$answer" in y|Y|yes|YES) ;; *) die "uninstall cancelled";; esac
  fi
  if manager_available; then
    systemctl --user stop void-node.service >/dev/null 2>&1 || true
    systemctl --user disable void-node.service >/dev/null 2>&1 || true
  fi
  rm -f "$BIN_DIR/void-node" "$BIN_DIR/void-node-run"
  rm -f "$SYSTEMD_DIR/void-node.service"
  rm -rf "$INSTALL_ROOT"
  if test "$PURGE" = 1; then
    rm -rf "$CONFIG_DIR" "$STATE_DIR"
  fi
  if manager_available; then systemctl --user daemon-reload >/dev/null 2>&1 || true; fi
  say "$MARKER UNINSTALL_GREEN"
  say "purged_config_and_state=$([ "$PURGE" = 1 ] && echo true || echo false)"
  exit 0
fi

if test "$(id -u)" = 0 && test "${VOID_NODE_ALLOW_ROOT_INSTALL:-0}" != 1; then
  die "refusing root install; install as the intended unprivileged user"
fi

for tool in node python3 sha256sum tar gzip install readlink mktemp; do need "$tool"; done
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if test "$NODE_MAJOR" != 22 && test "${VOID_NODE_INSTALL_ALLOW_UNSUPPORTED_NODE:-0}" != 1; then
  die "Node.js 22 is required; found $(node --version)"
fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/void-node-install.XXXXXXXX")"
mkdir -p "$TMP/download" "$TMP/extract"

fetch(){
  local source="$1" dest="$2"
  case "$source" in
    file://*) cp -- "${source#file://}" "$dest";;
    http://127.0.0.1:*|http://localhost:*)
      test "${VOID_NODE_ALLOW_LOOPBACK_HTTP:-0}" = 1 || die "loopback HTTP requires VOID_NODE_ALLOW_LOOPBACK_HTTP=1"
      need curl
      curl --fail --silent --show-error --location --proto '=http' --max-time 120 "$source" -o "$dest"
      ;;
    https://*)
      need curl
      curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --max-time 300 "$source" -o "$dest"
      ;;
    *) cp -- "$source" "$dest";;
  esac
}

if test -z "$MANIFEST_FILE"; then
  test -n "$MANIFEST_URL" || MANIFEST_URL="${BASE_URL%/}/void-node-release-manifest.json"
  MANIFEST_FILE="$TMP/download/void-node-release-manifest.json"
  fetch "$MANIFEST_URL" "$MANIFEST_FILE"
fi
test -f "$MANIFEST_FILE" || die "release manifest not found: $MANIFEST_FILE"

mapfile -t META < <(python3 - "$MANIFEST_FILE" <<'PYMETA'
import json, pathlib, re, sys
p=pathlib.Path(sys.argv[1])
j=json.loads(p.read_text())
assert j.get("marker")=="VOID_PUBLIC_RELEASE_MANIFEST_V1", j
version=str(j.get("version", ""))
archive=str(j.get("archive", ""))
checksums=str(j.get("checksums", "SHA256SUMS"))
sha=str(j.get("archive_sha256", ""))
assert re.fullmatch(r"[0-9A-Za-z][0-9A-Za-z._+-]{0,127}", version), version
assert re.fullmatch(r"[0-9A-Za-z][0-9A-Za-z._+-]{0,180}\.tar\.gz", archive), archive
assert checksums=="SHA256SUMS", checksums
assert re.fullmatch(r"[0-9a-f]{64}", sha), sha
print(version)
print(archive)
print(checksums)
print(sha)
PYMETA
)
VERSION="${META[0]}"
ARCHIVE_NAME="${META[1]}"
CHECKSUMS_NAME="${META[2]}"
EXPECTED_ARCHIVE_SHA="${META[3]}"

if test -z "$ARCHIVE_FILE"; then
  ARCHIVE_FILE="$TMP/download/$ARCHIVE_NAME"
  fetch "${BASE_URL%/}/$ARCHIVE_NAME" "$ARCHIVE_FILE"
fi
if test -z "$CHECKSUMS_FILE"; then
  CHECKSUMS_FILE="$TMP/download/$CHECKSUMS_NAME"
  fetch "${BASE_URL%/}/$CHECKSUMS_NAME" "$CHECKSUMS_FILE"
fi
for f in "$ARCHIVE_FILE" "$CHECKSUMS_FILE"; do test -f "$f" || die "required release file missing: $f"; done

python3 - "$CHECKSUMS_FILE" "$ARCHIVE_FILE" "$ARCHIVE_NAME" "$EXPECTED_ARCHIVE_SHA" <<'PYSUM'
import hashlib, pathlib, re, sys
sums=pathlib.Path(sys.argv[1]).read_text().splitlines()
archive=pathlib.Path(sys.argv[2]); name=sys.argv[3]; manifest_sha=sys.argv[4]
entries={}
for line in sums:
    m=re.fullmatch(r"([0-9a-f]{64})  ([^/\n]+)", line)
    if not m: raise SystemExit(f"invalid SHA256SUMS line: {line!r}")
    if m.group(2) in entries: raise SystemExit("duplicate SHA256SUMS entry")
    entries[m.group(2)]=m.group(1)
if name not in entries: raise SystemExit(f"archive absent from SHA256SUMS: {name}")
h=hashlib.sha256()
with archive.open("rb") as f:
    for chunk in iter(lambda:f.read(1024*1024), b""): h.update(chunk)
actual=h.hexdigest()
if actual != entries[name] or actual != manifest_sha:
    raise SystemExit(f"archive SHA mismatch actual={actual} sums={entries[name]} manifest={manifest_sha}")
print(f"outer_archive_sha256_verified={actual}")
PYSUM

if test "$VERIFY_ATTESTATION" = 1; then
  need gh
  gh attestation verify "$ARCHIVE_FILE" --repo "$REPO_SLUG"
fi

python3 - "$ARCHIVE_FILE" <<'PYTAR'
import pathlib, posixpath, sys, tarfile
p=pathlib.Path(sys.argv[1])
with tarfile.open(p, "r:gz") as tf:
    members=tf.getmembers()
    if not members: raise SystemExit("empty archive")
    roots=set()
    for m in members:
        name=m.name
        if name.startswith("/") or "\\" in name or "\x00" in name:
            raise SystemExit(f"unsafe archive member: {name!r}")
        norm=posixpath.normpath(name)
        if norm==".." or norm.startswith("../"):
            raise SystemExit(f"archive traversal: {name!r}")
        roots.add(norm.split("/",1)[0])
        if m.issym() or m.islnk():
            target=m.linkname
            if target.startswith("/"):
                raise SystemExit(f"absolute archive link: {name!r} -> {target!r}")
            resolved=posixpath.normpath(posixpath.join(posixpath.dirname(norm), target))
            if resolved==".." or resolved.startswith("../"):
                raise SystemExit(f"escaping archive link: {name!r} -> {target!r}")
    if len(roots)!=1: raise SystemExit(f"archive must have one top directory: {sorted(roots)}")
    print(f"archive_path_safety_verified=true root={next(iter(roots))}")
PYTAR

tar -xzf "$ARCHIVE_FILE" -C "$TMP/extract" --no-same-owner --no-same-permissions
EXTRACTED="$(find "$TMP/extract" -mindepth 1 -maxdepth 1 -type d -print -quit)"
test -n "$EXTRACTED" || die "archive extraction produced no release directory"
test -f "$EXTRACTED/BUILD-INFO.json" || die "release missing BUILD-INFO.json"
test -f "$EXTRACTED/RELEASE-CONTENTS-SHA256" || die "release missing RELEASE-CONTENTS-SHA256"
(
  cd "$EXTRACTED"
  sha256sum --check --strict RELEASE-CONTENTS-SHA256
)

python3 - "$MANIFEST_FILE" "$EXTRACTED/BUILD-INFO.json" <<'PYBIND'
import json, pathlib, sys
m=json.loads(pathlib.Path(sys.argv[1]).read_text())
b=json.loads(pathlib.Path(sys.argv[2]).read_text())
for k in ("version", "git_commit"):
    if str(m.get(k)) != str(b.get(k)):
        raise SystemExit(f"manifest/build mismatch {k}: {m.get(k)!r} != {b.get(k)!r}")
print("manifest_build_binding_verified=true")
PYBIND

mkdir -p "$INSTALL_ROOT/releases" "$BIN_DIR" "$CONFIG_DIR" "$STATE_DIR" "$SYSTEMD_DIR"
chmod 700 "$INSTALL_ROOT" "$CONFIG_DIR" "$STATE_DIR" 2>/dev/null || true
DEST="$INSTALL_ROOT/releases/$VERSION"
if test -d "$DEST"; then
  (
    cd "$DEST"
    sha256sum --check --strict RELEASE-CONTENTS-SHA256 >/dev/null
  ) || die "existing release directory failed verification: $DEST"
  rm -rf "$EXTRACTED"
else
  mv "$EXTRACTED" "$DEST"
fi

OLD_CURRENT=""
if test -L "$INSTALL_ROOT/current"; then OLD_CURRENT="$(readlink -f "$INSTALL_ROOT/current")"; fi
ln -sfn "$DEST" "$INSTALL_ROOT/.current.next"
mv -Tf "$INSTALL_ROOT/.current.next" "$INSTALL_ROOT/current"
if test -n "$OLD_CURRENT" && test "$OLD_CURRENT" != "$DEST" && test -d "$OLD_CURRENT"; then
  ln -sfn "$OLD_CURRENT" "$INSTALL_ROOT/.previous.next"
  mv -Tf "$INSTALL_ROOT/.previous.next" "$INSTALL_ROOT/previous"
fi

ln -sfn "$INSTALL_ROOT/current/bin/void-node" "$BIN_DIR/void-node"
ln -sfn "$INSTALL_ROOT/current/bin/void-node-run" "$BIN_DIR/void-node-run"

ENV_FILE="$CONFIG_DIR/env"
if test ! -e "$ENV_FILE"; then
  cat > "$ENV_FILE" <<EOFENV
# VOID node user-service environment.
VOID_DATA_DIR=$STATE_DIR/data
VOID_HTTP_HOST=127.0.0.1
VOID_HTTP_PORT=4100
VOID_P2P_HOST=127.0.0.1
VOID_P2P_PORT=4700
# Set this to an existing mode-0600/0400 key file only when your node lane requires it.
# VOID_NODE_KEY_FILE=$CONFIG_DIR/node-key.json
EOFENV
  chmod 600 "$ENV_FILE"
fi
mkdir -p "$STATE_DIR/data"
chmod 700 "$STATE_DIR/data" 2>/dev/null || true

cat > "$SYSTEMD_DIR/void-node.service" <<EOFUNIT
[Unit]
Description=VOID Network participant node
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=-$ENV_FILE
ExecStart=$INSTALL_ROOT/current/bin/void-node-run
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=read-only
ProtectSystem=strict
ReadWritePaths=$STATE_DIR $CONFIG_DIR $INSTALL_ROOT
LockPersonality=true
MemoryDenyWriteExecute=true
RestrictSUIDSGID=true

[Install]
WantedBy=default.target
EOFUNIT
chmod 644 "$SYSTEMD_DIR/void-node.service"

# Keep current, previous, and a bounded number of older release directories.
python3 - "$INSTALL_ROOT" "$KEEP_RELEASES" <<'PYTRIM'
import pathlib, shutil, sys
root=pathlib.Path(sys.argv[1]); keep=max(1,int(sys.argv[2])); releases=root/"releases"
protected=set()
for n in ("current","previous"):
    p=root/n
    if p.is_symlink():
        try: protected.add(p.resolve())
        except OSError: pass
others=sorted([p for p in releases.iterdir() if p.is_dir() and p.resolve() not in protected], key=lambda p:p.stat().st_mtime, reverse=True)
for p in others[keep:]: shutil.rmtree(p)
PYTRIM

if test "$ENABLE" = 1 || test "$START" = 1; then
  manager_available || die "--enable/--start requested but systemd user manager is unavailable"
  systemctl --user daemon-reload
fi
if test "$ENABLE" = 1; then systemctl --user enable void-node.service; fi
if test "$START" = 1; then systemctl --user start void-node.service; fi

say "$MARKER INSTALL_GREEN"
say "version=$VERSION"
say "release_dir=$DEST"
say "current=$(readlink -f "$INSTALL_ROOT/current")"
say "command=$BIN_DIR/void-node"
say "service_enabled=$([ "$ENABLE" = 1 ] && echo true || echo false)"
say "service_started=$([ "$START" = 1 ] && echo true || echo false)"
say "service_started_implicitly=false"
say "wallet_key_generated=false"
say "validator_key_generated=false"
say "treasury_key_generated=false"
say "buy_void_fulfillment=false"
say "money_movement=false"
