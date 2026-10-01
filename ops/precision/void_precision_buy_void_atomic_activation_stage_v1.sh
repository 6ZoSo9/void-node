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

say(){ printf '%s\n' "$*"; }
hold(){ say "${MARKER}_HOLD reason=$*" >&2; exit 2; }

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
    mkdir "$dir" || hold "${label}_create_failed"
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
cd "$repo"

test "$(git branch --show-current)" = "main" ||
  hold "live_repo_not_main"
test -z "$(git status --porcelain=v1 --untracked-files=all)" ||
  hold "live_repo_dirty"
test "$(git remote get-url origin)" =   "https://github.com/6ZoSo9/void-node.git" ||
  hold "canonical_remote_url_mismatch"

for rel in   "$preflight_wrapper_rel"   "$preflight_tool_rel"   "$stage_wrapper_rel"   "$stage_tool_rel"
do
  test -f "$repo/$rel" || hold "source_file_missing:$rel"
  head_blob="$(git rev-parse "HEAD:$rel")"
  actual_blob="$(git hash-object "$repo/$rel")"
  test "$head_blob" = "$actual_blob" ||
    hold "source_file_not_current_head_bytes:$rel"
done
say "source_bytes_green=true"

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
bash "$repo/$preflight_wrapper_rel" "$repo/$preflight_tool_rel" |
  tee "$preflight_log"
preflight_rc="${PIPESTATUS[0]}"
set -e
test "$preflight_rc" -eq 0 ||
  hold "fresh_atomic_preflight_not_green"
say "fresh_atomic_preflight_green=true"

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
[[ "$live_configuration_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "live_configuration_sha256_missing"
[[ "$live_dropin_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "live_dropin_sha256_missing"
[[ "$dormant_dropin_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "dormant_dropin_sha256_missing"

ensure_private_direct_dir "$HOME/.config/void" "void_config_dir"
ensure_private_direct_dir "$stage_root" "stage_root"

out_dir="$stage_root/$live_configuration_sha256"

say "=== MATERIALIZE INACTIVE LIVE + ROLLBACK STAGE ==="
set +e
node "$repo/$stage_tool_rel"   --preflight-log "$preflight_log"   --out-dir "$out_dir"   --active-dropin-dir "$active_dropin_dir" |
  tee "$stage_log"
stage_rc="${PIPESTATUS[0]}"
set -e
test "$stage_rc" -eq 0 ||
  hold "inactive_stage_not_green"

expected_preflight_log_sha256="$(
  sha256sum "$preflight_log" | awk '{print $1}'
)"
staged_preflight_log_sha256="$(
  awk -F= '
    $1=="preflight_log_sha256" { value=$2 }
    END { print value }
  ' "$stage_log"
)"
[[ "$staged_preflight_log_sha256" =~ ^[0-9a-f]{64}$ ]] ||
  hold "staged_preflight_log_sha256_missing"
test "$staged_preflight_log_sha256" = "$expected_preflight_log_sha256" ||
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
say "preflight_log_sha256=$expected_preflight_log_sha256"
say "preflight_credential_read_inside_reviewed_factory=true"
say "wrapper_fresh_preflight_execution_proven=true"
say "stage_manifest_preflight_authority=false"
say "database_mutation=false"
say "active_dropin_write=false"
say "daemon_reload=false"
say "service_restart=false"
say "runtime_gate_mutation=false"
say "transaction_broadcast=false"
say "funds_movement=false"
say "${MARKER}_GREEN"
