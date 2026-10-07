#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

REPO="${REPO:-6ZoSo9/void-node}"
MIN_AGE_DAYS="${MIN_AGE_DAYS:-3}"

echo "VOID_CI_STALE_RUN_RETIREMENT_V2"
echo "repo=$REPO"
echo "min_age_days=$MIN_AGE_DAYS"
echo "source_mutation=false"
echo "branch_mutation=false"
echo "workflow_definition_mutation=false"
echo "actions_run_cancel_only=true"
echo "current_open_pr_runs_protected=true"
echo "wallet_or_key_access=false"
echo "transaction=false"
echo "funds_moved=false"
echo

for cmd in gh jq date sort awk; do
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

echo "=== INVENTORY ACTIVE/QUEUED RUNS ==="
for status in queued in_progress; do
  gh api --paginate \
    -H 'Accept: application/vnd.github+json' \
    "repos/$REPO/actions/runs?status=$status&per_page=100" \
    --jq '.workflow_runs[] | [
      (.id|tostring),
      .status,
      .event,
      (.head_branch // ""),
      .created_at,
      ((.pull_requests|length)|tostring),
      (.name // "")
    ] | @tsv' >> "$inventory"
done

sort -u -k1,1n "$inventory" -o "$inventory"
echo "inventory_count=$(wc -l < "$inventory" | tr -d ' ')"

while IFS=$'\t' read -r id status event branch created pr_count name; do
  [ -n "${id:-}" ] || continue

  created_epoch="$(date -u -d "$created" +%s 2>/dev/null || echo 0)"
  age_days="$(( (now_epoch - created_epoch) / 86400 ))"

  case "$status" in
    queued|in_progress) ;;
    *) continue ;;
  esac
  [ "$event" = "pull_request" ] || continue
  [ -n "$branch" ] || continue
  [ "$branch" != "main" ] || continue
  [ "$pr_count" -eq 0 ] || continue
  [ "$created_epoch" -gt 0 ] || continue
  [ "$created_epoch" -le "$cutoff_epoch" ] || continue

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

  printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$id" "$status" "$branch" "$created" "$age_days" "$name" >> "$eligible"
done < "$inventory"

echo
echo "=== VERIFIED STALE RUNS ==="
if [ ! -s "$eligible" ]; then
  echo "eligible_count=0"
  echo "VOID_CI_STALE_RUN_RETIREMENT_V2_NOOP_GREEN"
  exit 0
fi

cat "$eligible" | while IFS=$'\t' read -r id status branch created age_days name; do
  printf 'eligible_run_id=%s status=%s age_days=%s branch=%s workflow=%s created_at=%s\n' \
    "$id" "$status" "$age_days" "$branch" "$name" "$created"
done
echo "eligible_count=$(wc -l < "$eligible" | tr -d ' ')"

echo
echo "=== CANCEL VERIFIED STALE RUNS ==="
while IFS=$'\t' read -r id _status branch _created _age_days _name; do
  json="$(gh api -H 'Accept: application/vnd.github+json' "repos/$REPO/actions/runs/$id")"
  live_status="$(jq -r '.status' <<<"$json")"
  live_event="$(jq -r '.event' <<<"$json")"
  live_branch="$(jq -r '.head_branch // ""' <<<"$json")"
  live_created="$(jq -r '.created_at' <<<"$json")"
  live_pr_count="$(jq -r '.pull_requests | length' <<<"$json")"
  live_created_epoch="$(date -u -d "$live_created" +%s 2>/dev/null || echo 0)"

  case "$live_status" in
    queued|in_progress) ;;
    *)
      echo "skip_run_id=$id reason=status_changed status=$live_status"
      continue
      ;;
  esac

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

  gh api \
    -X POST \
    -H 'Accept: application/vnd.github+json' \
    "repos/$REPO/actions/runs/$id/cancel" \
    >/dev/null

  echo "cancel_requested_run_id=$id branch=$live_branch"
done < "$eligible"

echo
echo "=== POSTCHECK ==="
sleep 2
while IFS=$'\t' read -r id _status _branch _created _age_days _name; do
  json="$(gh api -H 'Accept: application/vnd.github+json' "repos/$REPO/actions/runs/$id")"
  status="$(jq -r '.status' <<<"$json")"
  conclusion="$(jq -r '.conclusion // ""' <<<"$json")"
  echo "run_id=$id status=$status conclusion=${conclusion:-none}"
done < "$eligible"

echo
echo "VOID_CI_STALE_RUN_RETIREMENT_V2_GREEN"
