#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$REPO/docs"
JOBS_FILE="$DOCS_DIR/VOID-DEVNET-DEMO-JOBS.jsonl"

mkdir -p "$DOCS_DIR"

DESC="${1:-}"
APP="${2:-demo.app}"

if [[ -z "$DESC" ]]; then
  echo "usage: $0 'description' [appId]" >&2
  exit 1
fi

# Ensure file exists
touch "$JOBS_FILE"

# Find last non-empty line and extract .id (JSONL-safe)
last_line="$(tac "$JOBS_FILE" 2>/dev/null | sed '/^[[:space:]]*$/d' | head -n1 || true)"
if [[ -n "${last_line:-}" ]]; then
  last_id="$(printf '%s\n' "$last_line" | jq -r '.id // empty' 2>/dev/null || echo "")"
else
  last_id=""
fi

if [[ -z "${last_id:-}" ]]; then
  next_id=1
else
  next_id=$(( last_id + 1 ))
fi

ts="$(date -Iseconds)"

jq -nc \
  --argjson id "$next_id" \
  --arg ts "$ts" \
  --arg desc "$DESC" \
  --arg app "$APP" \
  '{id:$id, ts:$ts, description:$desc, app:$app}' >> "$JOBS_FILE"

echo "[demo-job-add] added id=$next_id app=$APP desc=$DESC"
echo "[demo-job-add] tail of $JOBS_FILE:"
tail -n 3 "$JOBS_FILE" || true
