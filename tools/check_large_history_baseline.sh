#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

MAX_MB="${VOID_LARGE_HISTORY_MAX_MB:-10}"
BASELINE_FILE="${VOID_LARGE_HISTORY_BASELINE_FILE:-fixtures/ops/guard-baselines/large-history-blobs-v1.json}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ALL="$TMP/all-large-history.tsv"
ALLOWED="$TMP/allowed.txt"
BAD="$TMP/bad.tsv"

if [ ! -f "$BASELINE_FILE" ]; then
  echo "FAIL: missing large-history baseline file: $BASELINE_FILE" >&2
  exit 1
fi

git rev-list --objects --all \
  | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
  | awk -v max="$MAX_MB" '$1=="blob" && ($3/1024/1024)>=max{ print $2 "\t" $3 "\t" $4 }' \
  > "$ALL"

if command -v jq >/dev/null 2>&1; then
  jq -r '.allowed_blobs[]?.object' "$BASELINE_FILE" | sed '/^$/d' > "$ALLOWED"
elif command -v python3 >/dev/null 2>&1; then
  python3 - "$BASELINE_FILE" > "$ALLOWED" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
for item in data.get("allowed_blobs", []):
    oid = item.get("object", "")
    if oid:
        print(oid)
PY
else
  echo "FAIL: need jq or python3 to read $BASELINE_FILE" >&2
  exit 1
fi

: > "$BAD"
while IFS="$(printf '\t')" read -r oid bytes path; do
  [ -n "${oid:-}" ] || continue
  if ! grep -Fxq "$oid" "$ALLOWED"; then
    printf '%s\t%s\t%s\n' "$oid" "$bytes" "$path" >> "$BAD"
  fi
done < "$ALL"

if [ -s "$BAD" ]; then
  echo "FAIL: new/unbaselined blobs >=${MAX_MB}MB found"
  awk -F '\t' '{ printf "%.2f MB %s %s\n", $2/1024/1024, $1, $3 }' "$BAD"
  exit 1
fi

echo "OK: no new/unbaselined blobs >=${MAX_MB}MB"
if [ -s "$ALL" ]; then
  echo "baseline_large_history_blobs:"
  awk -F '\t' '{ printf "%.2f MB %s %s\n", $2/1024/1024, $1, $3 }' "$ALL"
fi
