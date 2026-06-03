#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

DOC="ops/security/github-branch-cleanup.current.md"
ARCHIVE_PREFIX="archive/branch-cleanup-20260603-071740"

echo "=== GitHub branch cleanup proof ==="

echo
echo "=== [1] fetch/prune remote truth ==="
git fetch origin --prune --tags >/dev/null 2>&1

echo
echo "=== [2] current branch and repo cleanliness ==="
test "$(git branch --show-current)" = "main"
git diff --check
git status --short

echo
echo "=== [3] remote branch count is zero excluding origin/HEAD and origin/main ==="
COUNT="$(git branch -r | grep -Ev 'origin/(HEAD|main)$' | sed '/^[[:space:]]*$/d' | wc -l | tr -d ' ')"
echo "remote_non_main_branch_count=$COUNT"
test "$COUNT" = "0"

echo
echo "=== [4] archive tags exist for deleted unmerged branches ==="
TAGS="$(git ls-remote --tags origin "refs/tags/${ARCHIVE_PREFIX}/*" | wc -l | tr -d ' ')"
echo "archive_tag_count=$TAGS"
test "$TAGS" = "13"

for suffix in \
  feat/agents-v0 \
  feat/mainnet-core-20251120 \
  feat/node-user-units-20251109-084419 \
  feat/ops-proposer-kickbrake-20251109-084114 \
  feat/p2p-metrics-step-001 \
  feat/safeboot-canary-20251110-151531 \
  feat/wal-v1-mount \
  new-main-2025-10-29 \
  public-sync-20251110-180841 \
  restore-2025-10-28-before-rewrite-20251029-165712 \
  txrestore-work \
  wip/maxstack-1762378033 \
  z_golden_2025-11-06_agent-allow-receipts
do
  git ls-remote --exit-code --tags origin "refs/tags/${ARCHIVE_PREFIX}/${suffix}" >/dev/null
  echo "[ok] archive tag exists: ${ARCHIVE_PREFIX}/${suffix}"
done

echo
echo "=== [5] status doc encodes cleanup result ==="
grep -q 'status: green' "$DOC"
grep -q 'Remote branches other than `origin/main`: 0' "$DOC"
grep -q "$ARCHIVE_PREFIX" "$DOC"
grep -q 'Expected archived branch tags: 13' "$DOC"
grep -q 'Branch cleanup did not perform Buy VOID fulfillment' "$DOC"
grep -q 'Branch cleanup did not perform validator mutation' "$DOC"

echo
echo "=== [6] runtime still ready ==="
READY_JSON="$(curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json)"
echo "$READY_JSON"
READY_JSON="$READY_JSON" python3 - <<'PY'
import json, os, sys
j = json.loads(os.environ["READY_JSON"])
assert j.get("ready") is True, j
assert int(j.get("gap")) == 0, j
assert int(j.get("txroot_live")) == 1, j
PY

echo
echo "[ok] GitHub branch cleanup proof passed"
