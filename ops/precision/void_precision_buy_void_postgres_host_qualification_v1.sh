#!/usr/bin/env bash
set -Eeuo pipefail
set +H

MARKER="VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_WRAPPER_V1"
repo="${VOID_LIVE_REPO_ROOT:-$HOME/dev/void-node}"
unit="void-node-live.service"
drop="$HOME/.config/systemd/user/void-node-live.service.d"
tool="${1:-}"

say(){ printf '%s\n' "$*"; }
hold(){ say "${MARKER}_HOLD reason=$*" >&2; exit 2; }

say "$MARKER"
say "read_only=true"
say "service_mutation=false"
say "database_mutation=false"
say "runtime_gate_mutation=false"
say "credential_content_read_by_wrapper=false"
say "credential_content_output=false"
say "transaction_broadcast=false"
say "funds_movement=false"

test -n "$tool" && test -f "$tool" || hold "qualifier_tool_missing"
test -d "$repo/.git" || hold "live_repo_missing"
cd "$repo"

test "$(git branch --show-current)" = "main" || hold "live_repo_not_main"
test -z "$(git status --porcelain=v1 --untracked-files=all)" ||
  hold "live_repo_dirty"

declare -A expected_blob=(
  ["ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example"]="a3500a7f1813972b90e5c00dbf8a03ed4b4ddd6b"
  ["ops/systemd/void-node-live.service.d/92-buy-void-dispatcher-postgres-credentials-v1.conf.example"]="dfe25fac6dfd98bc884ade38fe5196e6c048f60b"
  ["ops/systemd/void-node-live.service.d/94-buy-void-claimed-postgres-precision-reconcile-v1.conf.example"]="67981a141ebfc8a05902fdefc21a8db58946329c"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.ts"]="7133a3a7ebb9349d195cc090787a134f07616a3e"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts"]="066b5d3fde11ec79a8c6bb45f2ec5d6fec511e1f"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.ts"]="88c72330c5a5b92780f2c6add7dda7dd5e92af10"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.ts"]="aae34461ac47b3c5cbdecf75e6f6aa5935df677e"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.ts"]="2db30a0d7f343c5c1264d89ec5c752ade609d843"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts"]="f74cafa7665be4ac0ea4fd518ec02440d337fa27"
  ["src/economic/buy_void_payment_keyed_full_runtime_v1.ts"]="1c238ae8dff7e088421eabff93a98d97357d99e7"
  ["src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_v1.ts"]="27045345cf48cacd2a5f2bc9330812579d0761a4"
  ["package.json"]="f28c3e9446c7623ef203da36a9642d046e5f34ee"
  ["package-lock.json"]="b2671f0149f522b2489247016df0a5ec4bb72b8b"
)

for rel in "${!expected_blob[@]}"; do
  test -f "$repo/$rel" || hold "source_slice_missing:$rel"
  actual="$(git hash-object "$repo/$rel")"
  test "$actual" = "${expected_blob[$rel]}" ||
    hold "source_slice_blob_mismatch:$rel"
done
say "source_slice_blob_identity_green=true"

src91="$repo/ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example"
src94="$repo/ops/systemd/void-node-live.service.d/94-buy-void-claimed-postgres-precision-reconcile-v1.conf.example"
live91="$drop/91-buy-void-payment-keyed-production-dormant-v1.conf"
live92="$drop/92-buy-void-dispatcher-postgres-credentials-v1.conf"
live93="$drop/93-buy-void-claimed-postgres-dormant-v1.conf"
live94="$drop/94-buy-void-claimed-postgres-precision-reconcile-v1.conf"

cmp -s "$src91" "$live91" || hold "dropin_91_source_mismatch"
cmp -s "$src94" "$live94" || hold "dropin_94_source_mismatch"
test ! -e "$live93" || hold "generic_dropin_93_present_on_precision"

mapfile -t active92 < <(
  sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' "$live92" |
    sed '/^$/d; /^#/d'
)
test "${#active92[@]}" -eq 3 || hold "dropin_92_active_directive_count_mismatch"
test "${active92[0]}" = "[Service]" || hold "dropin_92_service_section_mismatch"

