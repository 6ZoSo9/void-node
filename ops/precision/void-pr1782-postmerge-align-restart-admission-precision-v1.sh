#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

echo "VOID_PR1782_POSTMERGE_ALIGN_RESTART_ADMISSION_PRECISION_V1"
echo "source_fast_forward=true_guarded"
echo "service_restart=true_at_most_once"
echo "postgres_restart=false"
echo "credential_materialization=true"
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
verify_branch="verify/pr1782-postmerge-restart-admission-v1-20260923"
helper_rel="ops/precision/void-pr1782-postrestart-live-postgres-admission-v1.ts"
launcher_rel="ops/precision/void-pr1782-postmerge-align-restart-admission-precision-v1.sh"

source92_rel="ops/systemd/void-node-live.service.d/92-buy-void-dispatcher-postgres-credentials-v1.conf.example"
source94_rel="ops/systemd/void-node-live.service.d/94-buy-void-claimed-postgres-precision-reconcile-v1.conf.example"
run_rel="ops/run-void-node-live-v1.sh"

expected_92_blob="dfe25fac6dfd98bc884ade38fe5196e6c048f60b"
expected_94_blob="67981a141ebfc8a05902fdefc21a8db58946329c"
expected_run_blob="39e183f877a3e2c5c8be2d70f508dd002b7372c3"

cred_root="$HOME/.local/share/void/postgres-dispatcher-tls-v1"
password_source="$cred_root/buy-void-dispatcher-postgres-password-v1"
ca_source="$cred_root/buy-void-dispatcher-postgres-ca-v1.pem"
expected_ca_sha256="c0ae7c1cabe7062356c44332f607cc71db8b41b21ad1d84921c71b563be20d1d"

dropin_dir="$HOME/.config/systemd/user/void-node-live.service.d"
drop92="$dropin_dir/92-buy-void-dispatcher-postgres-credentials-v1.conf"
drop94="$dropin_dir/94-buy-void-claimed-postgres-precision-reconcile-v1.conf"

tmp="$(mktemp -d "${TMPDIR:-/tmp}/void-pr1782-postmerge-restart-v1.XXXXXX")"
wt="$tmp/wt"
restart_performed=0

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

for cmd in git systemctl python3 sed cmp stat sha256sum grep awk tr sort comm node; do
  command -v "$cmd" >/dev/null 2>&1 || fail "missing command: $cmd"
done

[ -d "$repo/.git" ] || fail "repo missing: $repo"
[ -d "$repo/node_modules" ] || fail "repo node_modules missing"
[ -e "$repo/node_modules/tsx" ] || fail "tsx dependency missing"

echo
echo "=== FETCH / PIN FINAL MAIN ==="
git -C "$repo" fetch origin --quiet --prune

origin_main="$(git -C "$repo" rev-parse origin/main)"
verify_head="$(git -C "$repo" rev-parse "origin/$verify_branch")"
branch="$(git -C "$repo" branch --show-current)"
local_head="$(git -C "$repo" rev-parse HEAD)"

echo "origin_main=$origin_main"
echo "expected_main=$expected_main"
echo "verify_head=$verify_head"
echo "branch=$branch"
echo "local_head=$local_head"

[ "$origin_main" = "$expected_main" ] || fail "origin/main moved from reviewed merge"
[ "$branch" = "main" ] || fail "primary checkout is not main"
[ -z "$(git -C "$repo" status --porcelain=v1 --untracked-files=all)" ]   || fail "primary worktree is not clean"

git -C "$repo" merge-base --is-ancestor "$local_head" "$expected_main"   || fail "local main is not an ancestor of final main"
local_unique="$(git -C "$repo" rev-list --count "$expected_main..$local_head")"
[ "$local_unique" = "0" ] || fail "local main has unique commits"

git -C "$repo" merge-base --is-ancestor "$expected_main" "$verify_head"   || fail "verification branch does not descend from final main"

git -C "$repo" diff --name-only "$expected_main..$verify_head" | sort > "$tmp/verify-delta"
cat > "$tmp/verify-expected" <<EOF
$helper_rel
$launcher_rel
EOF
sort -o "$tmp/verify-expected" "$tmp/verify-expected"
cmp -s "$tmp/verify-delta" "$tmp/verify-expected"   || fail "verification branch contains unexpected files"

