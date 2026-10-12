#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

CONF="${CONF:-$HOME/dev/void-node/ops/mainnet/void-mainnet.deployed.json}"
UPGRADE_ARTIFACT="${UPGRADE_ARTIFACT:-$HOME/dev/void-node/ops/mainnet/validator-truth-upgrade-track.deployed.json}"
EPOCH="${EPOCH:-1}"
START_SLOT="${START_SLOT:-0}"
END_SLOT_EXCLUSIVE="${END_SLOT_EXCLUSIVE:-8}"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_ROOT="${OUT_ROOT:-$HOME/dev/void-node/.runtime/validator_truth_compare}"
RUN_DIR="$OUT_ROOT/history/frozen-vs-upgrade-$STAMP"
FROZEN_DIR="$RUN_DIR/frozen"
UPGRADE_EXPORT_DIR="$RUN_DIR/upgrade-export"
UPGRADE_IMPORT_DIR="$RUN_DIR/upgrade-import"
REPORT_JSON="$RUN_DIR/report.json"
LATEST_JSON="$OUT_ROOT/latest.json"

mkdir -p "$FROZEN_DIR" "$UPGRADE_EXPORT_DIR" "$UPGRADE_IMPORT_DIR" "$OUT_ROOT/history"

echo "=== [1] export frozen-mainnet0 verified manifest ==="
FROZEN_JSON="$FROZEN_DIR/epoch-$(printf '%06d' "$EPOCH").manifest.verified.json"
DEPLOYED_JSON="$CONF" \
EPOCH="$EPOCH" \
START_SLOT="$START_SLOT" \
END_SLOT_EXCLUSIVE="$END_SLOT_EXCLUSIVE" \
OUT_JSON="$FROZEN_JSON" \
"$HOME/dev/void-node/ops/mainnet/export_validator_epoch_manifest_json_frozen_mainnet0.py"

echo
echo "=== [2] export upgrade-track manifest + verify/import ==="
readarray -t UPG < <(
python3 - <<'PY' "$UPGRADE_ARTIFACT"
import json, sys
j = json.load(open(sys.argv[1], "r", encoding="utf-8"))
print(j["rpcUrl"])
print(j["contracts"]["manifestView"])
print(j["contracts"]["scheduleView"])
PY
)
RPC_URL="${UPG[0]}"
MANIFEST_VIEW_ADDR="${UPG[1]}"
SCHEDULE_VIEW_ADDR="${UPG[2]}"

UPGRADE_RAW="$UPGRADE_EXPORT_DIR/epoch-$(printf '%06d' "$EPOCH").manifest.json"
RPC_URL="$RPC_URL" \
MANIFEST_VIEW_ADDR="$MANIFEST_VIEW_ADDR" \
SCHEDULE_VIEW_ADDR="$SCHEDULE_VIEW_ADDR" \
EPOCH="$EPOCH" \
START_SLOT="$START_SLOT" \
END_SLOT_EXCLUSIVE="$END_SLOT_EXCLUSIVE" \
OUT_JSON="$UPGRADE_RAW" \
python3 "$HOME/dev/void-node/ops/mainnet/export_validator_epoch_manifest_json.py"

VERIFY_RPC_URL="$RPC_URL" \
IMPORT_DIR="$UPGRADE_IMPORT_DIR" \
python3 "$HOME/dev/void-node/ops/mainnet/verify_import_validator_epoch_manifest_json.py" "$UPGRADE_RAW"

UPGRADE_VERIFIED="$UPGRADE_IMPORT_DIR/epoch-$(printf '%06d' "$EPOCH").manifest.verified.json"

echo
echo "=== [3] compare core truth ==="
python3 - <<'PY' "$FROZEN_JSON" "$UPGRADE_VERIFIED" "$REPORT_JSON"
import json, sys
from pathlib import Path

frozen_path = Path(sys.argv[1])
upgrade_path = Path(sys.argv[2])
report_path = Path(sys.argv[3])

f = json.loads(frozen_path.read_text())
u = json.loads(upgrade_path.read_text())

report = {
    "ok": True,
    "compareMode": "frozen_mainnet0_vs_upgrade_track",
    "frozenManifest": str(frozen_path),
    "upgradeManifest": str(upgrade_path),
    "coreMismatches": [],
    "expectedDifferences": [],
    "coreSummary": {},
}

