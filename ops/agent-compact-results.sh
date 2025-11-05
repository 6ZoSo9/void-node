#!/usr/bin/env bash
set -euo pipefail
DIR="${VOID_DATA_DIR:-${DATA_DIR:-$HOME/dev/void-node/data_a}}/agent"
in="$DIR/results.jsonl"; out="$DIR/results.compacted.jsonl"
[[ -f "$in" ]] || { echo "no $in"; exit 0; }

declare -A buf
# shellcheck disable=SC2162
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  id=$(jq -r 'try .id // empty' <<<"$line" 2>/dev/null || echo "")
  [[ -z "$id" ]] && continue
  buf["$id"]="$line"
done < "$in"

# Print in id-sorted order for stability
: > "$out.tmp"
for id in $(printf '%s\n' "${!buf[@]}" | sort); do
  printf '%s\n' "${buf[$id]}" >> "$out.tmp"
done
mv -f "$out.tmp" "$out"
echo "compacted -> $out"