[ "$(git -C "$repo" rev-parse "$expected_main:$source92_rel")" = "$expected_92_blob" ]   || fail "merged 92 source blob mismatch"
[ "$(git -C "$repo" rev-parse "$expected_main:$source94_rel")" = "$expected_94_blob" ]   || fail "merged 94 source blob mismatch"
[ "$(git -C "$repo" rev-parse "$expected_main:$run_rel")" = "$expected_run_blob" ]   || fail "merged live runner blob mismatch"

echo "verification_branch_delta_exact=true"
echo "merged_systemd_blobs_pinned=true"
echo "live_runner_source_direct=true"

echo
echo "=== INSTALLED CREDENTIAL / DROP-IN PRECHECK ==="
for p in "$password_source" "$ca_source" "$drop92" "$drop94"; do
  [ -f "$p" ] || fail "required path missing: $p"
  [ ! -L "$p" ] || fail "required path is symlink: $p"
done

printf '%s  %s\n' "$expected_ca_sha256" "$ca_source" | sha256sum -c -

[ "$(stat -c '%u' "$password_source")" = "$(id -u)" ]   || fail "password source owner mismatch"
[ "$(stat -c '%a' "$password_source")" = "400" ]   || fail "password source mode is not 0400"

git -C "$repo" show "$expected_main:$source92_rel"   | sed "s|/ABSOLUTE/OPERATOR/PRIVATE/PATH|$cred_root|g" > "$tmp/92.expected"
git -C "$repo" show "$expected_main:$source94_rel" > "$tmp/94.expected"

cmp -s "$drop92" "$tmp/92.expected" || fail "installed 92 differs from reviewed candidate"
cmp -s "$drop94" "$tmp/94.expected" || fail "installed 94 differs from reviewed candidate"

[ ! -e "$dropin_dir/93-buy-void-claimed-postgres-dormant-v1.conf" ]   || fail "generic 93 dormant overlay is installed"

unit_cat="$(systemctl --user cat "$unit")"
for binding in   "LoadCredential=buy-void-dispatcher-postgres-password-v1:$password_source"   "LoadCredential=buy-void-dispatcher-postgres-ca-v1:$ca_source"
do
  grep -Fq "$binding" <<<"$unit_cat" || fail "credential binding missing: $binding"
done
for id in buy-void-dispatcher-postgres-password-v1 buy-void-dispatcher-postgres-ca-v1; do
  count="$(grep -Ec "^[[:space:]]*LoadCredential=${id}:" <<<"$unit_cat")"
  [ "$count" = "1" ] || fail "credential binding count for $id is $count"
done

echo "installed_92_exact=true"
echo "installed_94_exact=true"
echo "credential_bindings_exact=true"

echo
echo "=== LIVE PROCESS PRECHECK ==="
systemctl --user is-active --quiet "$unit" || fail "$unit is not active"
pid_before="$(systemctl --user show "$unit" -p MainPID --value)"
[[ "$pid_before" =~ ^[1-9][0-9]*$ ]] || fail "invalid pre-restart MainPID"

python3 - "$pid_before" > "$tmp/proc-before" <<'PY'
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
wanted={k:"<unset>" for k in keys}
for item in pathlib.Path(f"/proc/{pid}/environ").read_bytes().split(b"\0"):
    if b"=" not in item: continue
    kb,vb=item.split(b"=",1)
    try: k=kb.decode("utf-8","strict")
    except UnicodeDecodeError: continue
    if k in wanted:
        wanted[k]=vb.decode("utf-8","replace")
for k in keys:
    print(f"{k}={wanted[k]}")
PY

proc_value() {
  local key="$1"
  awk -F= -v k="$key" '$1==k {print substr($0,length(k)+2)}' "$tmp/proc-before" | tail -n1
}

source_before="$(proc_value VOID_PROCESS_SOURCE_COMMIT)"
branch_before="$(proc_value VOID_PROCESS_SOURCE_BRANCH)"
parent_before="$(proc_value VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED)"
full_before="$(proc_value VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED)"
apply_before="$(proc_value VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED)"
claimed_before="$(proc_value VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED)"
admitted_before="$(proc_value VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED)"
creds_before="$(proc_value CREDENTIALS_DIRECTORY)"

