#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
COMPARE_LATEST="${COMPARE_LATEST:-$HOME/dev/void-node/.runtime/validator_truth_compare/latest.json}"
UPGRADE2_GLOB="${UPGRADE2_GLOB:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/upgrade-track-validator2-*/import/epoch-000002.manifest.verified.json}"
STAGE_ROOT="${STAGE_ROOT:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/upgrade-epoch2-live}"
STAMP="$(date +%Y%m%d-%H%M%S)"
STAGE_DIR="$STAGE_ROOT/$STAMP"
OUT_JSON="${OUT_JSON:-/tmp/validator-staking-upgrade-epoch2-publish-proof.$STAMP.json}"

mkdir -p "$STAGE_DIR"

echo "=== [1] resolve source manifests ==="
readarray -t INFO < <(
python3 - <<'PY' "$COMPARE_LATEST" "$UPGRADE2_GLOB"
import glob, json, sys
from pathlib import Path

compare = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
epoch1 = str(compare["upgradeManifest"])

matches = sorted(glob.glob(sys.argv[2]))
if not matches:
    raise SystemExit("[ERR] no epoch-000002 verified upgrade manifest found")
epoch2 = matches[-1]

print(epoch1)
print(epoch2)
PY
)

EPOCH1_MANIFEST="${INFO[0]}"
EPOCH2_MANIFEST="${INFO[1]}"

echo "epoch1_manifest=$EPOCH1_MANIFEST"
echo "epoch2_manifest=$EPOCH2_MANIFEST"

test -f "$EPOCH1_MANIFEST"
test -f "$EPOCH2_MANIFEST"

echo
echo "=== [2] stage epoch1 + epoch2 upgrade manifests ==="
cp -av "$EPOCH1_MANIFEST" "$STAGE_DIR/"
cp -av "$EPOCH2_MANIFEST" "$STAGE_DIR/"

echo
echo "=== [3] publish staged dir via canonical publisher ==="
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-publish-dir.sh" "$STAGE_DIR"

echo
echo "=== [4] prove live runtime on epoch 2 ==="
python3 - <<'PY' "$BASE" "$OUT_JSON"
import json
import urllib.request
import sys

base = sys.argv[1].rstrip("/")
out_json = sys.argv[2]

def get_json(path: str):
    with urllib.request.urlopen(base + path) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

status = get_json("/__void/runtime/validator-truth/status")
epoch2 = get_json("/__void/runtime/validator-truth/epoch/2")
proposer0 = get_json("/__void/runtime/validator-truth/proposer/2/0")
window = get_json("/__void/runtime/validator-truth/window/2/0/8")
diag_all = get_json("/__void/runtime/validator-truth/diag/all")

assert status["ok"] is True, status
assert status["mode"] == "verified_epoch_manifests", status
assert status["latestEpoch"] == 2, status
assert status["loadedEpochs"] == [1, 2], status

summary = epoch2["summary"]
assert summary["epoch"] == 2, summary
assert summary["validatorCount"] == 2, summary
assert str(summary["totalPower"]) == "2000000000000000000000", summary
assert summary["published"] is True, summary
assert summary["publishedMatch"] is True, summary
assert summary["scheduleWindowLength"] == 8, summary

prop = proposer0["proposer"]
assert prop["epoch"] == 2, prop
assert prop["validatorCount"] == 2, prop
assert str(prop["totalPower"]) == "2000000000000000000000", prop
assert prop["published"] is True, prop
assert prop["publishedMatch"] is True, prop

rows = window["window"]
assert len(rows) == 8, rows
rewards = sorted({str(x["reward"]).lower() for x in rows})
assert len(rewards) == 2, rewards

assert diag_all["ok"] is True, diag_all
assert diag_all["latestEpoch"] == 2, diag_all
assert diag_all["shadowLatestOk"] is True, diag_all
assert diag_all["compareLatestOk"] is True, diag_all

report = {
    "ok": True,
    "status": {
        "loadedEpochs": status["loadedEpochs"],
        "latestEpoch": status["latestEpoch"],
        "sourceDir": status["sourceDir"],
    },
    "epoch2": summary,
    "proposer20": prop,
    "uniqueRewardsInWindow": rewards,
    "diagAll": {
        "latestEpoch": diag_all["latestEpoch"],
        "shadowLatestSummary": diag_all.get("shadowLatestSummary"),
        "compareLatestSummary": diag_all.get("compareLatestSummary"),
    },
}
with open(out_json, "w", encoding="utf-8") as f:
    f.write(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
print(f"[ok] wrote {out_json}")
PY

echo
echo "=== [5] refresh shadow latest for the current published dir ==="
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-shadow-run.sh" \
  "$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current"

echo
echo "=== [6] final summary ==="
python3 - <<'PY'
import json
from pathlib import Path

shadow = json.loads((Path.home() / "dev/void-node/.runtime/validator_runtime_truth_shadow/latest.json").read_text())
print(json.dumps({
  "shadow_ok": shadow.get("ok"),
  "dir": shadow.get("dir"),
  "loadedEpochsFromDisk": shadow.get("loadedEpochsFromDisk"),
  "mismatch_count": len(shadow.get("mismatches") or []),
  "checked_counts": {
    "epochs": len((shadow.get("checked") or {}).get("epochs") or []),
    "proposers": len((shadow.get("checked") or {}).get("proposers") or []),
    "windows": len((shadow.get("checked") or {}).get("windows") or []),
  }
}, indent=2))
PY

echo
echo "[ok] upgrade epoch2 publish/live proof green"