password_count=0
ca_count=0
for line in "${active92[@]:1}"; do
  case "$line" in
    LoadCredential=buy-void-dispatcher-postgres-password-v1:/*)
      password_count=$((password_count + 1))
      ;;
    LoadCredential=buy-void-dispatcher-postgres-ca-v1:/*)
      ca_count=$((ca_count + 1))
      ;;
    *)
      hold "dropin_92_unreviewed_active_directive"
      ;;
  esac
done
test "$password_count" -eq 1 || hold "dropin_92_password_credential_count_mismatch"
test "$ca_count" -eq 1 || hold "dropin_92_ca_credential_count_mismatch"
say "installed_dropin_contract_green=true"

test "$(systemctl --user is-active "$unit")" = "active" ||
  hold "void_node_service_not_active"
pid="$(systemctl --user show "$unit" -p MainPID --value)"
[[ "$pid" =~ ^[1-9][0-9]*$ ]] || hold "void_node_main_pid_invalid"

proc_env="/proc/$pid/environ"
test -r "$proc_env" || hold "void_node_process_environment_unreadable"

get_proc_env(){
  local name="$1"
  tr '\0' '\n' <"$proc_env" |
    sed -n "s/^${name}=//p" |
    tail -n 1
}

runtime_integration="$(get_proc_env VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED)"
full_runtime="$(get_proc_env VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED)"
full_apply="$(get_proc_env VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED)"
claimed_runtime="$(get_proc_env VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED)"
admitted_runtime="$(get_proc_env VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED)"
pg_host="$(get_proc_env VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST)"
pg_port="$(get_proc_env VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT)"
pg_pool="$(get_proc_env VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX)"
pg_connect_timeout="$(get_proc_env VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS)"
pg_idle_timeout="$(get_proc_env VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS)"
cred_dir="$(get_proc_env CREDENTIALS_DIRECTORY)"

test "$runtime_integration" = "1" || hold "runtime_integration_not_one"
test "$full_runtime" = "0" || hold "full_runtime_not_zero"
test "$full_apply" = "0" || hold "full_runtime_apply_not_zero"
test "$claimed_runtime" = "0" || hold "claimed_runtime_not_zero"
test "$admitted_runtime" = "0" || hold "admitted_runtime_not_zero"
test "$pg_host" = "127.0.0.1" || hold "postgres_host_mismatch"
test "$pg_port" = "5432" || hold "postgres_port_mismatch"
test "$pg_pool" = "4" || hold "postgres_pool_mismatch"
test "$pg_connect_timeout" = "5000" || hold "postgres_connection_timeout_mismatch"
test "$pg_idle_timeout" = "5000" || hold "postgres_idle_timeout_mismatch"
test -n "$cred_dir" && test -d "$cred_dir" ||
  hold "credentials_directory_unavailable"

uid="$(id -u)"
test "$cred_dir" = "/run/user/$uid/credentials/$unit" ||
  hold "credentials_directory_identity_mismatch"
test ! -L "$cred_dir" || hold "credentials_directory_symlink_forbidden"
dir_uid="$(stat -Lc '%u' "$cred_dir")"
dir_mode="$(stat -Lc '%a' "$cred_dir")"
test "$dir_uid" = "$uid" || hold "credentials_directory_owner_mismatch"
[[ "$dir_mode" =~ ^[0-7]00$ ]] ||
  hold "credentials_directory_permissions_too_broad"

for name in   buy-void-dispatcher-postgres-password-v1   buy-void-dispatcher-postgres-ca-v1
do
  file="$cred_dir/$name"
  test -e "$file" || hold "credential_missing:$name"
  test ! -L "$file" || hold "credential_symlink_forbidden:$name"
  test -f "$file" || hold "credential_not_regular:$name"
  test "$(stat -Lc '%u' "$file")" = "$uid" ||
    hold "credential_owner_mismatch:$name"
  test "$(stat -Lc '%a' "$file")" = "400" ||
    hold "credential_mode_not_0400:$name"
  size="$(stat -Lc '%s' "$file")"
  [[ "$size" =~ ^[1-9][0-9]*$ ]] || hold "credential_size_invalid:$name"
  if [ "$name" = "buy-void-dispatcher-postgres-password-v1" ]; then
    test "$size" -le 4096 || hold "password_credential_too_large"
  else
    test "$size" -le 524288 || hold "ca_credential_too_large"
  fi
done
say "credential_metadata_green=true"
say "credential_content_read_by_wrapper=false"

tsx="$repo/node_modules/.bin/tsx"
test -x "$tsx" || hold "tsx_runtime_missing"
test -f "$repo/node_modules/pg/package.json" || hold "pg_dependency_missing"

say "dormant_runtime_gate_green=true"
say "credential_content_read_inside_reviewed_factory_authorized=true"
say "ambient_libpq_environment_forwarded=false"

env -i   PATH="$PATH"   HOME="$HOME"   VOID_LIVE_REPO_ROOT="$repo"   VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED="$runtime_integration"   VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED="$full_runtime"   VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED="$full_apply"   VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED="$claimed_runtime"   VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED="$admitted_runtime"   VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST="$pg_host"   VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT="$pg_port"   VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX="$pg_pool"   VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS="$pg_connect_timeout"   VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS="$pg_idle_timeout"   CREDENTIALS_DIRECTORY="$cred_dir"   "$tsx" "$tool"

say "${MARKER}_GREEN"