[ "$branch_before" = "main" ] || fail "running process source branch is not main"
[ "$parent_before" = "1" ] || fail "parent runtime is not enabled"
[ "$full_before" = "0" ] || fail "full runtime is not disabled"
[ "$apply_before" = "0" ] || fail "full runtime apply is not disabled"
case "$claimed_before" in "<unset>"|0) ;; *) fail "claimed runtime unsafe: $claimed_before" ;; esac
case "$admitted_before" in "<unset>"|0) ;; *) fail "admitted runtime unsafe: $admitted_before" ;; esac

git -C "$repo" cat-file -e "$source_before^{commit}" 2>/dev/null   || fail "running process source commit unavailable"
git -C "$repo" merge-base --is-ancestor "$source_before" "$expected_main"   || fail "running process source commit is not an ancestor of final main"

echo "main_pid_before=$pid_before"
echo "process_source_before=$source_before"
echo "process_credentials_directory_before=$creds_before"
echo "pre_restart_safe_gates=true"

echo
echo "=== FAST-FORWARD PRIMARY MAIN ==="
if [ "$local_head" != "$expected_main" ]; then
  git -C "$repo" merge --ff-only origin/main
fi
[ "$(git -C "$repo" rev-parse HEAD)" = "$expected_main" ]   || fail "primary main did not align to final main"
[ -z "$(git -C "$repo" status --porcelain=v1 --untracked-files=all)" ]   || fail "primary worktree dirty after fast-forward"

final_tree="$(git -C "$repo" rev-parse "$expected_main^{tree}")"
echo "source_alignment=true"
echo "final_main=$expected_main"
echo "final_tree=$final_tree"

echo
echo "=== CONTROLLED RESTART / MATERIALIZATION ==="
expected_cred_dir="/run/user/$(id -u)/credentials/$unit"

already_materialized=false
if   [ "$source_before" = "$expected_main" ] &&   [ "$creds_before" = "$expected_cred_dir" ] &&   [ "$claimed_before" = "0" ] &&   [ "$admitted_before" = "0" ]
then
  already_materialized=true
fi

if [ "$already_materialized" = false ]; then
  systemctl --user restart "$unit"
  restart_performed=1
fi

for _ in $(seq 1 60); do
  if systemctl --user is-active --quiet "$unit"; then
    pid_after="$(systemctl --user show "$unit" -p MainPID --value)"
    if [[ "$pid_after" =~ ^[1-9][0-9]*$ ]] && [ -r "/proc/$pid_after/environ" ]; then
      break
    fi
  fi
  sleep 0.25
done

systemctl --user is-active --quiet "$unit" || fail "$unit is not active after restart"
pid_after="$(systemctl --user show "$unit" -p MainPID --value)"
[[ "$pid_after" =~ ^[1-9][0-9]*$ ]] || fail "invalid post-restart MainPID"

if [ "$restart_performed" = 1 ]; then
  [ "$pid_after" != "$pid_before" ] || fail "restart did not replace MainPID"
fi

python3 - "$pid_after" > "$tmp/proc-after" <<'PY'
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
wanted={k:"<unset>" for k in keys}
for item in pathlib.Path(f"/proc/{pid}/environ").read_bytes().split(b"\0"):
    if b"=" not in item: continue
    kb,vb=item.split(b"=",1)
    try: k=kb.decode("utf-8","strict")
    except UnicodeDecodeError: continue
    if k in wanted:
        wanted[k]=vb.decode("utf-8","replace")
for k in keys:
    print(f"{k}={wanted[k]}")
PY

after_value() {
  local key="$1"
  awk -F= -v k="$key" '$1==k {print substr($0,length(k)+2)}' "$tmp/proc-after" | tail -n1
}

