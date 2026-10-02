#!/usr/bin/env bash
set -Eeuo pipefail
set +H
umask 077

MARKER="VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_APPLY_WRAPPER_V1"
ROOT="${VOID_LIVE_REPO_ROOT:-$HOME/dev/void-node}"
EXPECTED_HOST="zoso-Precision-Tower-7810"
UNIT="void-node-live.service"
SYSTEMD_DIR="$HOME/.config/systemd/user"
DROPIN_DIR="$SYSTEMD_DIR/$UNIT.d"
DROPIN_BASENAME="96-buy-void-payment-keyed-postgres-atomic-activation-v1.conf"
ACTIVE_DROPIN="$DROPIN_DIR/$DROPIN_BASENAME"
STAGE_WRAPPER_REL="ops/precision/void_precision_buy_void_atomic_activation_stage_v1.sh"
STAGE_WRAPPER="$ROOT/$STAGE_WRAPPER_REL"
CANONICAL_REMOTE_URL="https://github.com/6ZoSo9/void-node.git"
APPLY="${APPLY:-0}"
CONFIRM="${CONFIRM:-}"
GIT_BIN="/usr/bin/git"
BASH_BIN="/usr/bin/bash"
PYTHON_BIN="/usr/bin/python3"

SUCCESS=0
CHANGED=0
ROLLBACK_PATH=""
EXPECTED_ROLLBACK_SHA256=""
EVIDENCE_DIR=""
TMP=""

say(){ printf '%s\n' "$*"; }
hold(){ say "${MARKER}_HOLD reason=$*" >&2; exit 2; }
need(){ command -v "$1" >/dev/null 2>&1 || hold "required_command_missing:$1"; }

ensure_private_direct_dir(){
  local dir="$1"
  local label="$2"
  local parent
  parent="$(dirname "$dir")"

  if test -e "$dir" || test -L "$dir"; then
    test -d "$dir" && test ! -L "$dir" ||
      hold "${label}_not_direct_directory"
    test "$(readlink -f "$dir")" = "$dir" ||
      hold "${label}_alias_forbidden"
  else
    test -d "$parent" && test ! -L "$parent" ||
      hold "${label}_parent_not_direct_directory"
    test "$(readlink -f "$parent")" = "$parent" ||
      hold "${label}_parent_alias_forbidden"
    test "$(stat -c '%u' "$parent")" = "$(id -u)" ||
      hold "${label}_parent_owner_mismatch"
    mkdir -m 700 -- "$dir" || hold "${label}_create_failed"
  fi

  test "$(stat -c '%u' "$dir")" = "$(id -u)" ||
    hold "${label}_owner_mismatch"
  chmod 700 "$dir"
  test "$(stat -c '%a' "$dir")" = "700" ||
    hold "${label}_mode_mismatch"
}

safe_git(){
  env \
    -u GIT_DIR \
    -u GIT_WORK_TREE \
    -u GIT_COMMON_DIR \
    -u GIT_INDEX_FILE \
    -u GIT_OBJECT_DIRECTORY \
    -u GIT_ALTERNATE_OBJECT_DIRECTORIES \
    -u GIT_NAMESPACE \
    -u GIT_REPLACE_REF_BASE \
    -u GIT_CONFIG_PARAMETERS \
    -u GIT_CONFIG_COUNT \
    -u GIT_EXEC_PATH \
    -u GIT_SSH \
    -u GIT_SSH_COMMAND \
    -u GIT_ASKPASS \
    -u SSH_ASKPASS \
    -u GIT_EXTERNAL_DIFF \
    -u GIT_PAGER \
    -u GIT_EDITOR \
    -u GIT_SEQUENCE_EDITOR \
    PATH=/usr/bin:/bin \
    HOME=/nonexistent \
    GIT_CONFIG_GLOBAL=/dev/null \
    GIT_CONFIG_SYSTEM=/dev/null \
    GIT_CONFIG_NOSYSTEM=1 \
    GIT_TERMINAL_PROMPT=0 \
    GIT_OPTIONAL_LOCKS=0 \
    LANG=C LC_ALL=C \
    "$GIT_BIN" --no-replace-objects -C "$ROOT" \
      -c core.fsmonitor=false \
      -c core.hooksPath=/dev/null \
      -c core.attributesFile=/dev/null \
      -c core.untrackedCache=false \
      -c core.preloadIndex=false \
      -c submodule.recurse=false \
      "$@"
}

