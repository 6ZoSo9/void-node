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
RECEIPT_DIR="$DATA_DIR/public-node/local-data-drop/receipts"
mkdir -p "$DROP_DIR" "$RECEIPT_DIR"

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
IMPORTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RECEIPT="$RECEIPT_DIR/$OBJECT_ID.json"

python3 - "$RECEIPT" "$OBJECT_ID" "$BYTES" "$SHA256" "$IMPORTED_AT" <<'PYJSON'
import json, sys
receipt, object_id, bytes_s, sha256, imported_at = sys.argv[1:]
doc = {
  "marker": "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
  "object_id": object_id,
  "bytes": int(bytes_s),
  "sha256": sha256,
  "imported_at": imported_at,
  "storage_class": "operator_local_public_read_only",
  "public_upload": False,
  "operator_local_import_only": True,
  "trusted_as_network_truth": False
}
with open(receipt, "w", encoding="utf-8") as f:
  json.dump(doc, f, indent=2, sort_keys=True)
  f.write("\n")
PYJSON

echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1"
echo "object_id=$OBJECT_ID"
echo "bytes=$BYTES"
echo "sha256=$SHA256"
echo "dest=$DEST"
echo "receipt=$RECEIPT"
echo "receipt_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1"
echo "public_index_route=/public-node/local-data-drop.json"
echo "public_object_route=/public-node/local-data-drop/$OBJECT_ID"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "public_read_only=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1_IMPORTED"
