#!/bin/bash
set -Eeuo pipefail
umask 077

marker="VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_LAUNCH_V1"
mode="${1:-}"
challenge="${2:-}"
challenge_sha="${3:-}"
reviewed_head="${4:-}"
output="${5:-}"

repo="${VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1:-/home/zoso/dev/void-node}"
[[ "$repo" == /* ]] || {
  printf '%s_HOLD\n' "VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_LAUNCH_V1" >&2
  printf '%s\n' "repo_root_must_be_absolute" >&2
  exit 2
}
repo="$(cd -- "$repo" && pwd -P)"
launcher_rel="ops/nimo/void-nimo-wc-void-launch-controller-control-signing-launch-v1.sh"
signer_rel="ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs"
runtime_rel="tools/void-reviewed-node-package-runtime-v1.mjs"
launcher_file="${BASH_SOURCE[0]}"
[[ "$launcher_file" == /* ]] || launcher_file="$(pwd -P)/$launcher_file"

hold() {
  printf '%s_HOLD\n' "$marker" >&2
  printf '%s\n' "$1" >&2
  exit 2
}

[[ "$mode" == "preflight" || "$mode" == "sign" ]] ||
  hold "launcher_mode_invalid"
[[ "$challenge" == /* ]] || hold "challenge_path_must_be_absolute"
[[ "$challenge_sha" =~ ^[0-9a-f]{64}$ ]] ||
  hold "challenge_sha256_invalid"
[[ "$reviewed_head" =~ ^[0-9a-f]{40}$ ]] ||
  hold "operator_reviewed_head_invalid"
[[ -f "$challenge" && ! -L "$challenge" ]] ||
  hold "challenge_file_invalid"

if [[ "$mode" == "sign" ]]; then
  [[ "$output" == /* ]] || hold "signature_output_path_must_be_absolute"
  [[ ! -e "$output" ]] || hold "signature_output_must_not_exist"
  [[ -d "$(dirname -- "$output")" ]] ||
    hold "signature_output_parent_missing"
fi

actual_challenge_sha="$(/usr/bin/sha256sum -- "$challenge" | /usr/bin/awk '{print $1}')"
[[ "$actual_challenge_sha" == "$challenge_sha" ]] ||
  hold "challenge_sha256_mismatch"

source_head="$(
  /usr/bin/python3 - "$challenge" <<'PY'
import json
import re
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as handle:
    value = json.load(handle)

source = value.get("source_binding")
if not isinstance(source, dict):
    raise SystemExit(2)

head = source.get("source_head_sha")
if not isinstance(head, str) or re.fullmatch(r"[0-9a-f]{40}", head) is None:
    raise SystemExit(2)

print(head)
PY
)" || hold "challenge_source_head_invalid"

git_env=(
  env -i
  HOME=/nonexistent
  PATH=/usr/bin:/bin
  LANG=C
  LC_ALL=C
  GIT_CONFIG_NOSYSTEM=1
  GIT_CONFIG_GLOBAL=/dev/null
  GIT_OPTIONAL_LOCKS=0
  GIT_TERMINAL_PROMPT=0
)

git_cmd=(
  /usr/bin/git
  --no-replace-objects
  -c core.hooksPath=/dev/null
  -c core.attributesFile=/dev/null
  -c core.fsmonitor=false
  -c core.untrackedCache=false
  -c core.preloadIndex=false
  -c submodule.recurse=false
  -C "$repo"
)

expected_launcher_blob="$("${git_env[@]}" "${git_cmd[@]}" rev-parse "$reviewed_head:$launcher_rel")" ||
  hold "reviewed_launcher_blob_unavailable"
actual_launcher_blob="$("${git_env[@]}" "${git_cmd[@]}" hash-object -- "$launcher_file")" ||
  hold "executed_launcher_blob_unavailable"
[[ "$expected_launcher_blob" =~ ^[0-9a-f]{40}$ ]] ||
  hold "reviewed_launcher_blob_invalid"
[[ "$actual_launcher_blob" == "$expected_launcher_blob" ]] ||
  hold "executed_launcher_not_operator_reviewed_blob"

current_head="$("${git_env[@]}" "${git_cmd[@]}" rev-parse HEAD)" ||
  hold "current_head_unavailable"
[[ "$current_head" == "$reviewed_head" ]] ||
  hold "current_head_not_exact_operator_reviewed_head"
[[ "$source_head" == "$reviewed_head" ]] ||
  hold "challenge_source_head_not_operator_reviewed_head"

status="$("${git_env[@]}" "${git_cmd[@]}" status --porcelain=v1 --untracked-files=all)" ||
  hold "repository_status_unavailable"
[[ -z "$status" ]] || hold "repository_not_clean"

critical_paths=(
  "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-launch-v1.sh"
  "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs"
  "tools/void-reviewed-node-package-runtime-v1.mjs"
  "ops/security/reviewed-node-package-runtime-ethers-v1.json"
  "tools/void-wc-void-launch-controller-control-requalification-v1.mjs"
  "package.json"
  "package-lock.json"
)

for rel in "${critical_paths[@]}"; do
  file="$repo/$rel"
  [[ -f "$file" && ! -L "$file" ]] ||
    hold "critical_file_invalid:$rel"

  expected_blob="$("${git_env[@]}" "${git_cmd[@]}" rev-parse "$reviewed_head:$rel")" ||
    hold "critical_reviewed_blob_unavailable:$rel"
  actual_blob="$("${git_env[@]}" "${git_cmd[@]}" hash-object -- "$file")" ||
    hold "critical_worktree_blob_unavailable:$rel"

  [[ "$expected_blob" =~ ^[0-9a-f]{40}$ ]] ||
    hold "critical_head_blob_invalid:$rel"
  [[ "$actual_blob" == "$expected_blob" ]] ||
    hold "critical_worktree_blob_mismatch:$rel"
done

printf '%s\n' "$marker"
printf 'status=EXACT_REVIEWED_SIGNER_PREFLIGHT_GREEN\n'
printf 'operator_reviewed_head=%s\n' "$reviewed_head"
printf 'executed_launcher_blob=%s\n' "$actual_launcher_blob"
printf 'challenge_source_head=%s\n' "$source_head"
printf 'challenge_sha256=%s\n' "$challenge_sha"
printf 'repository_clean=true\n'
printf 'critical_source_blobs_verified=true\n'

if [[ "$mode" == "preflight" ]]; then
  printf 'private_key_access=false\n'
  printf 'credential_access=false\n'
  printf 'wallet_or_signer_access=false\n'
  printf 'transaction_signing=false\n'
  printf 'transaction_broadcast=false\n'
  printf 'funds_movement=false\n'
  exit 0
fi

printf 'status=EXACT_REVIEWED_SIGNER_SIGN_OPERATION_AUTHORIZED\n'
printf 'private_key_access=true\n'
printf 'credential_access=true\n'
printf 'wallet_or_signer_access=true\n'
printf 'transaction_signing=false\n'
printf 'transaction_broadcast=false\n'
printf 'funds_movement=false\n'

reviewed_runtime_root="$(/usr/bin/mktemp -d /tmp/void-nimo-reviewed-signer.XXXXXX)" ||
  hold "reviewed_signer_runtime_mkdir_failed"
/bin/chmod 700 "$reviewed_runtime_root" ||
  hold "reviewed_signer_runtime_chmod_failed"

cleanup_reviewed_runtime() {
  /bin/chmod -R u+rwX "$reviewed_runtime_root" >/dev/null 2>&1 || true
  /bin/rm -rf -- "$reviewed_runtime_root" >/dev/null 2>&1 || true
}
trap cleanup_reviewed_runtime EXIT HUP INT TERM

/bin/mkdir -p \
  "$reviewed_runtime_root/ops/nimo" \
  "$reviewed_runtime_root/tools" ||
  hold "reviewed_signer_runtime_layout_failed"

materialize_reviewed_blob() {
  rel="$1"
  destination="$reviewed_runtime_root/$rel"
  expected_blob="$("${git_env[@]}" "${git_cmd[@]}" rev-parse "$reviewed_head:$rel")" ||
    hold "reviewed_materialization_blob_unavailable:$rel"
  [[ "$expected_blob" =~ ^[0-9a-f]{40}$ ]] ||
    hold "reviewed_materialization_blob_invalid:$rel"
  "${git_env[@]}" "${git_cmd[@]}" cat-file blob "$expected_blob" > "$destination" ||
    hold "reviewed_materialization_failed:$rel"
  /bin/chmod 400 "$destination" ||
    hold "reviewed_materialization_chmod_failed:$rel"
  actual_blob="$("${git_env[@]}" "${git_cmd[@]}" hash-object -- "$destination")" ||
    hold "reviewed_materialization_hash_failed:$rel"
  [[ "$actual_blob" == "$expected_blob" ]] ||
    hold "reviewed_materialization_hash_mismatch:$rel"
}

materialize_reviewed_blob "$signer_rel"
materialize_reviewed_blob "$runtime_rel"

/bin/chmod 500 \
  "$reviewed_runtime_root" \
  "$reviewed_runtime_root/ops" \
  "$reviewed_runtime_root/ops/nimo" \
  "$reviewed_runtime_root/tools" ||
  hold "reviewed_signer_runtime_freeze_failed"

printf 'reviewed_signer_materialized=true\n'
printf 'reviewed_runtime_helper_materialized=true\n'
printf 'reviewed_signer_exec_path=%s\n' "$reviewed_runtime_root/$signer_rel"

set +e
/usr/bin/env -i \
  HOME=/home/zoso \
  PATH=/usr/bin:/bin \
  LANG=C \
  LC_ALL=C \
  VOID_NIMO_OFFLINE_SIGNER_LAUNCH_V1=1 \
  VOID_NIMO_OFFLINE_SIGNER_REVIEWED_HEAD_V1="$reviewed_head" \
  VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1="$repo" \
  /usr/bin/node \
  "$reviewed_runtime_root/$signer_rel" \
  sign \
  --challenge "$challenge" \
  --challenge-sha256 "$challenge_sha" \
  --output "$output"
status=$?
set -e
cleanup_reviewed_runtime
trap - EXIT HUP INT TERM
exit "$status"