def norm_addr(v):
    if not isinstance(v, str):
        return v
    v = v.strip()
    if v.startswith("0x") or v.startswith("0X"):
        return "0x" + v[2:].lower()
    return v

def mismatch(field, expected, got):
    report["ok"] = False
    report["coreMismatches"].append({
        "field": field,
        "frozen": expected,
        "upgrade": got,
    })

core_fields = [
    "epoch",
    "requestedStartSlot",
    "requestedEndSlotExclusive",
    "validatorCount",
    "totalPower",
]

for field in core_fields:
    if f.get(field) != u.get(field):
        mismatch(field, f.get(field), u.get(field))

fsw = f.get("scheduleWindow") or []
usw = u.get("scheduleWindow") or []

if len(fsw) != len(usw):
    mismatch("scheduleWindow.length", len(fsw), len(usw))

for i, (fr, ur) in enumerate(zip(fsw, usw)):
    for field in ["slot", "reward", "effectivePower"]:
        fv = fr.get(field)
        uv = ur.get(field)
        if field == "reward":
            if norm_addr(fv) != norm_addr(uv):
                mismatch(f"scheduleWindow[{i}].{field}", fv, uv)
        else:
            if fv != uv:
                mismatch(f"scheduleWindow[{i}].{field}", fv, uv)

for field in ["published", "publishedMatch"]:
    if f.get(field) != u.get(field):
        report["expectedDifferences"].append({
            "field": field,
            "frozen": f.get(field),
            "upgrade": u.get(field),
            "reason": "upgrade-track commitment registry publishes epoch/window commitments while frozen-mainnet0 bridge does not",
        })

for field in [
    "validatorSetCommitment",
    "scheduleWindowCommitment",
    "epochWindowCommitment",
    "publishedValidatorSetCommitment",
    "publishedScheduleWindowCommitment",
    "publishedEpochWindowCommitment",
]:
    if f.get(field) != u.get(field):
        report["expectedDifferences"].append({
            "field": field,
            "frozen": f.get(field),
            "upgrade": u.get(field),
            "reason": "commitments are expected to differ across the bridge exporter and upgrade-track on-chain stack",
        })

report["coreSummary"] = {
    "epoch": f.get("epoch"),
    "startSlot": f.get("requestedStartSlot"),
    "endSlotExclusive": f.get("requestedEndSlotExclusive"),
    "validatorCount": f.get("validatorCount"),
    "totalPower": f.get("totalPower"),
    "scheduleWindowLength": len(fsw),
    "reward0": (norm_addr(fsw[0].get("reward")) if fsw else None),
    "effectivePower0": (fsw[0].get("effectivePower") if fsw else None),
    "frozenPublished": f.get("published"),
    "upgradePublished": u.get("published"),
    "frozenPublishedMatch": f.get("publishedMatch"),
    "upgradePublishedMatch": u.get("publishedMatch"),
}

report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report["coreSummary"], indent=2))
print(f"[ok] report={report_path}")
print(f"[ok] core_ok={report['ok']}")
print(f"[ok] core_mismatch_count={len(report['coreMismatches'])}")
print(f"[ok] expected_difference_count={len(report['expectedDifferences'])}")
if not report["ok"]:
    print("--- core mismatches ---")
    for item in report["coreMismatches"]:
        print(json.dumps(item, sort_keys=True))
    raise SystemExit(1)
PY

echo
echo "=== [4] publish stable latest ==="
cp -f "$REPORT_JSON" "$LATEST_JSON"
echo "report_json=$REPORT_JSON"
echo "latest_json=$LATEST_JSON"

echo
echo "=== [5] latest summary ==="
python3 - <<'PY' "$LATEST_JSON"
import json, sys
j = json.load(open(sys.argv[1], "r", encoding="utf-8"))
print(json.dumps({
  "ok": j.get("ok"),
  "compareMode": j.get("compareMode"),
  "frozenManifest": j.get("frozenManifest"),
  "upgradeManifest": j.get("upgradeManifest"),
  "core_mismatch_count": len(j.get("coreMismatches") or []),
  "expected_difference_count": len(j.get("expectedDifferences") or []),
  "coreSummary": j.get("coreSummary"),
}, indent=2))
PY

echo
echo "[ok] frozen-vs-upgrade compare lane green"
