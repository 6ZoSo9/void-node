#!/usr/bin/env bash
set -Eeuo pipefail

branch="ren/buy-void-preappend-detached-json-v1-20261010"
predecessor="781bc8b56a548cba971cdb998ffc7351ee7684d2"
qualified_main="ae87314f7b25b23e5ae1251eec7101dda8a1e0a9"
workflow=".github/workflows/void-pr2761-main-reconcile-v2.yml"
helper="scripts/void_pr2761_main_reconcile_v2.sh"

: "${GITHUB_SHA:?missing GITHUB_SHA}"
: "${GITHUB_REF_NAME:?missing GITHUB_REF_NAME}"
test "$GITHUB_REF_NAME" = "$branch"

expected_stage="$(printf '%s\n' "$workflow" "$helper" | sort)"
actual_stage="$(git diff --name-only "$predecessor" "$GITHUB_SHA" | sort)"
test "$actual_stage" = "$expected_stage"

git fetch --no-tags origin main
test "$(git rev-parse origin/main)" = "$qualified_main"

git config user.name "VOID Repository Bot"
git config user.email "44710859+6ZoSo9@users.noreply.github.com"

git merge --no-commit --no-ff "$qualified_main"
test -z "$(git diff --name-only --diff-filter=U)"
test -z "$(git ls-files -u)"

npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build

node scripts/prove_buy_void_verified_allocation_replay_binding_v1.mjs
node --import tsx scripts/prove_buy_void_allocation_reservation_ledger_v1.ts
node --import tsx scripts/prove_buy_void_allocation_reservation_plain_data_v1.ts
node scripts/prove_buy_void_preappend_plain_input_v1.mjs

if node scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v3.mjs \
  > /tmp/void-crash-v3.log 2>&1; then
  echo "UNEXPECTED_FROZEN_CRASH_MATRIX_V3_ACCEPTANCE" >&2
  exit 1
fi
grep -F \
  'reviewed_source_blob_drift:src/economic/buy_void_verified_allocation_replay_binding_v1.ts' \
  /tmp/void-crash-v3.log
node scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v4.mjs

node scripts/prove_void_buy_allocation_custody_service_v1.mjs
node scripts/prove_void_buy_allocation_custody_service_bootstrap_plan_v1.mjs
node scripts/prove_canonical_producer_legacy_self_http_observers_v1.mjs
node scripts/prove_void_public_checkpoint_seal_first_startup_v1.mjs

git diff --exit-code
test -z "$(git ls-files --others --exclude-standard)"

rm -- "$workflow" "$helper"
git add -A
git diff --cached --check
test -z "$(git diff --name-only --diff-filter=U)"

git commit -m "merge(econ): reconcile V4 presale hardening with qualified main"

test "$(git rev-parse HEAD^1)" = "$GITHUB_SHA"
test "$(git rev-parse HEAD^2)" = "$qualified_main"
remote_head="$(git ls-remote origin "refs/heads/$branch" | awk '{print $1}')"
test "$remote_head" = "$GITHUB_SHA"
git push origin "HEAD:refs/heads/$branch"
