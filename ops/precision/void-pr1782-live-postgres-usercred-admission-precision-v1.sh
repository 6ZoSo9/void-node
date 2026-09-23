#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

echo "VOID_PR1782_LIVE_POSTGRES_USERCRED_ADMISSION_PRECISION_V1"
echo "target_void_node_service_action=false"
echo "target_void_node_restart=false"
echo "transient_user_unit=true"
echo "production_credential_read=true"
echo "live_postgres_connection=true"
echo "schema_query_performed=true"
echo "database_mutation=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "inventory_or_wc_mutation=false"
echo "funds_movement=false"

repo="$HOME/dev/void-node"
verify_branch="verify/pr1782-live-usercred-admission-v1-20260923"
expected_core="396182307c84e035a6160aa06cca74a04b3ea6f8"

password_source="$HOME/.local/share/void/postgres-dispatcher-tls-v1/buy-void-dispatcher-postgres-password-v1"
ca_source="$HOME/.local/share/void/postgres-dispatcher-tls-v1/buy-void-dispatcher-postgres-ca-v1.pem"

helper_path="ops/precision/void-pr1782-live-postgres-usercred-admission-v1.ts"
launcher_path="ops/precision/void-pr1782-live-postgres-usercred-admission-precision-v1.sh"

tmp="$(mktemp -d "${TMPDIR:-/tmp}/void-pr1782-live-admission-v1.XXXXXX")"
wt="$tmp/wt"
unit="void-pr1782-live-postgres-admission-$$.service"

cleanup() {
  rc=$?
  trap - EXIT
  systemctl --user reset-failed "$unit" >/dev/null 2>&1 || true
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

for cmd in git node systemd-run systemctl stat readlink grep awk; do
  command -v "$cmd" >/dev/null 2>&1 || fail "missing command: $cmd"
done

[ -d "$repo/.git" ] || fail "repo missing: $repo"
[ -d "$repo/node_modules" ] || fail "primary repo node_modules missing"
[ -e "$repo/node_modules/tsx" ] || fail "primary repo tsx dependency missing"

for source in "$password_source" "$ca_source"; do
  [ -f "$source" ] || fail "credential source missing: $source"
  [ ! -L "$source" ] || fail "credential source is symlink: $source"
done

echo
echo "=== FETCH / PIN ==="
git -C "$repo" fetch origin --quiet --prune

verify_head="$(git -C "$repo" rev-parse "origin/$verify_branch")"
main_head="$(git -C "$repo" rev-parse origin/main)"

echo "verify_head=$verify_head"
echo "core_head=$expected_core"
echo "origin_main=$main_head"

git -C "$repo" merge-base --is-ancestor "$expected_core" "$verify_head" \
  || fail "verification branch no longer descends from reviewed #1782 head"

git -C "$repo" diff --name-only "$expected_core..$verify_head" | sort > "$tmp/delta"
cat > "$tmp/expected-delta" <<EOF
$helper_path
$launcher_path
EOF
sort -o "$tmp/expected-delta" "$tmp/expected-delta"
cmp -s "$tmp/delta" "$tmp/expected-delta" || {
  echo "unexpected verification branch delta:" >&2
  cat "$tmp/delta" >&2
  fail "verification branch contains more than the two verifier files"
}

echo "verification_branch_delta_exact=true"

echo
echo "=== DETACHED WORKTREE ==="
git -C "$repo" worktree add --detach "$wt" "$verify_head" >/dev/null
ln -s "$repo/node_modules" "$wt/node_modules"
echo "detached_worktree=true"

echo
echo "=== TRANSIENT SYSTEMD USER ADMISSION ==="
out="$(
  systemd-run --user \
    --unit="$unit" \
    --wait \
    --pipe \
    --collect \
    -p "WorkingDirectory=$wt" \
    -p "LoadCredential=buy-void-dispatcher-postgres-password-v1:$password_source" \
    -p "LoadCredential=buy-void-dispatcher-postgres-ca-v1:$ca_source" \
    /usr/bin/node --import tsx "$helper_path"
)"
printf '%s\n' "$out"

for marker in \
  'VOID_PR1782_LIVE_POSTGRES_USERCRED_ADMISSION_V1' \
  'credentials_directory_systemd_user=true' \
  'credential_current_uid_bound=true' \
  'factory_ready=true' \
  'factory_lazy_before_admission=true' \
  'ambient_pg_environment_ignored=true' \
  'tls_verify_full=true' \
  'schema_admitted=true' \
  'database_mutation=false' \
  'wallet_or_signer_access=false' \
  'transaction_broadcast=false' \
  'funds_movement=false' \
  'result=GREEN'
do
  grep -Fx "$marker" <<<"$out" >/dev/null || fail "missing marker: $marker"
done

config_fp="$(grep '^configuration_fingerprint_sha256=' <<<"$out" | tail -n1 | cut -d= -f2)"
schema_fp="$(grep '^schema_fingerprint_sha256=' <<<"$out" | tail -n1 | cut -d= -f2)"

[[ "$config_fp" =~ ^[0-9a-f]{64}$ ]] || fail "configuration fingerprint invalid"
[[ "$schema_fp" =~ ^[0-9a-f]{64}$ ]] || fail "schema fingerprint invalid"

echo
echo "configuration_fingerprint_sha256=$config_fp"
echo "schema_fingerprint_sha256=$schema_fp"
echo "target_void_node_service_action=false"
echo "target_void_node_restart=false"
echo "database_mutation=false"
echo "wallet_or_signer_access=false"
echo "transaction_broadcast=false"
echo "funds_movement=false"
echo "result=GREEN"