safe_git_timeout(){
  env \
    -u GIT_DIR \
    -u GIT_WORK_TREE \
    -u GIT_COMMON_DIR \
    -u GIT_INDEX_FILE \
    -u GIT_OBJECT_DIRECTORY \
    -u GIT_ALTERNATE_OBJECT_DIRECTORIES \
    -u GIT_NAMESPACE \
    -u GIT_REPLACE_REF_BASE \
    -u GIT_CONFIG_PARAMETERS \
    -u GIT_CONFIG_COUNT \
    -u GIT_EXEC_PATH \
    -u GIT_SSH \
    -u GIT_SSH_COMMAND \
    -u GIT_ASKPASS \
    -u SSH_ASKPASS \
    -u GIT_EXTERNAL_DIFF \
    -u GIT_PAGER \
    -u GIT_EDITOR \
    -u GIT_SEQUENCE_EDITOR \
    PATH=/usr/bin:/bin \
    HOME=/nonexistent \
    GIT_CONFIG_GLOBAL=/dev/null \
    GIT_CONFIG_SYSTEM=/dev/null \
    GIT_CONFIG_NOSYSTEM=1 \
    GIT_TERMINAL_PROMPT=0 \
    GIT_OPTIONAL_LOCKS=0 \
    LANG=C LC_ALL=C \
    timeout 15 "$GIT_BIN" --no-replace-objects -C / "$@"
}

atomic_install(){
  local source="$1"
  local destination="$2"
  local expected_sha="$3"
  "$PYTHON_BIN" - "$source" "$destination" "$expected_sha" <<'PY'
import hashlib, os, stat, sys

source, destination, expected = sys.argv[1:]
uid = os.getuid()
parent = os.path.dirname(destination)

def fail(message):
    raise SystemExit(message)

for path, label in ((source, "source"), (parent, "destination_parent")):
    st = os.lstat(path)
    if stat.S_ISLNK(st.st_mode):
        fail(label + "_symlink_forbidden")
    if st.st_uid != uid:
        fail(label + "_owner_mismatch")

src_st = os.stat(source, follow_symlinks=False)
if not stat.S_ISREG(src_st.st_mode):
    fail("source_not_regular")
if src_st.st_nlink != 1:
    fail("source_link_count_invalid")
if stat.S_IMODE(src_st.st_mode) != 0o600:
    fail("source_mode_invalid")

parent_st = os.stat(parent, follow_symlinks=False)
if not stat.S_ISDIR(parent_st.st_mode):
    fail("destination_parent_not_directory")

with open(source, "rb", buffering=0) as fh:
    data = fh.read()
actual = hashlib.sha256(data).hexdigest()
if actual != expected:
    fail("source_sha256_mismatch")

if os.path.lexists(destination):
    dst_st = os.lstat(destination)
    if stat.S_ISLNK(dst_st.st_mode):
        fail("destination_symlink_forbidden")

temp = destination + f".tmp-{os.getpid()}"
if os.path.lexists(temp):
    fail("destination_temp_exists")

fd = os.open(
    temp,
    os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0),
    0o600,
)
try:
    view = memoryview(data)
    while view:
        written = os.write(fd, view)
        if written <= 0:
            fail("destination_write_failed")
        view = view[written:]
    os.fchmod(fd, 0o600)
    os.fsync(fd)
finally:
    os.close(fd)

temp_st = os.stat(temp, follow_symlinks=False)
if not stat.S_ISREG(temp_st.st_mode) or temp_st.st_uid != uid:
    fail("destination_temp_identity_invalid")
if stat.S_IMODE(temp_st.st_mode) != 0o600 or temp_st.st_nlink != 1:
    fail("destination_temp_custody_invalid")

