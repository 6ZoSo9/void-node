#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_PR1820_DIRECT_TOR_PRECISION_VERIFY_V1"
REPO="$HOME/dev/void-node"
TARGET_BRANCH="feat/public-p2p-direct-tor-introductions-v1-20260925"
EXPECTED_MAIN="8a0ad68deb24e2c9897e895edf9d876e1aa0341c"
EXPECTED_HEAD="bab349b8b3df15c582fe04ba0acc9d93ef37417c"

echo "$MARKER"
echo "primary_worktree_switch=false"
echo "primary_worktree_mutation=false"
echo "git_fetch=true"
echo "detached_temporary_worktree=true"
echo "npm_locked_install=true"
echo "typecheck=true"
echo "build=true"
echo "source_proof=true"
echo "live_network_acceptance=false"
echo "service_action=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "funds_movement=false"

test -d "$REPO/.git" || {
  echo "REFUSE: repository missing: $REPO" >&2
  exit 2
}

git -C "$REPO" fetch origin main "$TARGET_BRANCH" --quiet

actual_main="$(git -C "$REPO" rev-parse origin/main)"
actual_head="$(git -C "$REPO" rev-parse "origin/$TARGET_BRANCH")"

echo "origin_main=$actual_main"
echo "target_head=$actual_head"

test "$actual_main" = "$EXPECTED_MAIN" || {
  echo "REFUSE: main moved from expected base" >&2
  exit 3
}
test "$actual_head" = "$EXPECTED_HEAD" || {
  echo "REFUSE: target branch head changed" >&2
  exit 3
}

root="$HOME/Downloads/void-pr1820-direct-tor-verify-v1"
if test -e "$root"; then
  git -C "$REPO" worktree remove --force "$root" >/dev/null 2>&1 || true
  rm -rf -- "$root"
fi

cleanup() {
  git -C "$REPO" worktree remove --force "$root" >/dev/null 2>&1 || true
  rm -rf -- "$root"
}
trap cleanup EXIT INT TERM

git -C "$REPO" worktree add --detach "$root" "$EXPECTED_HEAD" --quiet
test "$(git -C "$root" rev-parse HEAD)" = "$EXPECTED_HEAD"

cd "$root"

npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build

npx --no-install tsx   scripts/prove_void_public_p2p_direct_tor_introductions_v1.ts

npx --no-install tsx   scripts/prove_void_p2p_learned_peer_public_redial_filter_v1.ts

npx --no-install tsx   scripts/prove_void_p2p_verified_peer_cache_reconnect_v1.ts

node scripts/prove_void_tor_native_bootstrap_transport_v1.mjs

git diff --check
test -z "$(git status --porcelain=v1 --untracked-files=all)"

echo "exact_head_verified=true"
echo "typecheck_green=true"
echo "build_green=true"
echo "direct_tor_source_proof_green=true"
echo "learned_peer_filter_preserved=true"
echo "verified_peer_cache_preserved=true"
echo "tor_native_transport_preserved=true"
echo "${MARKER}_GREEN"
