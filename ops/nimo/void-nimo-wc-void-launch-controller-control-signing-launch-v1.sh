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
challenge_size="$(/usr/bin/stat -c '%s' -- "$challenge")" ||
  hold "challenge_size_unavailable"
[[ "$challenge_size" =~ ^[0-9]+$ ]] ||
  hold "challenge_size_invalid"
(( challenge_size > 0 && challenge_size <= 2 * 1024 * 1024 )) ||
  hold "challenge_size_invalid"

if [[ "$mode" == "sign" ]]; then
  [[ "$output" == /* ]] || hold "signature_output_path_must_be_absolute"
  [[ ! -e "$output" ]] || hold "signature_output_must_not_exist"
  [[ -d "$(dirname -- "$output")" ]] ||
    hold "signature_output_parent_missing"
fi

source_head="$(
  /usr/bin/python3 -I -P - "$challenge" "$challenge_sha" <<'PY'
import hashlib
import json
import os
import re
import stat
import sys

path = sys.argv[1]
expected_sha = sys.argv[2]
max_bytes = 2 * 1024 * 1024
no_follow = getattr(os, "O_NOFOLLOW", 0)
close_on_exec = getattr(os, "O_CLOEXEC", 0)

fd = os.open(path, os.O_RDONLY | no_follow | close_on_exec)
try:
    before = os.fstat(fd)
    if (
        not stat.S_ISREG(before.st_mode)
        or before.st_size <= 0
        or before.st_size > max_bytes
    ):
        raise SystemExit(2)

    chunks = []
    total = 0
    while True:
        remaining = max_bytes + 1 - total
        if remaining <= 0:
            raise SystemExit(2)
        chunk = os.read(fd, min(65536, remaining))
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise SystemExit(2)
        chunks.append(chunk)

    after = os.fstat(fd)
    if (
        before.st_dev != after.st_dev
        or before.st_ino != after.st_ino
        or before.st_size != after.st_size
        or before.st_mtime_ns != after.st_mtime_ns
        or before.st_ctime_ns != after.st_ctime_ns
        or total != after.st_size
    ):
        raise SystemExit(2)
finally:
    os.close(fd)

data = b"".join(chunks)
if hashlib.sha256(data).hexdigest() != expected_sha:
    raise SystemExit(3)

try:
    text = data.decode("utf-8", errors="strict")
    value = json.loads(text)
except (UnicodeDecodeError, json.JSONDecodeError):
    raise SystemExit(2)

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
[[ "$expected_launcher_blob" =~ ^[0-9a-f]{40}$ ]] ||
  hold "reviewed_launcher_blob_invalid"

if [[ -n "${VOID_NIMO_OFFLINE_SIGNER_EXECUTED_LAUNCHER_BLOB_V1:-}" ]]; then
  actual_launcher_blob="$VOID_NIMO_OFFLINE_SIGNER_EXECUTED_LAUNCHER_BLOB_V1"
  [[ "$actual_launcher_blob" =~ ^[0-9a-f]{40}$ ]] ||
    hold "executed_launcher_blob_invalid"
else
  actual_launcher_blob="$("${git_env[@]}" "${git_cmd[@]}" hash-object -- "$launcher_file")" ||
    hold "executed_launcher_blob_unavailable"
fi

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

reviewed_signer_blob="$("${git_env[@]}" "${git_cmd[@]}" rev-parse "$reviewed_head:$signer_rel")" ||
  hold "reviewed_signer_blob_unavailable"
[[ "$reviewed_signer_blob" =~ ^[0-9a-f]{40}$ ]] ||
  hold "reviewed_signer_blob_invalid"

reviewed_signer_b64="$(
  "${git_env[@]}" "${git_cmd[@]}" cat-file blob "$reviewed_signer_blob" |
    /usr/bin/base64 -w0
)" || hold "reviewed_signer_transport_failed"

[[ -n "$reviewed_signer_b64" ]] ||
  hold "reviewed_signer_transport_empty"

actual_signer_blob="$(
  printf '%s' "$reviewed_signer_b64" |
    /usr/bin/base64 -d |
    "${git_env[@]}" "${git_cmd[@]}" hash-object --stdin
)" || hold "reviewed_signer_transport_hash_failed"

[[ "$actual_signer_blob" == "$reviewed_signer_blob" ]] ||
  hold "reviewed_signer_transport_hash_mismatch"

printf 'reviewed_signer_transport=verified_git_blob_stdin\n'
printf 'reviewed_signer_blob=%s\n' "$reviewed_signer_blob"
printf 'ethers_execution=in_memory_sha256_pinned_bundle\n'
printf 'mutable_worktree_signer_execution=false\n'
printf 'mutable_runtime_helper_execution=false\n'

set +e
printf '%s' "$reviewed_signer_b64" |
  /usr/bin/base64 -d |
  /usr/bin/env -i \
    HOME=/home/zoso \
    PATH=/usr/bin:/bin \
    LANG=C \
    LC_ALL=C \
    VOID_NIMO_OFFLINE_SIGNER_LAUNCH_V1=1 \
    VOID_NIMO_OFFLINE_SIGNER_REVIEWED_HEAD_V1="$reviewed_head" \
    VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1="$repo" \
    /usr/bin/node \
    --input-type=module \
    - \
    sign \
    --challenge "$challenge" \
    --challenge-sha256 "$challenge_sha" \
    --output "$output"
pipe_status=("${PIPESTATUS[@]}")
set -e

[[ "${pipe_status[0]:-1}" == "0" ]] ||
  hold "reviewed_signer_transport_write_failed"
[[ "${pipe_status[1]:-1}" == "0" ]] ||
  hold "reviewed_signer_transport_decode_failed"
exit "${pipe_status[2]:-2}"