os.replace(temp, destination)
dirfd = os.open(parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
try:
    os.fsync(dirfd)
finally:
    os.close(dirfd)

dst_st = os.stat(destination, follow_symlinks=False)
if not stat.S_ISREG(dst_st.st_mode) or dst_st.st_uid != uid:
    fail("destination_identity_invalid")
if stat.S_IMODE(dst_st.st_mode) != 0o600 or dst_st.st_nlink != 1:
    fail("destination_custody_invalid")
with open(destination, "rb") as fh:
    final = hashlib.sha256(fh.read()).hexdigest()
if final != expected:
    fail("destination_sha256_mismatch")
PY
}

configured_gate_check(){
  local expected="$1"
  local raw="$TMP/systemd-environment-${expected}.txt"
  systemctl --user show "$UNIT" -p Environment --value >"$raw"
  "$PYTHON_BIN" - "$raw" "$expected" <<'PY'
import shlex, sys

path, expected = sys.argv[1:]
raw = open(path, encoding="utf-8").read().strip()
env = {}
for token in shlex.split(raw):
    if "=" not in token:
        continue
    key, value = token.split("=", 1)
    env[key] = value

gates = [
    "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
    "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
    "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
]
wanted = {
    "live": ["1", "1", "1", "1", "1"],
    "dormant": ["1", "0", "0", "0", "0"],
}[expected]
actual = [env.get(name) for name in gates]
if actual != wanted:
    raise SystemExit(
        "effective_buy_void_gate_mismatch:" +
        ",".join(f"{name}={env.get(name)!r}" for name in gates)
    )
if env.get("VOID_BUY_REQUESTS_ENABLED") == "1":
    raise SystemExit("public_buy_request_intake_unexpectedly_enabled")
print("effective_buy_void_gates=" + expected)
print("public_buy_request_intake_enabled=false")
PY
}

wait_for_private_runtime(){
  local expected="$1"
  local health="$TMP/health-${expected}.json"
  local ready="$TMP/ready-${expected}.json"
  local runtime="$TMP/buy-runtime-${expected}.json"
  local ok=0

  for _ in $(seq 1 90); do
    if curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 \
         http://127.0.0.1:4100/health >"$health" 2>/dev/null &&
       curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 \
         http://127.0.0.1:4100/__void/ready.json >"$ready" 2>/dev/null &&
       curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 \
         http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/status \
         >"$runtime" 2>/dev/null &&
       "$PYTHON_BIN" - "$health" "$ready" "$runtime" "$expected" <<'PY' >/dev/null 2>&1
import json, sys

health, ready, runtime = [
    json.load(open(path, encoding="utf-8")) for path in sys.argv[1:4]
]
expected = sys.argv[4]

assert health.get("ok") is True, health
assert ready.get("ready") is True, ready
assert int(ready.get("gap", -1)) == 0, ready
assert int(ready.get("txroot_live", 0)) == 1, ready
assert isinstance(ready.get("reasons"), list) and not ready["reasons"], ready

full = runtime.get("payment_keyed_full_runtime") or {}
claimed = runtime.get("payment_keyed_dispatcher_claimed_runtime") or {}
assert runtime.get("enabled") is True, runtime
assert full.get("policy_configured") is True, full
assert full.get("signing_dependency_env_configured") is True, full
assert full.get("history_carrier_activation_ready") is True, full
assert full.get("history_carrier_activation_hold_reason") == "", full

if expected == "live":
    assert full.get("enabled") is True, full
    assert full.get("apply_enabled") is True, full
    assert claimed.get("claimed_runtime_enabled") is True, claimed
    assert claimed.get("admitted_runtime_enabled") is True, claimed
    assert claimed.get("full_runtime_enabled") is True, claimed
    assert claimed.get("full_runtime_apply_enabled") is True, claimed
else:
    assert full.get("enabled") is False, full
    assert full.get("apply_enabled") is False, full
    assert claimed.get("claimed_runtime_enabled") is False, claimed
    assert claimed.get("admitted_runtime_enabled") is False, claimed
    assert claimed.get("full_runtime_enabled") is False, claimed
    assert claimed.get("full_runtime_apply_enabled") is False, claimed
PY
    then
      ok=1
      break
    fi
    sleep 0.5
  done

  test "$ok" -eq 1 || return 1
  return 0
}

