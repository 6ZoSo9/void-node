#!/usr/bin/env bash
set -Eeuo pipefail
set +H

MARKER="VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_WRAPPER_V1"
repo="${VOID_LIVE_REPO_ROOT:-$HOME/dev/void-node}"
unit="void-node-live.service"
active_dropin_dir="$HOME/.config/systemd/user/void-node-live.service.d"
stage_root="$HOME/.config/void/buy-void-atomic-activation-staging-v1"

preflight_wrapper_rel="ops/precision/void_precision_buy_void_atomic_activation_preflight_v1.sh"
preflight_tool_rel="tools/void-buy-void-precision-atomic-activation-preflight-v1.mjs"
stage_wrapper_rel="ops/precision/void_precision_buy_void_atomic_activation_stage_v1.sh"
stage_tool_rel="tools/void-buy-void-precision-atomic-activation-stage-v1.mjs"
git_bin="/usr/bin/git"
bash_bin="/usr/bin/bash"
node_bin="/usr/bin/node"

say(){ printf '%s\n' "$*"; }
hold(){ say "${MARKER}_HOLD reason=$*" >&2; exit 2; }

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
    "$git_bin" --no-replace-objects -C "$repo" \
      -c core.fsmonitor=false \
      -c core.hooksPath=/dev/null \
      -c core.attributesFile=/dev/null \
      -c core.untrackedCache=false \
      -c core.preloadIndex=false \
      -c submodule.recurse=false \
      "$@"
}

unset BASH_ENV ENV
unset NODE_OPTIONS NODE_PATH NPM_CONFIG_PREFIX npm_config_prefix
unset LD_PRELOAD LD_LIBRARY_PATH
unset DYLD_INSERT_LIBRARIES DYLD_LIBRARY_PATH

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
    mkdir -m 700 -- "$dir" || hold "${label}_create_failed"
  fi

  test "$(stat -c '%u' "$dir")" = "$(id -u)" ||
    hold "${label}_owner_mismatch"
  chmod 700 "$dir"
  test "$(stat -c '%a' "$dir")" = "700" ||
    hold "${label}_mode_mismatch"
}

say "$MARKER"
say "inactive_staging_only=true"
say "preflight_requalification=true"
say "active_dropin_write=false"
say "daemon_reload=false"
say "service_stop=false"
say "service_start=false"
say "service_restart=false"
say "runtime_gate_mutation=false"
say "transaction_broadcast=false"
say "funds_movement=false"

test "$(hostname)" = "zoso-Precision-Tower-7810" ||
  hold "designated_host_mismatch"
test "$repo" = "/home/zoso/dev/void-node" ||
  hold "live_repo_root_mismatch"
test -d "$repo/.git" || hold "live_repo_missing"
test -x "$git_bin" || hold "reviewed_git_executable_missing"
test -x "$bash_bin" || hold "reviewed_bash_executable_missing"
test -x "$node_bin" || hold "reviewed_node_executable_missing"
cd "$repo"

test "$(safe_git branch --show-current)" = "main" ||
  hold "live_repo_not_main"
test -z "$(safe_git status --porcelain=v1 --untracked-files=all)" ||
  hold "live_repo_dirty"
head="$(safe_git rev-parse HEAD)"
tree="$(safe_git rev-parse 'HEAD^{tree}')"
[[ "$head" =~ ^[0-9a-f]{40}$ ]] || hold "live_repo_head_invalid"
[[ "$tree" =~ ^[0-9a-f]{40}$ ]] || hold "live_repo_tree_invalid"
test "$(safe_git config --local --no-includes --get remote.origin.url)" = \
  "https://github.com/6ZoSo9/void-node.git" ||
  hold "canonical_remote_url_mismatch"

declare -A source_blob=()
for rel in \
  "$preflight_wrapper_rel" \
  "$preflight_tool_rel" \
  "$stage_wrapper_rel" \
  "$stage_tool_rel"
do
  test -f "$repo/$rel" || hold "source_file_missing:$rel"
  head_blob="$(safe_git rev-parse "$head:$rel")"
  actual_blob="$(safe_git hash-object "$repo/$rel")"
  test "$head_blob" = "$actual_blob" ||
    hold "source_file_not_current_head_bytes:$rel"
  source_blob["$rel"]="$head_blob"
