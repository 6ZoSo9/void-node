#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

EXPECTED_HOST="zoso-Precision-Tower-7810"
EXPECTED_REPO_URL="https://github.com/6ZoSo9/void-node"
REPO="/home/zoso/dev/void-node"

SOURCE_HELPER="$REPO/ops/precision/void_precision_host_control_v1.py"
SOURCE_SUDOERS="$REPO/ops/precision/void-beta-proof-runner-precision-control-v1.sudoers.example"

HELPER="/usr/local/libexec/void/precision-host-control-v1.py"
SUDOERS="/etc/sudoers.d/void-precision-host-control-v1"

EXPECTED_HELPER_SHA="e94246d3316c647f5f6c76c25d291aadc25899e814169e4193cf2fe74d3d5308"
PLACEHOLDER="__VOID_BETA_RUNNER_USER__"

hold() {
  printf 'HOLD: %s\n' "$*" >&2
  exit 1
}

test "$(id -u)" = "0" ||
  hold "installer must run as root"

test "$(hostname)" = "$EXPECTED_HOST" ||
  hold "installer must run on Precision"

for cmd in pgrep ps readlink python3 install sha256sum visudo stat getent
do
  command -v "$cmd" >/dev/null 2>&1 ||
    hold "$cmd is not installed"
done

test -d "$REPO/.git" ||
  hold "canonical repository missing"

test -f "$SOURCE_HELPER" && test ! -L "$SOURCE_HELPER" ||
  hold "reviewed source helper missing or symlinked"
test -f "$SOURCE_SUDOERS" && test ! -L "$SOURCE_SUDOERS" ||
  hold "reviewed sudoers template missing or symlinked"

SOURCE_HELPER_SHA="$(sha256sum "$SOURCE_HELPER" | awk '{print $1}')"
printf 'source_helper_sha256=%s\n' "$SOURCE_HELPER_SHA"
test "$SOURCE_HELPER_SHA" = "$EXPECTED_HELPER_SHA" ||
  hold "source helper SHA does not match reviewed packet"

echo "stage=detect_existing_repository_beta_runner"
mapfile -t PIDS < <(pgrep -f 'Runner\.Listener' || true)

declare -a MATCH_PIDS=()
declare -a MATCH_USERS=()
declare -a MATCH_DIRS=()

for pid in "${PIDS[@]:-}"
do
  test -r "/proc/$pid/status" || continue
  user="$(ps -o user= -p "$pid" 2>/dev/null | awk '{print $1}')"
  cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  test -n "$user" && test -n "$cwd" || continue
  test "$user" != "root" || continue
  test -f "$cwd/.runner" && test ! -L "$cwd/.runner" || continue

  matches="$(
    python3 - "$cwd/.runner" "$EXPECTED_REPO_URL" <<'PY'
import json,sys
path,expected=sys.argv[1:]
try:
    value=json.load(open(path,encoding="utf-8"))
except Exception:
    print("false")
    raise SystemExit(0)
github_url=str(value.get("gitHubUrl") or "").rstrip("/")
print("true" if github_url == expected.rstrip("/") else "false")
PY
  )"
  test "$matches" = "true" || continue

  MATCH_PIDS+=("$pid")
  MATCH_USERS+=("$user")
  MATCH_DIRS+=("$cwd")
done

test "${#MATCH_PIDS[@]}" -eq 1 ||
  hold "expected exactly one running repository-scoped beta runner on Precision; found ${#MATCH_PIDS[@]}"

RUNNER_PID="${MATCH_PIDS[0]}"
RUNNER_USER="${MATCH_USERS[0]}"
RUNNER_DIR="${MATCH_DIRS[0]}"

printf 'runner_pid=%s\n' "$RUNNER_PID"
printf 'runner_user=%s\n' "$RUNNER_USER"
printf 'runner_dir=%s\n' "$RUNNER_DIR"

getent passwd "$RUNNER_USER" >/dev/null ||
  hold "detected runner user has no passwd entry"

case "$RUNNER_USER" in
  root|'') hold "invalid runner user" ;;
esac

echo "runner_registration_modified=false"
echo "runner_service_modified=false"
echo "runner_credentials_read=false"

echo "stage=install_root_owned_helper"
install -d -o root -g root -m 0755 /usr/local/libexec/void
install -o root -g root -m 0755 "$SOURCE_HELPER" "$HELPER"

INSTALLED_HELPER_SHA="$(sha256sum "$HELPER" | awk '{print $1}')"
printf 'installed_helper_sha256=%s\n' "$INSTALLED_HELPER_SHA"
test "$INSTALLED_HELPER_SHA" = "$EXPECTED_HELPER_SHA" ||
  hold "installed helper SHA mismatch"
test "$(stat -c '%U:%G:%a' "$HELPER")" = "root:root:755" ||
  hold "installed helper owner/mode mismatch"

echo "stage=render_and_validate_narrow_sudoers"
TMP="$(mktemp /etc/sudoers.d/.void-precision-host-control-v1.XXXXXX)"
trap 'rm -f -- "$TMP"' EXIT

python3 - "$SOURCE_SUDOERS" "$TMP" "$PLACEHOLDER" "$RUNNER_USER" <<'PY'
import re,sys
src,dst,placeholder,user=sys.argv[1:]
if not re.fullmatch(r"[a-z_][a-z0-9_-]{0,31}", user):
    raise SystemExit("invalid runner username")
text=open(src,encoding="utf-8").read()
if text.count(placeholder) < 1:
    raise SystemExit("sudoers placeholder missing")
text=text.replace(placeholder,user)
open(dst,"w",encoding="utf-8").write(text)
PY

chown root:root "$TMP"
chmod 0440 "$TMP"
visudo -cf "$TMP"
mv -f -- "$TMP" "$SUDOERS"
trap - EXIT

test "$(stat -c '%U:%G:%a' "$SUDOERS")" = "root:root:440" ||
  hold "installed sudoers owner/mode mismatch"
visudo -cf "$SUDOERS"

echo "stage=verify_no_runtime_or_economic_activation"
test ! -e "/home/zoso/.local/state/void-buy-void-prepared-transaction-custodian-v1" ||
  hold "custody store unexpectedly exists"
test ! -e "/run/user/1000/void-buy-void-prepared-transaction-custodian-v1.sock" ||
  hold "custodian socket unexpectedly exists"

echo "VOID_PRECISION_HOST_CONTROL_EXISTING_BETA_RUNNER_INSTALL_V1_GREEN"
echo "runner_user=$RUNNER_USER"
echo "runner_pid=$RUNNER_PID"
echo "runner_dir=$RUNNER_DIR"
echo "helper_sha256=$INSTALLED_HELPER_SHA"
echo "sudoers_valid=true"
echo "runner_registration_modified=false"
echo "runner_service_modified=false"
echo "runner_credentials_read=false"
echo "void_node_service_restart=false"
echo "void_node_service_start=false"
echo "credential_read=false"
echo "signer_access=false"
echo "rpc_call=false"
echo "submit_once=false"
echo "transaction_broadcast=false"
echo "money_movement=false"