rollback(){
  local original_rc=$?
  trap - EXIT INT TERM HUP

  if [ "$SUCCESS" = "1" ] || [ "$CHANGED" = "0" ]; then
    [ -n "$TMP" ] && rm -rf -- "$TMP"
    exit "$original_rc"
  fi

  set +e
  say "${MARKER}_ROLLBACK_BEGIN"
  local rollback_ok=1

  if [ -n "$ROLLBACK_PATH" ] &&
     [ -n "$EXPECTED_ROLLBACK_SHA256" ] &&
     [ -f "$ROLLBACK_PATH" ]; then
    atomic_install "$ROLLBACK_PATH" "$ACTIVE_DROPIN" "$EXPECTED_ROLLBACK_SHA256" ||
      rollback_ok=0
  else
    rollback_ok=0
  fi

  systemctl --user daemon-reload || rollback_ok=0
  configured_gate_check dormant || rollback_ok=0
  systemctl --user restart "$UNIT" || rollback_ok=0
  wait_for_private_runtime dormant || rollback_ok=0

  if [ "$rollback_ok" -eq 1 ]; then
    say "rollback_state=dormant_staged_rollback_active"
    say "rollback_dropin=$ACTIVE_DROPIN"
    say "${MARKER}_ROLLBACK_GREEN"
  else
    say "${MARKER}_ROLLBACK_INCOMPLETE_MANUAL_INTERVENTION_REQUIRED" >&2
  fi

  [ -n "$TMP" ] && rm -rf -- "$TMP"
  exit "$original_rc"
}
trap rollback EXIT INT TERM HUP

case "$APPLY" in
  0|1) ;;
  *) hold "APPLY_must_be_0_or_1" ;;
esac

for cmd in awk bash curl git grep hostname mkdir mktemp node python3 readlink seq sha256sum sleep stat systemctl timeout; do
  need "$cmd"
done
test -x "$GIT_BIN" || hold "reviewed_git_executable_missing"
test -x "$BASH_BIN" || hold "reviewed_bash_executable_missing"
test -x "$PYTHON_BIN" || hold "reviewed_python_executable_missing"

unset BASH_ENV ENV NODE_OPTIONS NODE_PATH NPM_CONFIG_PREFIX npm_config_prefix
unset LD_PRELOAD LD_LIBRARY_PATH
unset DYLD_INSERT_LIBRARIES DYLD_LIBRARY_PATH

say "$MARKER"
say "apply_requested=$APPLY"
say "fresh_preflight_required=true"
say "staged_live_and_rollback_required=true"
say "active_dropin_write=$([ "$APPLY" = "1" ] && echo true || echo false)"
say "daemon_reload=$([ "$APPLY" = "1" ] && echo true || echo false)"
say "single_controlled_restart=$([ "$APPLY" = "1" ] && echo true || echo false)"
say "automatic_rollback_on_failure=true"
say "public_buy_request_intake_activation=false"
say "transaction_command_invocation=false"
say "transaction_signing=false"
say "transaction_broadcast=false"
say "funds_movement=false"

test "$(hostname)" = "$EXPECTED_HOST" || hold "designated_host_mismatch"
test "$ROOT" = "/home/zoso/dev/void-node" || hold "live_repo_root_mismatch"
test -d "$ROOT/.git" || hold "live_repo_missing"
test "$(readlink -f "$ROOT")" = "$ROOT" || hold "live_repo_root_alias_forbidden"
test -f "$STAGE_WRAPPER" || hold "stage_wrapper_missing"
test ! -L "$STAGE_WRAPPER" || hold "stage_wrapper_symlink_forbidden"

cd "$ROOT"
test "$(safe_git branch --show-current)" = "main" || hold "live_repo_not_main"
test -z "$(safe_git status --porcelain=v1 --untracked-files=all)" || hold "live_repo_dirty"
test "$(safe_git config --local --no-includes --get remote.origin.url)" = "$CANONICAL_REMOTE_URL" ||
  hold "canonical_remote_url_mismatch"