done
say "source_bytes_green=true"
say "source_head_sha=$head"
say "source_tree_sha=$tree"

test "$(systemctl --user is-active "$unit")" = "active" ||
  hold "void_node_service_not_active"
pid_before="$(systemctl --user show "$unit" -p MainPID --value)"
inv_before="$(systemctl --user show "$unit" -p InvocationID --value)"
[[ "$pid_before" =~ ^[1-9][0-9]*$ ]] ||
  hold "void_node_main_pid_invalid"
test -n "$inv_before" || hold "void_node_invocation_invalid"

tmp="$(mktemp -d "${TMPDIR:-/tmp}/void-buy-void-stage.XXXXXX")"
cleanup(){ rm -rf "$tmp"; }
trap cleanup EXIT INT TERM
preflight_log="$tmp/preflight.log"
stage_log="$tmp/stage.log"

say "=== FRESH ATOMIC PREFLIGHT ==="
set +e
(
  unset BASH_ENV ENV NODE_OPTIONS NODE_PATH NPM_CONFIG_PREFIX npm_config_prefix
  unset LD_PRELOAD LD_LIBRARY_PATH
  unset DYLD_INSERT_LIBRARIES DYLD_LIBRARY_PATH
  export PATH=/usr/bin:/bin LANG=C LC_ALL=C
  exec "$bash_bin" --noprofile --norc \
    "$repo/$preflight_wrapper_rel" "$repo/$preflight_tool_rel"
) | tee "$preflight_log"
preflight_rc="${PIPESTATUS[0]}"
set -e
test "$preflight_rc" -eq 0 ||
  hold "fresh_atomic_preflight_not_green"
chmod 600 "$preflight_log" ||
  hold "preflight_log_private_mode_failed"
test "$(stat -c '%u' "$preflight_log")" = "$(id -u)" ||
  hold "preflight_log_owner_mismatch"
test "$(stat -c '%a' "$preflight_log")" = "600" ||
  hold "preflight_log_mode_mismatch"
