#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

echo "VOID_PR1782_SYSTEMD_USER_CREDENTIAL_PRECISION_VERIFY_V1"
echo "primary_worktree_switch=false"
echo "service_action=false"
echo "database_login=false"
echo "database_mutation=false"
echo "production_credential_read=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "inventory_or_wc_mutation=false"
echo "funds_movement=false"
echo "synthetic_loopback_tls_listener=true"

repo="$HOME/dev/void-node"
branch="fix/postgres-systemd-user-credential-root-v1-20260923"
expected_source_head="9b782a03b6476aff7f3574f48d35b9e22238b70b"
expected_base="ca228f6c66461c5f3e787662865a51af561632a8"
expected_branch_delta="ops/precision/void-pr1782-systemd-user-credential-precision-verify-v1.sh"

tmp="$(mktemp -d "${TMPDIR:-/tmp}/void-pr1782-usercred-proof-v1.XXXXXX")"
wt="$tmp/wt"
cred_dir=""
user_credentials_root=""

cleanup() {
  rc=$?
  trap - EXIT
  if [ -n "${cred_dir:-}" ] && [ -e "$cred_dir" ]; then
    chmod -R u+rwX "$cred_dir" >/dev/null 2>&1 || true
    rm -rf -- "$cred_dir" >/dev/null 2>&1 || true
  fi
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

for cmd in git node npm openssl install chmod ln sha256sum; do
  command -v "$cmd" >/dev/null 2>&1 || fail "missing command: $cmd"
done

[ -d "$repo/.git" ] || fail "repo missing: $repo"
[ -d "$repo/node_modules" ] || fail "primary repo node_modules missing"
[ -e "$repo/node_modules/tsx" ] || fail "primary repo tsx dependency missing"

echo
echo "=== FETCH / PIN ==="
git -C "$repo" fetch origin --quiet --prune

remote_head="$(git -C "$repo" rev-parse "origin/$branch")"
remote_main="$(git -C "$repo" rev-parse origin/main)"

echo "origin_branch_head=$remote_head"
echo "expected_source_head=$expected_source_head"
echo "origin_main=$remote_main"
echo "expected_base=$expected_base"

[ "$remote_main" = "$expected_base" ] || fail "main moved; resync/review required"
git -C "$repo" merge-base --is-ancestor "$expected_source_head" "$remote_head" \
  || fail "PR #1782 branch no longer descends from reviewed source head"

branch_delta="$(git -C "$repo" diff --name-only "$expected_source_head..$remote_head")"
[ "$branch_delta" = "$expected_branch_delta" ] || {
  echo "unexpected branch delta:" >&2
  printf '%s\n' "$branch_delta" >&2
  fail "PR #1782 moved beyond the verifier-only append"
}
echo "verifier_only_branch_append=true"

echo
echo "=== DETACHED WORKTREE ==="
git -C "$repo" worktree add --detach "$wt" "$remote_head" >/dev/null
ln -s "$repo/node_modules" "$wt/node_modules"

git -C "$wt" diff --check "$expected_base...$remote_head"
echo "detached_worktree=true"
echo "node_modules_reused_read_only_by_source=true"

echo
echo "=== SYSTEMD USER-LAYOUT FIXTURE ==="
uid="$(id -u)"
user_credentials_root="/run/user/$uid/credentials"
[ -d "/run/user/$uid" ] || fail "user runtime directory missing"
[ -d "$user_credentials_root" ] || fail "systemd user credentials root missing"

cred_dir="$user_credentials_root/void-postgres-pr1782-hostproof-$$.service"
install -d -m 0700 "$cred_dir"

password="$cred_dir/buy-void-dispatcher-postgres-password-v1"
ca="$cred_dir/buy-void-dispatcher-postgres-ca-v1"
key="$tmp/server.key"

printf '%s' 'void-pr1782-hostproof-password-v1' > "$password"
chmod 0400 "$password"

openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 1 \
  -subj '/CN=localhost' \
  -addext 'basicConstraints=critical,CA:TRUE' \
  -addext 'subjectAltName=DNS:localhost' \
  -keyout "$key" \
  -out "$ca" \
  >/dev/null 2>&1
chmod 0400 "$ca"

echo "credential_fixture=$cred_dir"
echo "credential_directory_mode=$(stat -c '%a' "$cred_dir")"
echo "credential_directory_owner=$(stat -c '%u' "$cred_dir")"
echo "current_uid=$uid"

[ "$(stat -c '%a' "$cred_dir")" = "700" ] || fail "fixture directory mode mismatch"
[ "$(stat -c '%u' "$cred_dir")" = "$uid" ] || fail "fixture directory owner mismatch"

echo
echo "=== FOCUSED TYPECHECK ==="
(
  cd "$wt"
  ./node_modules/.bin/tsc \
    --noEmit --strict --target ES2022 --module NodeNext \
    --moduleResolution NodeNext --lib ES2022 --types node \
    --esModuleInterop --skipLibCheck \
    scripts/prove_buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts \
    scripts/prove_buy_void_payment_keyed_dispatcher_postgres_production_config_v1.ts
)
echo "focused_typecheck=true"

echo
echo "=== PRODUCTION CONFIG PROOF ==="
(
  cd "$wt"
  node --import tsx \
    scripts/prove_buy_void_payment_keyed_dispatcher_postgres_production_config_v1.ts
) | tee "$tmp/config.log"

grep -Fx \
  'VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1_PROOF_GREEN' \
  "$tmp/config.log"
grep -Fx 'systemd_user_credential_directory_accepted=true' "$tmp/config.log"

echo
echo "=== REAL FACTORY PROOF AGAINST USER CREDENTIAL ROOT ==="
(
  cd "$wt"
  VOID_TEST_POSTGRES_CREDENTIALS_DIRECTORY="$cred_dir" \
  VOID_TEST_POSTGRES_SERVER_KEY_PATH="$key" \
    node --import tsx \
      scripts/prove_buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts
) | tee "$tmp/factory.log"

for marker in \
  'VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1_PROOF_GREEN' \
  'postgres_connection_factory_cases=13' \
  'credential_root_kind=user' \
  'systemd_user_credential_root_current_uid_bound=true' \
  'descriptor_pinned_credentials=true' \
  'nofollow_symlink_guards=true' \
  'credential_file_mode_0400_required=true' \
  'pool_construction_network_connect=false' \
  'ambient_pg_environment_ignored=true' \
  'postgres_tls_handshake_observed=true' \
  'connection_string_used=false' \
  'schema_query_on_factory_creation=false' \
  'automatic_schema_migration=false' \
  'runtime_route_mount=false' \
  'wallet_access=false' \
  'transaction_broadcast=false' \
  'money_movement=false'
do
  grep -Fx "$marker" "$tmp/factory.log"
done

echo
echo "primary_worktree_switch=false"
echo "service_action=false"
echo "database_login=false"
echo "production_credential_read=false"
echo "wallet_or_signer_access=false"
echo "funds_movement=false"
echo "result=GREEN"