head="$(safe_git rev-parse HEAD)"
tree="$(safe_git rev-parse 'HEAD^{tree}')"
remote_main="$(
  safe_git_timeout ls-remote --heads "$CANONICAL_REMOTE_URL" refs/heads/main |
    awk 'NR==1 {print $1}'
)"
[[ "$head" =~ ^[0-9a-f]{40}$ ]] || hold "live_repo_head_invalid"
[[ "$tree" =~ ^[0-9a-f]{40}$ ]] || hold "live_repo_tree_invalid"
[[ "$remote_main" =~ ^[0-9a-f]{40}$ ]] || hold "remote_main_identity_unavailable"
test "$head" = "$remote_main" ||
  hold "live_repo_head_not_remote_main:local=$head:remote=$remote_main"

stage_wrapper_blob="$(safe_git rev-parse "HEAD:$STAGE_WRAPPER_REL")"
test "$(safe_git hash-object "$STAGE_WRAPPER")" = "$stage_wrapper_blob" ||
  hold "stage_wrapper_not_current_head_bytes"

test "$(systemctl --user is-active "$UNIT")" = "active" ||
  hold "void_node_service_not_active"
pid_before="$(systemctl --user show "$UNIT" -p MainPID --value)"
inv_before="$(systemctl --user show "$UNIT" -p InvocationID --value)"
[[ "$pid_before" =~ ^[1-9][0-9]*$ ]] || hold "void_node_main_pid_invalid"
test -n "$inv_before" || hold "void_node_invocation_id_invalid"

test ! -e "$ACTIVE_DROPIN" && test ! -L "$ACTIVE_DROPIN" ||
  hold "active_atomic_dropin_already_exists"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/void-buy-void-activation-apply.XXXXXX")"
chmod 700 "$TMP"
stage_log="$TMP/stage.log"

say "=== FRESH PREFLIGHT + INACTIVE STAGING ==="
set +e
(
  unset BASH_ENV ENV NODE_OPTIONS NODE_PATH NPM_CONFIG_PREFIX npm_config_prefix
  unset LD_PRELOAD LD_LIBRARY_PATH
  unset DYLD_INSERT_LIBRARIES DYLD_LIBRARY_PATH
  export PATH=/usr/bin:/bin LANG=C LC_ALL=C
  exec "$BASH_BIN" --noprofile --norc "$STAGE_WRAPPER"
) | tee "$stage_log"
stage_rc="${PIPESTATUS[0]}"
set -e
test "$stage_rc" -eq 0 || hold "fresh_stage_wrapper_not_green"

grep -qx 'fresh_atomic_preflight_green=true' "$stage_log" ||
  hold "fresh_preflight_evidence_missing"
grep -qx 'stage_binds_exact_fresh_preflight_log=true' "$stage_log" ||
  hold "stage_preflight_binding_missing"
grep -qx 'wrapper_fresh_preflight_execution_proven=true' "$stage_log" ||
  hold "wrapper_fresh_preflight_proof_missing"
grep -qx 'stage_manifest_preflight_authority=false' "$stage_log" ||
  hold "stage_manifest_authority_boundary_missing"
grep -qx 'VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_WRAPPER_V1_GREEN' "$stage_log" ||
  hold "stage_wrapper_green_marker_missing"