captured_preflight_log_sha256="$(
  sha256sum "$preflight_log" | awk '{print $1}'
)"
[[ "$captured_preflight_log_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "captured_preflight_log_sha256_invalid"
say "fresh_atomic_preflight_green=true"
say "preflight_log_private_custody=true"
say "preflight_log_digest_captured_before_staging=true"

live_configuration_sha256="$(
  awk -F= '
    $1=="live_configuration_sha256" { value=$2 }
    END { print value }
  ' "$preflight_log"
)"
live_dropin_sha256="$(
  awk -F= '
    $1=="live_dropin_sha256" { value=$2 }
    END { print value }
  ' "$preflight_log"
)"
dormant_dropin_sha256="$(
  awk -F= '
    $1=="dormant_dropin_sha256" { value=$2 }
    END { print value }
  ' "$preflight_log"
)"
preflight_repository_head_sha="$(
  awk -F= '
    $1=="repository_head_sha" { value=$2 }
    END { print value }
  ' "$preflight_log"
)"
preflight_repository_tree_sha="$(
  awk -F= '
    $1=="repository_tree_sha" { value=$2 }
    END { print value }
  ' "$preflight_log"
)"
preflight_wrapper_git_blob_sha1="$(
  awk -F= '
    $1=="preflight_wrapper_git_blob_sha1" { value=$2 }
    END { print value }
  ' "$preflight_log"
)"
preflight_tool_git_blob_sha1="$(
  awk -F= '
    $1=="preflight_tool_git_blob_sha1" { value=$2 }
    END { print value }
  ' "$preflight_log"
)"
[[ "$live_configuration_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "live_configuration_sha256_missing"
[[ "$live_dropin_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "live_dropin_sha256_missing"
[[ "$dormant_dropin_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "dormant_dropin_sha256_missing"
[[ "$preflight_repository_head_sha" =~ ^[0-9a-f]{40}$ ]] ||
  hold "preflight_repository_head_sha_missing"
[[ "$preflight_repository_tree_sha" =~ ^[0-9a-f]{40}$ ]] ||
  hold "preflight_repository_tree_sha_missing"
[[ "$preflight_wrapper_git_blob_sha1" =~ ^[0-9a-f]{40}$ ]] ||
  hold "preflight_wrapper_git_blob_sha1_missing"
[[ "$preflight_tool_git_blob_sha1" =~ ^[0-9a-f]{40}$ ]] ||
  hold "preflight_tool_git_blob_sha1_missing"
test "$preflight_repository_head_sha" = "$head" ||
  hold "preflight_repository_head_mismatch"
test "$preflight_repository_tree_sha" = "$tree" ||
  hold "preflight_repository_tree_mismatch"
test "$preflight_wrapper_git_blob_sha1" = "${source_blob[$preflight_wrapper_rel]}" ||
  hold "preflight_wrapper_blob_mismatch"
test "$preflight_tool_git_blob_sha1" = "${source_blob[$preflight_tool_rel]}" ||
  hold "preflight_tool_blob_mismatch"

test "$(safe_git rev-parse HEAD)" = "$head" ||
  hold "repository_head_changed_after_preflight"
test "$(safe_git rev-parse 'HEAD^{tree}')" = "$tree" ||
  hold "repository_tree_changed_after_preflight"
test -z "$(safe_git status --porcelain=v1 --untracked-files=all)" ||
  hold "live_repo_dirty_after_preflight"
test "$(safe_git hash-object "$repo/$preflight_wrapper_rel")" = \
  "${source_blob[$preflight_wrapper_rel]}" ||
  hold "preflight_wrapper_changed_after_preflight"
test "$(safe_git hash-object "$repo/$stage_wrapper_rel")" = \
  "${source_blob[$stage_wrapper_rel]}" ||
  hold "stage_wrapper_changed_after_preflight"

reviewed_runtime="$tmp/reviewed-stage-runtime"
mkdir -m 700 -- "$reviewed_runtime" ||
  hold "reviewed_stage_runtime_create_failed"
for rel in "$stage_tool_rel" "$preflight_tool_rel"; do
  base="$(basename "$rel")"
  target="$reviewed_runtime/$base"
  safe_git cat-file blob "$head:$rel" >"$target" ||
    hold "reviewed_stage_source_materialization_failed:$rel"
  chmod 400 "$target"
  actual_blob="$(safe_git hash-object "$target")"
  test "$actual_blob" = "${source_blob[$rel]}" ||
    hold "reviewed_stage_source_blob_mismatch:$rel"
done
chmod 500 "$reviewed_runtime"
reviewed_stage_tool="$reviewed_runtime/$(basename "$stage_tool_rel")"
reviewed_renderer="$reviewed_runtime/$(basename "$preflight_tool_rel")"
test "$(safe_git hash-object "$reviewed_renderer")" = "$preflight_tool_git_blob_sha1" ||
  hold "reviewed_renderer_preflight_blob_mismatch"
say "immutable_stage_source_materialized=true"
say "stage_tool_git_blob_sha1=${source_blob[$stage_tool_rel]}"
say "stage_renderer_git_blob_sha1=${source_blob[$preflight_tool_rel]}"

ensure_private_direct_dir "$HOME/.config/void" "void_config_dir"
ensure_private_direct_dir "$stage_root" "stage_root"

out_dir="$stage_root/$live_configuration_sha256"

say "=== MATERIALIZE INACTIVE LIVE + ROLLBACK STAGE ==="
set +e
(
  unset NODE_OPTIONS NODE_PATH NPM_CONFIG_PREFIX npm_config_prefix
  unset LD_PRELOAD LD_LIBRARY_PATH
  unset DYLD_INSERT_LIBRARIES DYLD_LIBRARY_PATH
  export PATH=/usr/bin:/bin LANG=C LC_ALL=C
  exec "$node_bin" "$reviewed_stage_tool" \
    --preflight-log "$preflight_log" \
    --out-dir "$out_dir" \
    --active-dropin-dir "$active_dropin_dir"
) | tee "$stage_log"
stage_rc="${PIPESTATUS[0]}"
set -e
test "$stage_rc" -eq 0 ||
  hold "inactive_stage_not_green"

observed_preflight_log_sha256="$(
  sha256sum "$preflight_log" | awk '{print $1}'
)"
staged_preflight_log_sha256="$(
  awk -F= '
    $1=="preflight_log_sha256" { value=$2 }
    END { print value }
  ' "$stage_log"
)"
[[ "$observed_preflight_log_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "observed_preflight_log_sha256_invalid"
[[ "$staged_preflight_log_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "staged_preflight_log_sha256_missing"
test "$observed_preflight_log_sha256" = "$captured_preflight_log_sha256" ||
  hold "preflight_log_changed_after_capture"
test "$staged_preflight_log_sha256" = "$captured_preflight_log_sha256" ||
  hold "staged_preflight_log_sha256_mismatch"
grep -qx 'fresh_preflight_execution_proven=false' "$stage_log" ||
  hold "stage_manifest_freshness_authority_mismatch"
grep -qx 'manifest_is_preflight_authority=false' "$stage_log" ||
  hold "stage_manifest_authority_mismatch"
say "stage_binds_exact_fresh_preflight_log=true"
say "stage_manifest_preflight_authority=false"
say "wrapper_fresh_preflight_execution_proven=true"

live_path="$(
  awk -F= '
    $1=="live_path" { value=$2 }
    END { print value }
  ' "$stage_log"
)"
rollback_path="$(
  awk -F= '
    $1=="rollback_path" { value=$2 }
    END { print value }
  ' "$stage_log"
)"
test "$live_path" =   "$out_dir/live/96-buy-void-payment-keyed-postgres-atomic-activation-v1.conf" ||
  hold "staged_live_path_mismatch"
test "$rollback_path" =   "$out_dir/rollback/96-buy-void-payment-keyed-postgres-atomic-activation-v1.conf" ||
  hold "staged_rollback_path_mismatch"
actual_live_dropin_sha256="$(sha256sum "$live_path" | awk '{print $1}')"
actual_dormant_dropin_sha256="$(sha256sum "$rollback_path" | awk '{print $1}')"
test "$actual_live_dropin_sha256" = "$live_dropin_sha256" ||
  hold "staged_live_dropin_sha256_mismatch"
test "$actual_dormant_dropin_sha256" = "$dormant_dropin_sha256" ||
  hold "staged_dormant_dropin_sha256_mismatch"
say "staged_live_dropin_sha256_verified=true"
say "staged_dormant_dropin_sha256_verified=true"

pid_after="$(systemctl --user show "$unit" -p MainPID --value)"
inv_after="$(systemctl --user show "$unit" -p InvocationID --value)"
test "$pid_after" = "$pid_before" ||
  hold "service_pid_changed_during_staging"
test "$inv_after" = "$inv_before" ||
  hold "service_invocation_changed_during_staging"

curl -fsS --max-time 5 http://127.0.0.1:4100/health |
python3 -c '
import json,sys
assert json.load(sys.stdin).get("ok") is True
' || hold "health_not_green"

curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json |
python3 -c '
import json,sys
x=json.load(sys.stdin)
assert x.get("ready") is True
assert x.get("gap") == 0
assert x.get("txroot_live") == 1
' || hold "readiness_not_green"

say "staging_directory=$out_dir"
say "preflight_log_sha256=$captured_preflight_log_sha256"
say "preflight_credential_read_inside_reviewed_factory=true"
say "wrapper_fresh_preflight_execution_proven=true"
say "stage_manifest_preflight_authority=false"
say "immutable_stage_source_execution=true"
say "stage_tool_git_blob_sha1=${source_blob[$stage_tool_rel]}"
say "stage_renderer_git_blob_sha1=${source_blob[$preflight_tool_rel]}"
say "database_mutation=false"
say "active_dropin_write=false"
say "daemon_reload=false"
say "service_restart=false"
say "runtime_gate_mutation=false"
say "transaction_broadcast=false"
say "funds_movement=false"
say "${MARKER}_GREEN"
