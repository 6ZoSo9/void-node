#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
mkdir -p .runtime/mainnet0

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT=".runtime/mainnet0/main-ci-rollup-after-pr12-v1-proof.${STAMP}.json"

FIXTURE="fixtures/ops/main-ci-rollup-after-pr12-v1.json"

run_check() {
  local name="$1"
  shift
  local log=".runtime/mainnet0/main-ci-rollup-after-pr12-v1-${name}.${STAMP}.log"
  set +e
  "$@" >"$log" 2>&1
  local rc="$?"
  set -e
  echo "$rc"
}

MAIN_HEAD="$(git rev-parse origin/main)"
EXPECTED_MAIN_HEAD="$(jq -r '.expected_main_head' "$FIXTURE")"
CURRENT_BRANCH="$(git branch --show-current)"

OPEN_PR_COUNT="$(gh pr list --repo 6ZoSo9/void-node --state open --json number --jq 'length' 2>/dev/null || echo 999)"

PR9_STATE="$(gh pr view 9 --repo 6ZoSo9/void-node --json state --jq '.state' 2>/dev/null || echo unknown)"
PR10_STATE="$(gh pr view 10 --repo 6ZoSo9/void-node --json state --jq '.state' 2>/dev/null || echo unknown)"
PR11_STATE="$(gh pr view 11 --repo 6ZoSo9/void-node --json state --jq '.state' 2>/dev/null || echo unknown)"
PR12_STATE="$(gh pr view 12 --repo 6ZoSo9/void-node --json state --jq '.state' 2>/dev/null || echo unknown)"

MISSING_TAGS=""
while IFS= read -r tag; do
  [ -n "$tag" ] || continue
  if ! git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
    MISSING_TAGS="${MISSING_TAGS}${tag} "
  fi
done < <(jq -r '.required_tags[]' "$FIXTURE")

INDEX_RC="$(run_check index_guard bash tools/check_index_size.sh)"
LARGE_HISTORY_RC="$(run_check large_history bash tools/check_large_history_baseline.sh)"
LARGE_WORKTREE_RC="$(run_check large_worktree bash tools/check_large_worktree_files.sh)"
TSC_RC="$(run_check tsc_baseline bash tools/check_tsc_noemit_baseline.sh)"
BETA_RC="$(run_check beta_guard bash .ci/beta-proof-guards.sh)"
LICENSE_RC="$(run_check license_guard diff -u --strip-trailing-cr .ci/VCL_LICENSE.txt LICENSE)"
PROM_RC="$(run_check prom_verify bash ops/prom-verify.sh)"

set +e
OPS_EXEC_LOG=".runtime/mainnet0/main-ci-rollup-after-pr12-v1-ops-executable.${STAMP}.log"
BAD=""
for f in ops/*.sh ops/**/*.sh; do
  [ -f "$f" ] || continue
  if [ ! -x "$f" ]; then
    echo "not executable: $f" >> "$OPS_EXEC_LOG"
    BAD=1
  fi
done
test -z "$BAD"
OPS_EXEC_RC="$?"
set -e

set +e
CRLF_LOG=".runtime/mainnet0/main-ci-rollup-after-pr12-v1-crlf.${STAMP}.log"
if grep -RIl $'\r' ops/*.sh ops/**/*.sh 2>/dev/null | tee "$CRLF_LOG" | grep . >/dev/null; then
  CRLF_RC=1
else
  CRLF_RC=0
fi
set -e

PR12_CHECKS_LOG=".runtime/mainnet0/main-ci-rollup-after-pr12-v1-pr12-checks.${STAMP}.log"
set +e
gh pr checks --repo 6ZoSo9/void-node 12 >"$PR12_CHECKS_LOG" 2>&1
PR12_CHECKS_RC="$?"
grep -q "All checks were successful" "$PR12_CHECKS_LOG"
PR12_CHECKS_GREEN_RC="$?"
set -e

python3 - "$OUT" <<PY
import json, sys

out = sys.argv[1]

data = {
  "marker": "VOID_MAIN_CI_ROLLUP_AFTER_PR12_V1_GREEN" if all([
    "$MAIN_HEAD" == "$EXPECTED_MAIN_HEAD",
    "$OPEN_PR_COUNT" == "0",
    "$PR9_STATE" == "MERGED",
    "$PR10_STATE" == "MERGED",
    "$PR11_STATE" == "MERGED",
    "$PR12_STATE" == "MERGED",
    "$MISSING_TAGS" == "",
    "$INDEX_RC" == "0",
    "$LARGE_HISTORY_RC" == "0",
    "$LARGE_WORKTREE_RC" == "0",
    "$TSC_RC" == "0",
    "$BETA_RC" == "0",
    "$LICENSE_RC" == "0",
    "$PROM_RC" == "0",
    "$OPS_EXEC_RC" == "0",
    "$CRLF_RC" == "0"
  ]) else "VOID_MAIN_CI_ROLLUP_AFTER_PR12_V1_RED",
  "branch": "$CURRENT_BRANCH",
  "main_head": "$MAIN_HEAD",
  "expected_main_head": "$EXPECTED_MAIN_HEAD",
  "checks": {
    "main_head_matches_fixture": "$MAIN_HEAD" == "$EXPECTED_MAIN_HEAD",
    "open_pr_count": int("$OPEN_PR_COUNT") if "$OPEN_PR_COUNT".isdigit() else "$OPEN_PR_COUNT",
    "open_pr_count_zero": "$OPEN_PR_COUNT" == "0",
    "recent_pr_states": {
      "9": "$PR9_STATE",
      "10": "$PR10_STATE",
      "11": "$PR11_STATE",
      "12": "$PR12_STATE"
    },
    "recent_prs_merged": all(x == "MERGED" for x in ["$PR9_STATE", "$PR10_STATE", "$PR11_STATE", "$PR12_STATE"]),
    "missing_tags": "$MISSING_TAGS".split(),
    "required_tags_exist": "$MISSING_TAGS" == "",
    "local_rc": {
      "index_guard": int("$INDEX_RC"),
      "large_history_baseline": int("$LARGE_HISTORY_RC"),
      "large_worktree": int("$LARGE_WORKTREE_RC"),
      "tsc_noemit_baseline": int("$TSC_RC"),
      "beta_proof_guard": int("$BETA_RC"),
      "license_guard": int("$LICENSE_RC"),
      "prom_verify": int("$PROM_RC"),
      "ops_executable_guard": int("$OPS_EXEC_RC"),
      "ops_crlf_guard": int("$CRLF_RC")
    },
    "pr12_checks_command_rc": int("$PR12_CHECKS_RC"),
    "pr12_checks_green_text_rc": int("$PR12_CHECKS_GREEN_RC")
  },
  "boundary": {
    "runtime_change": False,
    "public_node_route_change": False,
    "wallet_or_money_movement": False,
    "ci_rollup_only": True
  }
}

with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\\n")

print(out)
print(json.dumps(data, indent=2))
PY

jq -e '.marker == "VOID_MAIN_CI_ROLLUP_AFTER_PR12_V1_GREEN"' "$OUT" >/dev/null
