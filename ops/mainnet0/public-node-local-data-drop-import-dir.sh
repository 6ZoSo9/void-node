#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SRC_DIR="${1:-}"
DATA_ROOT="${DATA_DIR:-$ROOT/.runtime/mainnet0}"
MAX_FILES="${MAX_FILES:-100}"

if [ -z "$SRC_DIR" ]; then
  echo "[fail] usage: DATA_DIR=/path ops/mainnet0/public-node-local-data-drop-import-dir.sh /path/to/dir" >&2
  exit 2
fi

if [ ! -d "$SRC_DIR" ]; then
  echo "[fail] source directory not found: $SRC_DIR" >&2
  exit 2
fi

SRC_DIR="$(cd "$SRC_DIR" && pwd)"
mkdir -p "$DATA_ROOT"

echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1"
echo "source_dir=$SRC_DIR"
echo "data_dir=$DATA_ROOT"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "public_read_only=true"
echo "read_only=true"
echo "trusted_as_network_truth=false"

COUNT=0
declare -A SEEN=()

while IFS= read -r -d '' FILE; do
  if [ "$COUNT" -ge "$MAX_FILES" ]; then
    echo "[fail] max files exceeded: $MAX_FILES" >&2
    exit 3
  fi

  REL="${FILE#$SRC_DIR/}"
  OBJECT_ID="$(printf '%s' "$REL" | sed -E 's#[/\\]+#__#g; s#[^A-Za-z0-9._-]#_#g')"

  if [ -z "$OBJECT_ID" ]; then
    echo "[fail] empty object id for file: $FILE" >&2
    exit 4
  fi

  if [ "${SEEN[$OBJECT_ID]+seen}" = "seen" ]; then
    echo "[fail] object id collision: $OBJECT_ID" >&2
    exit 5
  fi
  SEEN[$OBJECT_ID]=1

  IMPORT_LOG="$(mktemp)"
  DATA_DIR="$DATA_ROOT" ops/mainnet0/public-node-local-data-drop-import.sh "$FILE" "$OBJECT_ID" > "$IMPORT_LOG"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1_IMPORTED" "$IMPORT_LOG"

  SHA="$(sha256sum "$FILE" | awk '{print $1}')"
  COUNT=$((COUNT + 1))

  echo "imported_object_id=$OBJECT_ID"
  echo "imported_sha256=$SHA"
done < <(find "$SRC_DIR" -type f -print0 | sort -z)

if [ "$COUNT" -le 0 ]; then
  echo "[fail] no regular files found in source directory" >&2
  exit 6
fi

echo "imported_count=$COUNT"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1_IMPORTED"
