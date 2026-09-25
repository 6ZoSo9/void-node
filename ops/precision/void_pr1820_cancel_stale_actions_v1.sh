#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_PR1820_CANCEL_STALE_ACTIONS_V1"
REPO="6ZoSo9/void-node"
FEATURE_BRANCH="feat/public-p2p-direct-tor-introductions-v1-20260925"
CURRENT_HEAD="bab349b8b3df15c582fe04ba0acc9d93ef37417c"

echo "$MARKER"
echo "github_actions_mutation=cancel_stale_runs_only"
echo "repository_source_mutation=false"
echo "current_head_run_cancellation=false"
echo "other_branch_run_cancellation=false"
echo "service_action=false"
echo "chain2050_write=false"
echo "wallet_or_signer_access=false"
echo "funds_movement=false"

command -v gh >/dev/null 2>&1 || {
  echo "REFUSE: gh is required" >&2
  exit 2
}
command -v python3 >/dev/null 2>&1 || {
  echo "REFUSE: python3 is required" >&2
  exit 2
}

actual_head="$(gh api "repos/$REPO/branches/$FEATURE_BRANCH" --jq '.commit.sha')"
echo "feature_branch_head=$actual_head"
test "$actual_head" = "$CURRENT_HEAD" || {
  echo "REFUSE: feature branch head changed" >&2
  exit 3
}

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

gh run list   --repo "$REPO"   --branch "$FEATURE_BRANCH"   --limit 1000   --json databaseId,headSha,status,name,event   >"$tmp"

mapfile -t stale_ids < <(
  CURRENT_HEAD="$CURRENT_HEAD" python3 - "$tmp" <<'PY'
import json, os, sys
path=sys.argv[1]
current=os.environ["CURRENT_HEAD"]
active={"queued","in_progress","requested","waiting","pending"}
rows=json.load(open(path))
for row in rows:
    if row.get("headSha") == current:
        continue
    if row.get("status") not in active:
        continue
    value=row.get("databaseId")
    if isinstance(value, int) and value > 0:
        print(value)
PY
)

echo "stale_active_run_count=${#stale_ids[@]}"

cancelled=0
for run_id in "${stale_ids[@]}"; do
  test -n "$run_id" || continue
  meta="$(gh run view "$run_id" --repo "$REPO" --json headSha,status,name,event)"
  head="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["headSha"])' <<<"$meta")"
  status="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])' <<<"$meta")"
  name="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])' <<<"$meta")"

  test "$head" != "$CURRENT_HEAD" || {
    echo "REFUSE: candidate run belongs to current head: $run_id" >&2
    exit 4
  }

  case "$status" in
    queued|in_progress|requested|waiting|pending) ;;
    *)
      echo "skip_run=$run_id status=$status name=$name"
      continue
      ;;
  esac

  echo "cancel_run=$run_id head=$head status=$status name=$name"
  gh run cancel "$run_id" --repo "$REPO"
  cancelled=$((cancelled + 1))
done

after_head="$(gh api "repos/$REPO/branches/$FEATURE_BRANCH" --jq '.commit.sha')"
test "$after_head" = "$CURRENT_HEAD" || {
  echo "REFUSE: feature branch moved during cleanup" >&2
  exit 5
}

echo "cancelled_stale_run_count=$cancelled"
echo "current_head_preserved=$CURRENT_HEAD"
echo "${MARKER}_GREEN"
