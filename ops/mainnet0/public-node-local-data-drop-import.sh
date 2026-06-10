#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-}"
OBJECT_ID="${2:-}"

if [ -z "$SRC" ]; then
  echo "usage: DATA_DIR=.runtime/mainnet0 ops/mainnet0/public-node-local-data-drop-import.sh /path/to/file [object-id]" >&2
  exit 2
fi

if [ ! -f "$SRC" ]; then
  echo "[fail] source file not found: $SRC" >&2
  exit 2
fi

DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
DROP_DIR="$DATA_DIR/public-node/local-data-drop/objects"
mkdir -p "$DROP_DIR"

if [ -z "$OBJECT_ID" ]; then
  BASE="$(basename "$SRC")"
  SAFE="$(printf '%s' "$BASE" | tr -cd 'A-Za-z0-9._-' | cut -c1-120)"
  HASH="$(sha256sum "$SRC" | awk '{print $1}' | cut -c1-16)"
  OBJECT_ID="${HASH}-${SAFE:-object.bin}"
fi

if ! printf '%s' "$OBJECT_ID" | grep -Eq '^[A-Za-z0-9._-]{1,160}$'; then
  echo "[fail] invalid object id: $OBJECT_ID" >&2
  exit 2
fi

DEST="$DROP_DIR/$OBJECT_ID"
cp "$SRC" "$DEST"

SHA256="$(sha256sum "$DEST" | awk '{print $1}')"
BYTES="$(wc -c < "$DEST" | tr -d ' ')"

echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1"
echo "object_id=$OBJECT_ID"
echo "bytes=$BYTES"
echo "sha256=$SHA256"
echo "dest=$DEST"
echo "public_index_route=/public-node/local-data-drop.json"
echo "public_object_route=/public-node/local-data-drop/$OBJECT_ID"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "public_read_only=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1_IMPORTED"