staging_directory="$(
  awk -F= '$1=="staging_directory" {value=$2} END {print value}' "$stage_log"
)"
preflight_log_sha256="$(
  awk -F= '$1=="preflight_log_sha256" {value=$2} END {print value}' "$stage_log"
)"
test -n "$staging_directory" || hold "staging_directory_missing"
[[ "$preflight_log_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "preflight_log_sha256_missing"

manifest="$staging_directory/manifest.json"
live_path="$staging_directory/live/$DROPIN_BASENAME"
ROLLBACK_PATH="$staging_directory/rollback/$DROPIN_BASENAME"

test -f "$manifest" && test ! -L "$manifest" || hold "stage_manifest_invalid"
test -f "$live_path" && test ! -L "$live_path" || hold "staged_live_dropin_invalid"
test -f "$ROLLBACK_PATH" && test ! -L "$ROLLBACK_PATH" || hold "staged_rollback_dropin_invalid"

manifest_values="$(
  "$PYTHON_BIN" - \
    "$manifest" \
    "$live_path" \
    "$ROLLBACK_PATH" \
    "$staging_directory" \
    "$head" \
    "$tree" \
    "$preflight_log_sha256" <<'PY'
import hashlib, json, os, stat, sys

manifest_path, live_path, rollback_path, stage_dir, head, tree, preflight_sha = sys.argv[1:]
uid = os.getuid()

def fail(message):
    raise SystemExit(message)

def direct_private_dir(path, label):
    st = os.lstat(path)
    if stat.S_ISLNK(st.st_mode) or not stat.S_ISDIR(st.st_mode):
        fail(label + "_not_direct_directory")
    if st.st_uid != uid or stat.S_IMODE(st.st_mode) != 0o700:
        fail(label + "_custody_invalid")
    if os.path.realpath(path) != path:
        fail(label + "_alias_forbidden")

def private_file(path, label):
    st = os.lstat(path)
    if stat.S_ISLNK(st.st_mode) or not stat.S_ISREG(st.st_mode):
        fail(label + "_not_direct_regular")
    if st.st_uid != uid or stat.S_IMODE(st.st_mode) != 0o600 or st.st_nlink != 1:
        fail(label + "_custody_invalid")
    return open(path, "rb").read()

for path, label in (
    (stage_dir, "stage_dir"),
    (os.path.join(stage_dir, "live"), "stage_live_dir"),
    (os.path.join(stage_dir, "rollback"), "stage_rollback_dir"),
):
    direct_private_dir(path, label)

manifest_bytes = private_file(manifest_path, "stage_manifest")
live_bytes = private_file(live_path, "stage_live")
rollback_bytes = private_file(rollback_path, "stage_rollback")
m = json.loads(manifest_bytes.decode("utf-8"))

if m.get("marker") != "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1":
    fail("stage_manifest_marker_mismatch")
if m.get("version") != 1 or m.get("status") != "STAGED_BYTES_ONLY_NOT_PREFLIGHT_AUTHORITY":
    fail("stage_manifest_status_mismatch")

p = m.get("preflight") or {}
if p.get("supplied_log_sha256") != preflight_sha:
    fail("stage_manifest_preflight_sha_mismatch")
if p.get("fresh_execution_proven") is not False or p.get("manifest_is_preflight_authority") is not False:
    fail("stage_manifest_preflight_authority_mismatch")
if p.get("status") != "ATOMIC_ACTIVATION_PREFLIGHT_GREEN_NOT_AUTHORIZED":
    fail("stage_manifest_preflight_status_mismatch")
if p.get("repository_head_sha") != head or p.get("remote_main_sha") != head:
    fail("stage_manifest_head_mismatch")
if p.get("repository_tree_sha") != tree:
    fail("stage_manifest_tree_mismatch")

authority = m.get("authority") or {}
for key in (
    "active_dropin_write",
    "daemon_reload",
    "service_stop",
    "service_start",
    "service_restart",
    "runtime_gate_mutation",
    "wallet_or_signer_access",
    "transaction_construction",
    "transaction_signing",
    "transaction_broadcast",
    "public_activation",
    "funds_movement",
):
    if authority.get(key) is not False:
        fail("stage_manifest_authority_mismatch:" + key)

files = m.get("files") or {}
live = files.get("live") or {}
rollback = files.get("rollback") or {}
expected_rel = "live/96-buy-void-payment-keyed-postgres-atomic-activation-v1.conf"
expected_rb_rel = "rollback/96-buy-void-payment-keyed-postgres-atomic-activation-v1.conf"
if live.get("relative_path") != expected_rel or rollback.get("relative_path") != expected_rb_rel:
    fail("stage_manifest_relative_path_mismatch")

live_sha = hashlib.sha256(live_bytes).hexdigest()
rollback_sha = hashlib.sha256(rollback_bytes).hexdigest()
if live.get("sha256") != live_sha or p.get("live_dropin_sha256") != live_sha:
    fail("stage_live_sha256_mismatch")
if rollback.get("sha256") != rollback_sha or p.get("dormant_dropin_sha256") != rollback_sha:
    fail("stage_rollback_sha256_mismatch")

for name, value in (
    ("live_configuration_sha256", p.get("live_configuration_sha256")),
    ("live_configuration_generation_id", p.get("live_configuration_generation_id")),
    ("dormant_configuration_sha256", p.get("dormant_configuration_sha256")),
    ("dormant_configuration_generation_id", p.get("dormant_configuration_generation_id")),
):
    if not isinstance(value, str) or len(value) != 64 or any(c not in "0123456789abcdef" for c in value):
        fail(name + "_invalid")

print("live_configuration_sha256=" + p["live_configuration_sha256"])
print("live_configuration_generation_id=" + p["live_configuration_generation_id"])
print("live_dropin_sha256=" + live_sha)
print("dormant_configuration_sha256=" + p["dormant_configuration_sha256"])
print("dormant_configuration_generation_id=" + p["dormant_configuration_generation_id"])
print("rollback_dropin_sha256=" + rollback_sha)
PY
)"

printf '%s\n' "$manifest_values"
live_configuration_sha256="$(
  printf '%s\n' "$manifest_values" |
    awk -F= '$1=="live_configuration_sha256" {print $2}'
)"
live_dropin_sha256="$(
  printf '%s\n' "$manifest_values" |
    awk -F= '$1=="live_dropin_sha256" {print $2}'
)"
EXPECTED_ROLLBACK_SHA256="$(
  printf '%s\n' "$manifest_values" |
    awk -F= '$1=="rollback_dropin_sha256" {print $2}'
)"

