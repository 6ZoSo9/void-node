set -euo pipefail

MARKER="VOID_BUY_VOID_SOURCE_FINALITY_V7_PROTECTED_PRIVILEGED_LAUNCHER_V1"
NATIVE_PREENTRY_MARKER="VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1"
FIXED_SOURCE_ROOT="/opt/void-buy-void-v7-reviewed-v1"
GIT="/usr/bin/git"
NODE="/usr/bin/node"
SETPRIV="/usr/bin/setpriv"
ID="/usr/bin/id"
UNAME="/usr/bin/uname"
STAT="/usr/bin/stat"
ENV="/usr/bin/env"
GREP="/usr/bin/grep"
PACKAGE_RUNTIME_PROOF_REL="scripts/prove_void_buy_v7_privileged_launcher_package_runtime_v2.mjs"
PACKAGE_RUNTIME_PROOF_BLOB="ef37078e977cfdff9fc104f54b6e9fceb3d93a34"

hold() {
  printf '%s_HOLD reason=%s\n' "$MARKER" "$1" >&2
  exit 2
}

if [ "${VOID_BUY_VOID_V7_NATIVE_PREENTRY:-}" != "$NATIVE_PREENTRY_MARKER" ]; then
  hold native_preentry_required
fi
case "${BASH_SOURCE[0]}" in
  /proc/self/fd/[0-9]*) ;;
  *) hold native_preentry_descriptor_required ;;
esac

ROOT="$FIXED_SOURCE_ROOT"
if [ "$("$ID" -u)" != "0" ]; then hold root_required; fi
if [ "$("$UNAME" -s)" != "Linux" ]; then hold linux_required; fi

