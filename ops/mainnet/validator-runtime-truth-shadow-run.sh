#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

DIR="${1:-${DIR:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current}}"
BASE="${BASE:-http://127.0.0.1:4100}"
OUT_ROOT="${OUT_ROOT:-$HOME/dev/void-node/.runtime/validator_runtime_truth_shadow}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_JSON="$OUT_ROOT/history/validator-runtime-truth-shadow-compare.${STAMP}.json"
LATEST_JSON="$OUT_ROOT/latest.json"

mkdir -p "$OUT_ROOT/history"

echo "=== [1] run shadow compare ==="
OUT_JSON="$OUT_JSON" \
  "$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-shadow-compare.sh" "$DIR"

echo
echo "=== [2] publish stable latest ==="
cp -f "$OUT_JSON" "$LATEST_JSON"
echo "out_json=$OUT_JSON"
echo "latest_json=$LATEST_JSON"

echo
echo "=== [3] latest summary ==="
python3 - <<'PY' "$LATEST_JSON"
import json, sys
j = json.load(open(sys.argv[1]))
print(json.dumps({
  "ok": j.get("ok"),
  "dir": j.get("dir"),
  "base": j.get("base"),
  "loadedEpochsFromDisk": j.get("loadedEpochsFromDisk"),
  "mismatch_count": len(j.get("mismatches") or []),
  "checked_counts": {
    "epochs": len((j.get("checked") or {}).get("epochs") or []),
    "proposers": len((j.get("checked") or {}).get("proposers") or []),
    "windows": len((j.get("checked") or {}).get("windows") or []),
  }
}, indent=2))
PY

echo
echo "[ok] validator runtime truth shadow latest published"