expected_confirmation="activate-buy-void-precision-atomic-v1:${live_configuration_sha256}:${live_dropin_sha256}"

test "$(safe_git rev-parse HEAD)" = "$head" || hold "repository_head_changed_after_stage"
test "$(safe_git rev-parse 'HEAD^{tree}')" = "$tree" || hold "repository_tree_changed_after_stage"
test -z "$(safe_git status --porcelain=v1 --untracked-files=all)" ||
  hold "repository_dirty_after_stage"
test ! -e "$ACTIVE_DROPIN" && test ! -L "$ACTIVE_DROPIN" ||
  hold "active_atomic_dropin_appeared_during_stage"
test "$(systemctl --user show "$UNIT" -p MainPID --value)" = "$pid_before" ||
  hold "service_pid_changed_during_stage"
test "$(systemctl --user show "$UNIT" -p InvocationID --value)" = "$inv_before" ||
  hold "service_invocation_changed_during_stage"

say "fresh_preflight_and_stage_green=true"
say "activation_confirmation=$expected_confirmation"

if [ "$APPLY" = "0" ]; then
  say "status=PLAN_GREEN_NO_MUTATION"
  say "public_intake_activation=false"
  say "canary_required_after_activation=true"
  SUCCESS=1
  rm -rf -- "$TMP"
  TMP=""
  trap - EXIT INT TERM HUP
  say "${MARKER}_PLAN_GREEN"
  exit 0
fi

test "$CONFIRM" = "$expected_confirmation" ||
  hold "exact_activation_confirmation_required"

ensure_private_direct_dir "$HOME/.local/state" "local_state_dir"
ensure_private_direct_dir "$HOME/.local/state/void" "void_state_dir"
EVIDENCE_DIR="$HOME/.local/state/void/buy-void-atomic-activation-apply-v1"
ensure_private_direct_dir "$EVIDENCE_DIR" "activation_evidence_root"
evidence_leaf="$EVIDENCE_DIR/${live_configuration_sha256}"
test ! -e "$evidence_leaf" && test ! -L "$evidence_leaf" ||
  hold "activation_evidence_generation_already_exists"
mkdir -m 700 "$evidence_leaf"
EVIDENCE_DIR="$evidence_leaf"