for binary in "$GIT" "$NODE" "$SETPRIV" "$ID" "$UNAME" "$STAT" "$ENV" "$GREP"; do
  test -x "$binary" || hold required_binary_missing
  test "$("$STAT" -Lc '%u' -- "$binary")" = "0" || hold required_binary_not_root_owned
  mode="$("$STAT" -Lc '%a' -- "$binary")"
  perm=$((8#$mode))
  if (( (perm & 0022) != 0 )); then hold required_binary_group_or_world_writable; fi
done

expected_commit=""
expected_tree=""
runtime_uid=""
runtime_gid=""
tool=""
qualify_only=false
declare -a tool_args=()

while (($#)); do
  case "$1" in
    --expected-commit)
      (($# >= 2)) || hold expected_commit_required
      expected_commit="$2"; shift 2 ;;
    --expected-tree)
      (($# >= 2)) || hold expected_tree_required
      expected_tree="$2"; shift 2 ;;
    --runtime-uid)
      (($# >= 2)) || hold runtime_uid_required
      runtime_uid="$2"; shift 2 ;;
    --runtime-gid)
      (($# >= 2)) || hold runtime_gid_required
      runtime_gid="$2"; shift 2 ;;
    --tool)
      (($# >= 2)) || hold tool_required
      tool="$2"; shift 2 ;;
    --qualify-only)
      qualify_only=true; shift ;;
    --)
      shift
      tool_args=("$@")
      break ;;
    *)
      hold unknown_launcher_argument ;;
  esac
done

[[ "$expected_commit" =~ ^[0-9a-f]{40}$ ]] || hold expected_commit_invalid
[[ "$expected_tree" =~ ^[0-9a-f]{40}$ ]] || hold expected_tree_invalid
[[ "$runtime_uid" =~ ^[1-9][0-9]*$ ]] || hold runtime_uid_invalid
[[ "$runtime_gid" =~ ^[1-9][0-9]*$ ]] || hold runtime_gid_invalid

git_reviewed() {
  "$ENV" -i     PATH=/usr/bin:/bin     HOME=/nonexistent     LANG=C LC_ALL=C TZ=UTC     GIT_CONFIG_NOSYSTEM=1     GIT_CONFIG_GLOBAL=/dev/null     GIT_CONFIG_SYSTEM=/dev/null     GIT_NO_REPLACE_OBJECTS=1     GIT_OPTIONAL_LOCKS=0     GIT_TERMINAL_PROMPT=0     GIT_ASKPASS=/bin/false     "$GIT" -c "safe.directory=$ROOT" -C "$ROOT" "$@"
}

head_before="$(git_reviewed rev-parse --verify 'HEAD^{commit}')" ||
  hold git_head_unavailable
tree_before="$(git_reviewed rev-parse --verify 'HEAD^{tree}')" ||
  hold git_tree_unavailable
branch_before="$(git_reviewed symbolic-ref --short -q HEAD)" ||
  hold source_branch_unavailable
status_before="$(git_reviewed status --porcelain=v1 --untracked-files=all)" ||
  hold source_status_unavailable

test "$head_before" = "$expected_commit" || hold expected_commit_mismatch
test "$tree_before" = "$expected_tree" || hold expected_tree_mismatch
test "$branch_before" = "main" || hold source_branch_not_main
test -z "$status_before" || hold source_tree_dirty

CUSTODY="$ROOT/runtime/canonical-producer-source-custody-v1.cjs"
test -f "$CUSTODY" || hold source_custody_checker_missing

set +e
custody_out="$(
  "$ENV" -i     PATH=/usr/bin:/bin     HOME=/nonexistent     LANG=C LC_ALL=C TZ=UTC     "$SETPRIV"       --reuid="$runtime_uid"       --regid="$runtime_gid"       --clear-groups       --no-new-privs       "$NODE" "$CUSTODY" "$ROOT" 2>&1
)"
custody_rc=$?
set -e
if [ "$custody_rc" -ne 0 ]; then
  printf '%s\n' "$custody_out" >&2
  hold protected_source_custody_failed
fi
printf '%s\n' "$custody_out" |
  "$GREP" -Eq '^VOID_CANONICAL_PRODUCER_SOURCE_CUSTODY_V1_GREEN source_nodes_checked=[0-9]+$' ||
  hold protected_source_custody_marker_missing

verify_reviewed_blob() {
  local relative="$1"
  local expected="$2"
  local absolute="$ROOT/$relative"
  test -f "$absolute" || hold reviewed_package_runtime_file_missing
  local tracked visible
  tracked="$(git_reviewed rev-parse --verify "HEAD:$relative")" ||
    hold reviewed_package_runtime_file_not_tracked
  visible="$(git_reviewed hash-object -- "$absolute")" ||
    hold reviewed_package_runtime_file_hash_unavailable
  test "$tracked" = "$expected" || hold reviewed_package_runtime_tracked_blob_mismatch
  test "$visible" = "$expected" || hold reviewed_package_runtime_visible_blob_mismatch
}

head_after="$(git_reviewed rev-parse --verify 'HEAD^{commit}')" ||
  hold git_head_recheck_unavailable
tree_after="$(git_reviewed rev-parse --verify 'HEAD^{tree}')" ||
  hold git_tree_recheck_unavailable
branch_after="$(git_reviewed symbolic-ref --short -q HEAD)" ||
  hold source_branch_recheck_unavailable
status_after="$(git_reviewed status --porcelain=v1 --untracked-files=all)" ||
  hold source_status_recheck_unavailable

test "$head_after" = "$head_before" || hold source_head_changed_during_qualification
test "$tree_after" = "$tree_before" || hold source_tree_changed_during_qualification
test "$branch_after" = "$branch_before" || hold source_branch_changed_during_qualification
test "$status_after" = "$status_before" || hold source_status_changed_during_qualification

verify_reviewed_blob "$PACKAGE_RUNTIME_PROOF_REL" "$PACKAGE_RUNTIME_PROOF_BLOB"

set +e
package_runtime_out="$(
  "$ENV" -i PATH=/usr/bin:/bin HOME=/nonexistent LANG=C LC_ALL=C TZ=UTC \
    GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null \
    GIT_NO_REPLACE_OBJECTS=1 GIT_OPTIONAL_LOCKS=0 GIT_TERMINAL_PROMPT=0 \
    "$NODE" "$ROOT/$PACKAGE_RUNTIME_PROOF_REL" --report 2>&1
)"
package_runtime_rc=$?
set -e
if [ "$package_runtime_rc" -ne 0 ]; then
  printf '%s\n' "$package_runtime_out" >&2
  hold privileged_launcher_package_runtime_verification_failed
fi
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'VOID_BUY_VOID_V7_PRIVILEGED_LAUNCHER_PACKAGE_RUNTIME_V2_GREEN' >/dev/null ||
  hold privileged_launcher_package_runtime_marker_missing
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'native_preentry_contract_verified=true' >/dev/null ||
  hold native_preentry_contract_not_verified
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'tsx_private_materialization_verified=true' >/dev/null ||
  hold privileged_launcher_tsx_materialization_not_verified
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'tsx_inert_transform_execution_verified=true' >/dev/null ||
  hold privileged_launcher_tsx_execution_not_verified
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'esbuild_runtime_execution_verified=true' >/dev/null ||
  hold privileged_launcher_esbuild_execution_not_verified
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'tsx_scratch_write_scope_private=true' >/dev/null ||
  hold privileged_launcher_tsx_scratch_scope_not_verified
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'tsx_scratch_outside_package_tree=true' >/dev/null ||
  hold privileged_launcher_tsx_scratch_boundary_not_verified
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'tsx_node_import_execution_verified=true' >/dev/null ||
  hold privileged_launcher_tsx_node_import_not_verified
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'tsx_cli_ipc_required=false' >/dev/null ||
  hold privileged_launcher_tsx_cli_ipc_boundary_not_verified
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'privileged_launcher_package_runtime_verified=true' >/dev/null ||
  hold privileged_launcher_package_runtime_not_verified
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'private_temporary_filesystem_write=true' >/dev/null ||
  hold privileged_launcher_temporary_write_truth_missing
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'persistent_host_mutation=false' >/dev/null ||
  hold privileged_launcher_persistent_mutation_truth_missing
printf '%s\n' "$package_runtime_out" |
  "$GREP" -Fx 'privileged_receipt_execution_authorized=false' >/dev/null ||
  hold privileged_launcher_package_runtime_authority_overclaim

printf '%s\n' "$MARKER"
printf 'source_root=%s\n' "$ROOT"
printf 'source_commit=%s\n' "$head_before"
printf 'source_tree=%s\n' "$tree_before"
printf 'source_branch=main\n'
printf 'runtime_uid=%s\n' "$runtime_uid"
printf 'runtime_gid=%s\n' "$runtime_gid"
printf 'root_owned_protected_source=true\n'
printf 'native_preentry_verified=true\n'
printf 'launcher_descriptor_execution=true\n'
printf 'source_custody_green=true\n'
printf 'package_runtime_proof_git_blob_sha1=%s\n' "$PACKAGE_RUNTIME_PROOF_BLOB"
printf 'tsx_private_materialization_verified=true\n'
printf 'tsx_inert_transform_execution_verified=true\n'
printf 'esbuild_runtime_execution_verified=true\n'
printf 'tsx_scratch_write_scope_private=true\n'
printf 'tsx_scratch_outside_package_tree=true\n'
printf 'tsx_node_import_execution_verified=true\n'
printf 'tsx_cli_ipc_required=false\n'
printf 'privileged_launcher_package_runtime_verified=true\n'
printf 'ambient_git_environment_inherited=false\n'
printf 'ambient_node_environment_inherited=false\n'
printf 'credential_access_by_launcher=false\n'
printf 'wallet_or_signer_access_by_launcher=false\n'
printf 'rpc_contact_by_launcher=false\n'
printf 'transaction_broadcast_by_launcher=false\n'
printf 'service_mutation_by_launcher=false\n'
printf 'presale_activation_by_launcher=false\n'
printf 'funds_movement_by_launcher=false\n'

if [ "$qualify_only" = true ]; then
  test -z "$tool" || hold qualify_only_tool_forbidden
  test "${#tool_args[@]}" = "0" || hold qualify_only_tool_args_forbidden
  printf 'tool_execution=false\n'
  printf 'private_temporary_filesystem_write=true\n'
  printf 'persistent_host_mutation=false\n'
  printf 'status=PROTECTED_PRIVILEGED_LAUNCHER_QUALIFICATION_GREEN\n'
  exit 0
fi

case "$tool" in
  deployment)
    tool_path="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts" ;;
  provider-pair)
    tool_path="ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts" ;;
  live-process-v2)
    tool_path="ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts" ;;
  *)
    hold tool_not_allowlisted ;;
