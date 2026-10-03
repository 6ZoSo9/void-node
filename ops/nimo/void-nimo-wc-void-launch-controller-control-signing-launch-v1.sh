#!/bin/bash
set -Eeuo pipefail
umask 077

marker="VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_LAUNCH_V1"
mode="${1:-}"
challenge="${2:-}"
challenge_sha="${3:-}"
output="${4:-}"

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo="$(cd -- "$script_dir/../.." && pwd -P)"

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

current_head="$("${git_env[@]}" "${git_cmd[@]}" rev-parse HEAD)" ||
  hold "current_head_unavailable"
[[ "$current_head" == "$source_head" ]] ||
  hold "current_head_not_exact_challenge_head"

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

  expected_blob="$("${git_env[@]}" "${git_cmd[@]}" rev-parse "HEAD:$rel")" ||
    hold "critical_head_blob_unavailable:$rel"
  actual_blob="$("${git_env[@]}" "${git_cmd[@]}" hash-object -- "$file")" ||
    hold "critical_worktree_blob_unavailable:$rel"

  [[ "$expected_blob" =~ ^[0-9a-f]{40}$ ]] ||
    hold "critical_head_blob_invalid:$rel"
  [[ "$actual_blob" == "$expected_blob" ]] ||
    hold "critical_worktree_blob_mismatch:$rel"
done

printf '%s\n' "$marker"
printf 'status=EXACT_REVIEWED_SIGNER_PREFLIGHT_GREEN\n'
printf 'challenge_source_head=%s\n' "$source_head"
printf 'challenge_sha256=%s\n' "$challenge_sha"
printf 'repository_clean=true\n'
printf 'critical_source_blobs_verified=true\n'
printf 'private_key_access=false\n'
printf 'transaction_signing=false\n'
printf 'funds_movement=false\n'

if [[ "$mode" == "preflight" ]]; then
  exit 0
fi

exec /usr/bin/env -i \
  HOME=/home/zoso \
  PATH=/usr/bin:/bin \
  LANG=C \
  LC_ALL=C \
  VOID_NIMO_OFFLINE_SIGNER_LAUNCH_V1=1 \
  /usr/bin/node \
  "$repo/ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs" \
  sign \
  --challenge "$challenge" \
  --challenge-sha256 "$challenge_sha" \
  --output "$output"
