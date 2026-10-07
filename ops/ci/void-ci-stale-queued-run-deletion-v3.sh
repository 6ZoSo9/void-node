#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

REPO="${REPO:-6ZoSo9/void-node}"
MIN_AGE_DAYS="${MIN_AGE_DAYS:-14}"

echo "VOID_CI_STALE_QUEUED_RUN_DELETION_V3"
echo "repo=$REPO"
echo "min_age_days=$MIN_AGE_DAYS"
echo "source_mutation=false"
echo "branch_mutation=false"
echo "workflow_definition_mutation=false"
echo "actions_run_history_deletion=true"
echo "queued_only=true"
echo "current_open_pr_runs_protected=true"
echo "wallet_or_key_access=false"
echo "transaction=false"
echo "funds_moved=false"
echo

for cmd in gh jq date sort; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "HOLD: missing required command: $cmd" >&2
    exit 2
  }
done

gh auth status >/dev/null 2>&1 || {
  echo "HOLD: gh authentication unavailable" >&2
  exit 2
}

now_epoch="$(date -u +%s)"
cutoff_epoch="$(( now_epoch - MIN_AGE_DAYS * 86400 ))"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
inventory="$tmp/inventory.tsv"
eligible="$tmp/eligible.tsv"
: > "$inventory"
: > "$eligible"

echo "=== INVENTORY QUEUED RUNS ==="
gh api --paginate \
  -H 'Accept: application/vnd.github+json' \
  "repos/$REPO/actions/runs?status=queued&per_page=100" \
  --jq '.workflow_runs[] | [
    (.id|tostring),
    .status,
    .event,
    (.head_branch // ""),
    .created_at,
    ((.pull_requests|length)|tostring),
    (.name // "")
  ] | @tsv' >> "$inventory"

sort -u -k1,1n "$inventory" -o "$inventory"
echo "inventory_count=$(wc -l < "$inventory" | tr -d ' ')"

while IFS=$'\t' read -r id status event branch created pr_count name; do
  [ -n "${id:-}" ] || continue
  [ "$status" = "queued" ] || continue
  [ "$event" = "pull_request" ] || continue
  [ -n "$branch" ] || continue
  [ "$branch" != "main" ] || continue
  [ "$pr_count" -eq 0 ] || continue

  created_epoch="$(date -u -d "$created" +%s 2>/dev/null || echo 0)"
  [ "$created_epoch" -gt 0 ] || continue
  [ "$created_epoch" -le "$cutoff_epoch" ] || continue
  age_days="$(( (now_epoch - created_epoch) / 86400 ))"

  open_pr_count="$(
    gh pr list \
      --repo "$REPO" \
      --state open \
      --head "$branch" \
      --json number \
      --jq 'length'
  )"

  [ "$open_pr_count" -eq 0 ] || {
    echo "protect_run_id=$id branch=$branch reason=open_pr_exists"
    continue
  }

  printf '%s\t%s\t%s\t%s\t%s\n' \
    "$id" "$branch" "$created" "$age_days" "$name" >> "$eligible"
done < "$inventory"

echo
echo "=== VERIFIED STALE QUEUED RUNS ==="
if [ ! -s "$eligible" ]; then
  echo "eligible_count=0"
  echo "VOID_CI_STALE_QUEUED_RUN_DELETION_V3_NOOP_GREEN"
  exit 0
fi

while IFS=$'\t' read -r id branch created age_days name; do
  printf 'eligible_run_id=%s age_days=%s branch=%s workflow=%s created_at=%s\n' \
    "$id" "$age_days" "$branch" "$name" "$created"
done < "$eligible"
echo "eligible_count=$(wc -l < "$eligible" | tr -d ' ')"

echo
echo "=== DELETE VERIFIED STALE QUEUED RUNS ==="
while IFS=$'\t' read -r id branch _created _age_days _name; do
  json="$(gh api -H 'Accept: application/vnd.github+json' "repos/$REPO/actions/runs/$id")"
  live_status="$(jq -r '.status' <<<"$json")"
  live_event="$(jq -r '.event' <<<"$json")"
  live_branch="$(jq -r '.head_branch // ""' <<<"$json")"
  live_created="$(jq -r '.created_at' <<<"$json")"
  live_pr_count="$(jq -r '.pull_requests | length' <<<"$json")"
  live_created_epoch="$(date -u -d "$live_created" +%s 2>/dev/null || echo 0)"

  [ "$live_status" = "queued" ] || {
    echo "HOLD: run $id status changed to $live_status" >&2
    exit 2
  }
  [ "$live_event" = "pull_request" ] || {
    echo "HOLD: run $id event changed to $live_event" >&2
    exit 2
  }
  [ "$live_branch" = "$branch" ] || {
    echo "HOLD: run $id branch changed" >&2
    exit 2
  }
  [ "$live_pr_count" -eq 0 ] || {
    echo "HOLD: run $id gained PR association" >&2
    exit 2
  }
  [ "$live_created_epoch" -le "$cutoff_epoch" ] || {
    echo "HOLD: run $id no longer satisfies age boundary" >&2
    exit 2
  }

  open_pr_count="$(
    gh pr list \
      --repo "$REPO" \
      --state open \
      --head "$live_branch" \
      --json number \
      --jq 'length'
  )"
  [ "$open_pr_count" -eq 0 ] || {
    echo "HOLD: run $id branch now has an open PR" >&2
    exit 2
  }

  gh api --method DELETE \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2026-03-10' \
    "repos/$REPO/actions/runs/$id"

  echo "deleted_run_id=$id branch=$live_branch"
done < "$eligible"

echo
echo "=== POSTCHECK ==="
bad=0
while IFS=$'\t' read -r id _branch _created _age_days _name; do
  if gh api "repos/$REPO/actions/runs/$id" >/dev/null 2>&1; then
    echo "HOLD: deleted run still resolves: $id" >&2
    bad=1
  else
    echo "run_id=$id deleted=true"
  fi
done < "$eligible"

[ "$bad" -eq 0 ] || exit 2

echo
echo "VOID_CI_STALE_QUEUED_RUN_DELETION_V3_GREEN"