esac

tool_absolute="$ROOT/$tool_path"
test -f "$tool_absolute" || hold reviewed_tool_missing
tracked_blob="$(git_reviewed rev-parse --verify "HEAD:$tool_path")" ||
  hold reviewed_tool_not_tracked
visible_blob="$(git_reviewed hash-object -- "$tool_absolute")" ||
  hold reviewed_tool_hash_unavailable
test "$tracked_blob" = "$visible_blob" || hold reviewed_tool_worktree_blob_mismatch

TSX_LOADER="$ROOT/node_modules/tsx/dist/loader.mjs"
TSX_TSCONFIG="$ROOT/tsconfig.json"
test -f "$TSX_LOADER" || hold protected_tsx_loader_missing
test -f "$TSX_TSCONFIG" || hold protected_tsconfig_missing

printf 'tool=%s\n' "$tool"
printf 'tool_path=%s\n' "$tool_path"
printf 'tool_git_blob_sha1=%s\n' "$tracked_blob"
printf 'tool_execution=true\n'
printf 'tsx_execution_mode=node_import_hook\n'

printf 'protected_dispatch_context_handoff=true\n'
exec "$ENV" -i \
  PATH=/usr/bin:/bin \
  HOME=/root \
  LANG=C LC_ALL=C TZ=UTC \
  VOID_BUY_VOID_V7_NATIVE_PREENTRY="$NATIVE_PREENTRY_MARKER" \
  VOID_BUY_VOID_V7_PROTECTED_DISPATCH=VOID_BUY_VOID_V7_PROTECTED_DISPATCH_V1 \
  VOID_BUY_VOID_V7_PROTECTED_DISPATCH_PID="$$" \
  VOID_BUY_VOID_V7_PROTECTED_SOURCE_ROOT="$ROOT" \
  VOID_BUY_VOID_V7_PROTECTED_SOURCE_COMMIT="$head_before" \
  VOID_BUY_VOID_V7_PROTECTED_SOURCE_TREE="$tree_before" \
  VOID_BUY_VOID_V7_PROTECTED_TOOL_PATH="$tool_path" \
  VOID_BUY_VOID_V7_PROTECTED_TOOL_GIT_BLOB_SHA1="$tracked_blob" \
  TSX_TSCONFIG_PATH="$TSX_TSCONFIG" \
  "$NODE" --import "file://$TSX_LOADER" "$tool_absolute" "${tool_args[@]}"
