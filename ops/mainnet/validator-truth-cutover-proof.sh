#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
COMPARE_LATEST="${COMPARE_LATEST:-$HOME/dev/void-node/.runtime/validator_truth_compare/latest.json}"
OUT_JSON="${OUT_JSON:-/tmp/validator-truth-cutover-proof.$(date +%Y%m%d-%H%M%S).json}"

readarray -t INFO < <(
python3 - <<'PY' "$COMPARE_LATEST"
import json, sys
j = json.loads(open(sys.argv[1], "r", encoding="utf-8").read())
summary = j.get("coreSummary") or {}
print(summary.get("epoch"))
print(summary.get("startSlot"))
print(summary.get("endSlotExclusive"))
PY
)

EPOCH="${INFO[0]}"
START_SLOT="${INFO[1]}"
END_SLOT_EXCLUSIVE="${INFO[2]}"

if [ -z "$EPOCH" ] || [ -z "$START_SLOT" ] || [ -z "$END_SLOT_EXCLUSIVE" ]; then
  echo "[ERR] could not read compare-latest core summary"
  exit 1
fi

run_phase() {
  local mode="$1"

  echo
  echo "=== [phase:$mode] cutover switch ==="
  "$HOME/dev/void-node/ops/mainnet/validator-truth-cutover-switch.sh" "$mode"

  echo
  echo "=== [phase:$mode] live proof ==="
  "$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-live-proof.sh" \
    "$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current"

  echo
  echo "=== [phase:$mode] diag/all assertions ==="
  python3 - <<'PY' "$BASE" "$mode"
import json, sys, urllib.request

base, mode = sys.argv[1:3]
with urllib.request.urlopen(base + "/__void/runtime/validator-truth/diag/all") as r:
    diag = json.loads(r.read().decode("utf-8", "replace"))

assert diag["ok"] is True, diag
assert diag["mode"] == "verified_epoch_manifests", diag
assert diag["shadowLatestOk"] is True, diag
assert diag["compareLatestOk"] is True, diag
assert diag["shadowLatestSummary"]["mismatchCount"] == 0, diag
assert diag["compareLatestSummary"]["coreMismatchCount"] == 0, diag

summary = {
    "phase": mode,
    "loadedEpochs": diag.get("loadedEpochs"),
    "latestEpoch": diag.get("latestEpoch"),
    "shadowMismatchCount": (diag.get("shadowLatestSummary") or {}).get("mismatchCount"),
    "compareCoreMismatchCount": (diag.get("compareLatestSummary") or {}).get("coreMismatchCount"),
    "compareExpectedDifferenceCount": (diag.get("compareLatestSummary") or {}).get("expectedDifferenceCount"),
}
print(json.dumps(summary, indent=2))
PY
}

echo "=== [1] rollback proof: frozen -> upgrade ==="
run_phase frozen
run_phase upgrade

echo
echo "=== [2] write summary artifact ==="
python3 - <<'PY' "$BASE" "$OUT_JSON"
import json, sys, urllib.request
base, out_json = sys.argv[1:3]
with urllib.request.urlopen(base + "/__void/runtime/validator-truth/diag/all") as r:
    diag = json.loads(r.read().decode("utf-8", "replace"))
report = {
    "ok": True,
    "base": base,
    "finalMode": diag.get("mode"),
    "loadedEpochs": diag.get("loadedEpochs"),
    "latestEpoch": diag.get("latestEpoch"),
    "shadowLatestSummary": diag.get("shadowLatestSummary"),
    "compareLatestSummary": diag.get("compareLatestSummary"),
}
with open(out_json, "w", encoding="utf-8") as f:
    f.write(json.dumps(report, indent=2) + "\n")
print(f"[ok] wrote {out_json}")
print(json.dumps(report, indent=2))
PY

echo
echo "[ok] cutover + rollback proof green"
