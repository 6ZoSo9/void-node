#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

MODE="${1:-${MODE:-}}"
COMPARE_LATEST="${COMPARE_LATEST:-$HOME/dev/void-node/.runtime/validator_truth_compare/latest.json}"
OUT_ROOT="${OUT_ROOT:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/cutover}"
STAMP="$(date +%Y%m%d-%H%M%S)"
STAGE_DIR="$OUT_ROOT/$STAMP-$MODE"

if [ -z "$MODE" ]; then
  echo "[ERR] usage: $0 <frozen|upgrade>"
  exit 1
fi

case "$MODE" in
  frozen|upgrade) ;;
  *)
    echo "[ERR] mode must be frozen or upgrade"
    exit 1
    ;;
esac

mkdir -p "$STAGE_DIR"

echo "=== [1] resolve source manifest from compare latest ==="
readarray -t INFO < <(
python3 - <<'PY' "$COMPARE_LATEST" "$MODE"
import json, sys
from pathlib import Path

compare_path = Path(sys.argv[1])
mode = sys.argv[2]

j = json.loads(compare_path.read_text())
manifest = j["frozenManifest"] if mode == "frozen" else j["upgradeManifest"]
summary = j.get("coreSummary") or {}
print(manifest)
print(summary.get("epoch"))
print(summary.get("startSlot"))
print(summary.get("endSlotExclusive"))
PY
)

SRC_MANIFEST="${INFO[0]}"
EPOCH="${INFO[1]}"
START_SLOT="${INFO[2]}"
END_SLOT_EXCLUSIVE="${INFO[3]}"

if [ ! -f "$SRC_MANIFEST" ]; then
  echo "[ERR] source manifest not found: $SRC_MANIFEST"
  exit 1
fi

echo "mode=$MODE"
echo "source_manifest=$SRC_MANIFEST"
echo "epoch=$EPOCH"
echo "window=[$START_SLOT,$END_SLOT_EXCLUSIVE)"

echo
echo "=== [2] stage single-manifest source dir ==="
cp -av "$SRC_MANIFEST" "$STAGE_DIR/"

echo
echo "=== [3] publish via canonical publisher ==="
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-publish-dir.sh" "$STAGE_DIR"

echo
echo "=== [4] done ==="
echo "mode=$MODE"
echo "stage_dir=$STAGE_DIR"
echo "selected_manifest=$SRC_MANIFEST"