for pair in   "VOID_PROCESS_SOURCE_COMMIT=$expected_main"   "VOID_PROCESS_SOURCE_TREE=$final_tree"   "VOID_PROCESS_SOURCE_BRANCH=main"   "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=1"   "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0"   "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0"   "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=0"   "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED=0"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST=127.0.0.1"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT=5432"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX=4"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS=5000"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS=5000"   "CREDENTIALS_DIRECTORY=$expected_cred_dir"
do
  grep -Fx "$pair" "$tmp/proc-after" >/dev/null     || fail "post-restart process missing exact value: $pair"
done

unit_env="$(systemctl --user show "$unit" -p Environment --value)"
for pair in   "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=1"   "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0"   "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0"   "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=0"   "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED=0"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST=127.0.0.1"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT=5432"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX=4"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS=5000"   "VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS=5000"
do
  grep -Fqw -- "$pair" <<<"$unit_env" || fail "loaded unit missing: $pair"
done

echo "restart_performed=$restart_performed"
echo "main_pid_after=$pid_after"
echo "process_source_final=true"
echo "parent_runtime_enabled=true"
echo "full_runtime_enabled=false"
echo "full_runtime_apply_enabled=false"
echo "claimed_runtime_enabled=false"
echo "admitted_guarded_runtime_enabled=false"
echo "credentials_directory=$expected_cred_dir"

echo
echo "=== MATERIALIZED CREDENTIAL PROOF ==="
materialized_password="$expected_cred_dir/buy-void-dispatcher-postgres-password-v1"
materialized_ca="$expected_cred_dir/buy-void-dispatcher-postgres-ca-v1"

for p in "$materialized_password" "$materialized_ca"; do
  [ -f "$p" ] || fail "materialized credential missing: $p"
  [ ! -L "$p" ] || fail "materialized credential is symlink: $p"
  [ "$(stat -c '%u' "$p")" = "$(id -u)" ]     || fail "materialized credential owner mismatch: $p"
  [ "$(stat -c '%a' "$p")" = "400" ]     || fail "materialized credential mode is not 0400: $p"
done

cmp -s "$password_source" "$materialized_password"   || fail "materialized password differs from private source"
cmp -s "$ca_source" "$materialized_ca"   || fail "materialized CA differs from private source"

echo "password_credential_materialized_exact=true"
echo "ca_credential_materialized_exact=true"
echo "credential_mode_0400=true"
echo "credential_content_not_printed=true"

echo
echo "=== POST-RESTART LIVE READ-ONLY SCHEMA ADMISSION ==="
git -C "$repo" worktree add --detach "$wt" "$verify_head" >/dev/null
ln -s "$repo/node_modules" "$wt/node_modules"

(
  cd "$wt"
  CREDENTIALS_DIRECTORY="$expected_cred_dir"     /usr/bin/node --import tsx "$helper_rel"
) | tee "$tmp/admission.log"

for marker in   'VOID_PR1782_POSTRESTART_LIVE_POSTGRES_ADMISSION_V1'   'credentials_directory_live_service=true'   'credential_current_uid_bound=true'   'factory_ready=true'   'factory_lazy_before_admission=true'   'ambient_pg_environment_ignored=true'   'tls_verify_full=true'   'schema_admitted=true'   'database_mutation=false'   'wallet_or_signer_access=false'   'transaction_broadcast=false'   'funds_movement=false'   'result=GREEN'
do
  grep -Fx "$marker" "$tmp/admission.log" >/dev/null     || fail "missing admission marker: $marker"
done

config_fp="$(grep '^configuration_fingerprint_sha256=' "$tmp/admission.log" | tail -n1 | cut -d= -f2)"
schema_fp="$(grep '^schema_fingerprint_sha256=' "$tmp/admission.log" | tail -n1 | cut -d= -f2)"
[[ "$config_fp" =~ ^[0-9a-f]{64}$ ]] || fail "configuration fingerprint invalid"
[[ "$schema_fp" =~ ^[0-9a-f]{64}$ ]] || fail "schema fingerprint invalid"

echo
echo "configuration_fingerprint_sha256=$config_fp"
echo "schema_fingerprint_sha256=$schema_fp"
echo "service_active=true"
echo "postgres_restart=false"
echo "database_mutation=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "inventory_or_wc_mutation=false"
echo "funds_movement=false"
echo "result=GREEN"
