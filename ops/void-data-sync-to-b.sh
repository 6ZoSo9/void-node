#!/usr/bin/env bash
set -euo pipefail

# Simple A -> B snapshot sync for VOID data.
# Defaults match your current setup but can be overridden via env:
#   SRC_DIR, DEST_HOST, DEST_USER, DEST_DIR

SRC_DIR="${SRC_DIR:-$HOME/dev/void-node/data_a}"
DEST_HOST="${DEST_HOST:-192.168.1.89}"             # laptop IP
DEST_USER="${DEST_USER:-zoso}"
DEST_DIR="${DEST_DIR:-/home/zoso/dev/void-node}"

STAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
SNAP="/tmp/void-data_a-${STAMP}.tgz"

echo "[sync] src_dir=$SRC_DIR"
echo "[sync] dest=${DEST_USER}@${DEST_HOST}:${DEST_DIR}"
echo "[sync] snapshot=$SNAP"

if [ ! -d "$SRC_DIR" ]; then
  echo "[sync][fatal] SRC_DIR does not exist: $SRC_DIR" >&2
  exit 1
fi

if ! command -v scp >/dev/null 2>&1; then
  echo "[sync][fatal] scp not found on PATH" >&2
  exit 1
fi

echo "[sync] creating tar snapshot from $SRC_DIR..."
tar czf "$SNAP" -C "$HOME/dev/void-node" "$(basename "$SRC_DIR")"

echo "[sync] copying snapshot to laptop..."
scp "$SNAP" "${DEST_USER}@${DEST_HOST}:${DEST_DIR}/"

BASENAME="$(basename "$SNAP")"
echo "[sync] uploaded to ${DEST_HOST}:${DEST_DIR}/${BASENAME}"

cat <<EOF

[sync] NEXT STEPS ON LAPTOP (Node B):

  cd ~/dev/void-node
  ./ops/void-data-apply-snapshot.sh "./${BASENAME}"

If you haven't created ops/void-data-apply-snapshot.sh yet,
do that once on the laptop (Node B) using the instructions I gave you.

EOF
