#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

echo "VOID_PR1782_POSTRESTART_RESUME_CLOSEOUT_PRECISION_V1"
echo "service_action=false"
echo "service_restart=false"
echo "source_mutation=false"
echo "postgres_restart=false"
echo "credential_materialization_verify=true"
echo "live_postgres_connection=true_read_only_admission"
echo "database_mutation=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "inventory_or_wc_mutation=false"
echo "funds_movement=false"

repo="$HOME/dev/void-node"
unit="void-node-live.service"
expected_main="0055b737603a720802040882b1e05e5738c3da4d"
expected_tree="1ddd930336d290db3d2d9eaef875c405285fc956"
wc_backpressure_commit="250f2996aec4c489356af9a0b8c127aa936b558d"
verify_branch="verify/pr1782-postmerge-restart-admission-v1-20260923"
helper_rel="ops/precision/void-pr1782-postrestart-live-postgres-admission-v1.ts"
launcher_rel="ops/precision/void-pr1782-postrestart-resume-closeout-precision-v1.sh"

cred_root="$HOME/.local/share/void/postgres-dispatcher-tls-v1"
password_source="$cred_root/buy-void-dispatcher-postgres-password-v1"
ca_source="$cred_root/buy-void-dispatcher-postgres-ca-v1.pem"
expected_ca_sha256="c0ae7c1cabe7062356c44332f607cc71db8b41b21ad1d84921c71b563be20d1d"

tmp="$(mktemp -d "${TMPDIR:-/tmp}/void-pr1782-resume-closeout-v1.XXXXXX")"
wt="$tmp/wt"

cleanup() {
  rc=$?
  trap - EXIT
  if [ -d "$wt" ]; then
    git -C "$repo" worktree remove --force "$wt" >/dev/null 2>&1 || true
  fi
  rm -rf -- "$tmp" >/dev/null 2>&1 || true
  exit "$rc"
}
trap cleanup EXIT

fail() {
  echo "HOLD: $*" >&2
  exit 1
}

for cmd in git systemctl python3 stat sha256sum cmp curl awk grep wc; do
  command -v "$cmd" >/dev/null 2>&1 || fail "missing command: $cmd"
done

echo
echo "=== FINAL SOURCE / SERVICE IDENTITY ==="
git -C "$repo" fetch origin --quiet --prune
local_head="$(git -C "$repo" rev-parse HEAD)"
origin_main="$(git -C "$repo" rev-parse origin/main)"
local_tree="$(git -C "$repo" rev-parse 'HEAD^{tree}')"
branch="$(git -C "$repo" branch --show-current)"

[ "$branch" = "main" ] || fail "primary checkout is not main"
[ "$local_head" = "$expected_main" ] || fail "local main mismatch"
[ "$origin_main" = "$expected_main" ] || fail "origin/main moved"
[ "$local_tree" = "$expected_tree" ] || fail "local tree mismatch"
[ -z "$(git -C "$repo" status --porcelain=v1 --untracked-files=all)" ]   || fail "primary worktree dirty"
git -C "$repo" merge-base --is-ancestor "$wc_backpressure_commit" "$expected_main"   || fail "WC runner serialization fix is not in final main"

systemctl --user is-active --quiet "$unit" || fail "$unit inactive"
pid_before="$(systemctl --user show "$unit" -p MainPID --value)"
invocation_before="$(systemctl --user show "$unit" -p InvocationID --value)"
[[ "$pid_before" =~ ^[1-9][0-9]*$ ]] || fail "invalid MainPID"

python3 - "$pid_before" > "$tmp/proc" <<'PY'
import pathlib, sys
pid=sys.argv[1]
keys=[
 "VOID_PROCESS_SOURCE_COMMIT",
 "VOID_PROCESS_SOURCE_TREE",
 "VOID_PROCESS_SOURCE_BRANCH",
 "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
 "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
 "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
 "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
 "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
 "VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST",
 "VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT",
 "VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX",
 "VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS",
 "VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS",
 "CREDENTIALS_DIRECTORY",
]
vals={k:"<unset>" for k in keys}
raw=pathlib.Path(f"/proc/{pid}/environ").read_bytes()
for item in raw.split(b"\0"):
    if b"=" not in item: continue
    k,v=item.split(b"=",1)
    try: key=k.decode("utf-8","strict")
    except UnicodeDecodeError: continue
    if key in vals:
        vals[key]=v.decode("utf-8","replace")
for key in keys:
    print(f"{key}={vals[key]}")
PY

expected_cred_dir="/run/user/$(id -u)/credentials/$unit"
for pair in   "VOID_PROCESS_SOURCE_COMMIT=$expected_main"   "VOID_PROCESS_SOURCE_TREE=$expected_tree"   "VOID_PROCESS_SOURCE_BRANCH=main"   "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=1"   "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0"   "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0"   "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=0"   "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED=0"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST=127.0.0.1"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT=5432"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX=4"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS=5000"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS=5000"   "CREDENTIALS_DIRECTORY=$expected_cred_dir"
do
  grep -Fx "$pair" "$tmp/proc" >/dev/null || fail "live process mismatch: $pair"
done

echo "main_pid=$pid_before"
echo "invocation_id=$invocation_before"
echo "process_source_exact=true"
echo "wc_runner_serialization_fix_present=true"
echo "runtime_parent_enabled=true"
echo "full_runtime_enabled=false"
echo "full_runtime_apply_enabled=false"
echo "claimed_runtime_enabled=false"
echo "admitted_guarded_runtime_enabled=false"

echo
echo "=== MATERIALIZED CREDENTIALS ==="
materialized_password="$expected_cred_dir/buy-void-dispatcher-postgres-password-v1"
materialized_ca="$expected_cred_dir/buy-void-dispatcher-postgres-ca-v1"