systemctl --user cat "$UNIT" >"$EVIDENCE_DIR/void-node-live.before.txt"
systemctl --user show "$UNIT" -p Environment --value >"$EVIDENCE_DIR/environment.before.txt"
curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 \
  http://127.0.0.1:4100/health >"$EVIDENCE_DIR/health.before.json"
curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 \
  http://127.0.0.1:4100/__void/ready.json >"$EVIDENCE_DIR/ready.before.json"
curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 \
  http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/status \
  >"$EVIDENCE_DIR/buy-runtime.before.json"

mkdir -p "$DROPIN_DIR"
test ! -L "$DROPIN_DIR" || hold "active_dropin_dir_symlink_forbidden"
test "$(readlink -f "$DROPIN_DIR")" = "$DROPIN_DIR" ||
  hold "active_dropin_dir_alias_forbidden"
test "$(stat -c '%u' "$DROPIN_DIR")" = "$(id -u)" ||
  hold "active_dropin_dir_owner_mismatch"

atomic_install "$live_path" "$ACTIVE_DROPIN" "$live_dropin_sha256"
CHANGED=1
say "live_dropin_installed=true"

systemctl --user daemon-reload
configured_gate_check live

systemctl --user restart "$UNIT"

pid_after="$(systemctl --user show "$UNIT" -p MainPID --value)"
inv_after="$(systemctl --user show "$UNIT" -p InvocationID --value)"
[[ "$pid_after" =~ ^[1-9][0-9]*$ ]] || hold "post_restart_main_pid_invalid"
test -n "$inv_after" || hold "post_restart_invocation_id_invalid"
test "$inv_after" != "$inv_before" || hold "service_invocation_did_not_change"

wait_for_private_runtime live || hold "private_money_capable_runtime_not_ready"

configured_gate_check live

test "$(sha256sum "$ACTIVE_DROPIN" | awk '{print $1}')" = "$live_dropin_sha256" ||
  hold "active_live_dropin_sha256_drift"

systemctl --user cat "$UNIT" >"$EVIDENCE_DIR/void-node-live.after.txt"
systemctl --user show "$UNIT" -p Environment --value >"$EVIDENCE_DIR/environment.after.txt"
curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 \
  http://127.0.0.1:4100/health >"$EVIDENCE_DIR/health.after.json"
curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 \
  http://127.0.0.1:4100/__void/ready.json >"$EVIDENCE_DIR/ready.after.json"
curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 \
  http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/status \
  >"$EVIDENCE_DIR/buy-runtime.after.json"
printf '%s\n' "$head" >"$EVIDENCE_DIR/repository-head.txt"
printf '%s\n' "$tree" >"$EVIDENCE_DIR/repository-tree.txt"
printf '%s\n' "$live_configuration_sha256" >"$EVIDENCE_DIR/live-configuration-sha256.txt"
printf '%s\n' "$live_dropin_sha256" >"$EVIDENCE_DIR/live-dropin-sha256.txt"
printf '%s\n' "$EXPECTED_ROLLBACK_SHA256" >"$EVIDENCE_DIR/rollback-dropin-sha256.txt"

SUCCESS=1
CHANGED=0
rm -rf -- "$TMP"
TMP=""
trap - EXIT INT TERM HUP

say "status=PRIVATE_BUY_VOID_RUNTIME_ACTIVATION_GREEN_PUBLIC_INTAKE_HOLD"
say "repository_head_sha=$head"
say "repository_tree_sha=$tree"
say "active_dropin=$ACTIVE_DROPIN"
say "live_configuration_sha256=$live_configuration_sha256"
say "live_dropin_sha256=$live_dropin_sha256"
say "rollback_dropin_sha256=$EXPECTED_ROLLBACK_SHA256"
say "evidence_dir=$EVIDENCE_DIR"
say "private_money_capable_runtime_enabled=true"
say "public_buy_request_intake_enabled=false"
say "public_presale_activation=false"
say "wc_void_public_activation=false"
say "canary_required=true"
say "transaction_invoked=false"
say "transaction_signing=false"
say "transaction_broadcast=false"
say "funds_movement=false"
say "${MARKER}_GREEN"