for p in "$password_source" "$ca_source" "$materialized_password" "$materialized_ca"; do
  [ -f "$p" ] || fail "missing credential path: $p"
  [ ! -L "$p" ] || fail "credential path is symlink: $p"
done

[ "$(stat -c '%u' "$password_source")" = "$(id -u)" ] || fail "password source owner mismatch"
[ "$(stat -c '%a' "$password_source")" = "400" ] || fail "password source mode mismatch"
[ "$(stat -c '%u' "$materialized_password")" = "$(id -u)" ] || fail "materialized password owner mismatch"
[ "$(stat -c '%a' "$materialized_password")" = "400" ] || fail "materialized password mode mismatch"
[ "$(stat -c '%u' "$materialized_ca")" = "$(id -u)" ] || fail "materialized CA owner mismatch"
[ "$(stat -c '%a' "$materialized_ca")" = "400" ] || fail "materialized CA mode mismatch"

printf '%s  %s\n' "$expected_ca_sha256" "$ca_source" | sha256sum -c -
printf '%s  %s\n' "$expected_ca_sha256" "$materialized_ca" | sha256sum -c -
cmp -s "$password_source" "$materialized_password" || fail "password materialization mismatch"
cmp -s "$ca_source" "$materialized_ca" || fail "CA materialization mismatch"

echo "password_credential_materialized_exact=true"
echo "ca_credential_materialized_exact=true"
echo "credential_mode_0400=true"
echo "credential_content_not_printed=true"

echo
echo "=== LIVE READ-ONLY POSTGRES ADMISSION ==="
verify_head="$(git -C "$repo" rev-parse "origin/$verify_branch")"
git -C "$repo" merge-base --is-ancestor "$expected_main" "$verify_head"   || fail "verification branch does not descend from final main"

git -C "$repo" worktree add --detach "$wt" "$verify_head" >/dev/null
ln -s "$repo/node_modules" "$wt/node_modules"

(
  cd "$wt"
  CREDENTIALS_DIRECTORY="$expected_cred_dir"     /usr/bin/node --import tsx "$helper_rel"
) | tee "$tmp/admission.log"

for marker in   'VOID_PR1782_POSTRESTART_LIVE_POSTGRES_ADMISSION_V1'   'credentials_directory_live_service=true'   'credential_current_uid_bound=true'   'factory_ready=true'   'factory_lazy_before_admission=true'   'ambient_pg_environment_ignored=true'   'tls_verify_full=true'   'schema_admitted=true'   'database_mutation=false'   'wallet_or_signer_access=false'   'transaction_broadcast=false'   'funds_movement=false'   'result=GREEN'
do
  grep -Fx "$marker" "$tmp/admission.log" >/dev/null || fail "missing admission marker: $marker"
done

config_fp="$(grep '^configuration_fingerprint_sha256=' "$tmp/admission.log" | tail -n1 | cut -d= -f2)"
schema_fp="$(grep '^schema_fingerprint_sha256=' "$tmp/admission.log" | tail -n1 | cut -d= -f2)"
[[ "$config_fp" =~ ^[0-9a-f]{64}$ ]] || fail "configuration fingerprint invalid"
[[ "$schema_fp" =~ ^[0-9a-f]{64}$ ]] || fail "schema fingerprint invalid"

echo
echo "=== PUBLIC HEALTH / STABILITY HOLD ==="
http_code() {
  curl --max-time 5 --silent --show-error --output /dev/null --write-out '%{http_code}' "$1"
}

app_before="$(http_code 'http://127.0.0.1:4100/app/')"
gateway_before="$(http_code 'http://127.0.0.1:8082/')"
[ "$app_before" = "200" ] || fail "4100 /app/ HTTP $app_before"
[ "$gateway_before" = "200" ] || fail "8082 / HTTP $gateway_before"

rchar_before="$(awk '/^rchar:/ {print $2}' "/proc/$pid_before/io")"
wchar_before="$(awk '/^wchar:/ {print $2}' "/proc/$pid_before/io")"

sleep 15

systemctl --user is-active --quiet "$unit" || fail "service lost active state during hold"
pid_after="$(systemctl --user show "$unit" -p MainPID --value)"
invocation_after="$(systemctl --user show "$unit" -p InvocationID --value)"
[ "$pid_after" = "$pid_before" ] || fail "MainPID changed during hold"
[ "$invocation_after" = "$invocation_before" ] || fail "InvocationID changed during hold"

app_after="$(http_code 'http://127.0.0.1:4100/app/')"
gateway_after="$(http_code 'http://127.0.0.1:8082/')"
[ "$app_after" = "200" ] || fail "4100 /app/ after hold HTTP $app_after"
[ "$gateway_after" = "200" ] || fail "8082 / after hold HTTP $gateway_after"

rchar_after="$(awk '/^rchar:/ {print $2}' "/proc/$pid_after/io")"
wchar_after="$(awk '/^wchar:/ {print $2}' "/proc/$pid_after/io")"

echo "app_4100_http_before=$app_before"
echo "app_4100_http_after=$app_after"
echo "composition_8082_http_before=$gateway_before"
echo "composition_8082_http_after=$gateway_after"
echo "main_pid_stable=true"
echo "invocation_id_stable=true"
echo "rchar_delta=$((rchar_after-rchar_before))"
echo "wchar_delta=$((wchar_after-wchar_before))"

echo
echo "configuration_fingerprint_sha256=$config_fp"
echo "schema_fingerprint_sha256=$schema_fp"
echo "service_restart=false"
echo "postgres_restart=false"
echo "database_mutation=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "inventory_or_wc_mutation=false"
echo "funds_movement=false"
echo "result=GREEN"
