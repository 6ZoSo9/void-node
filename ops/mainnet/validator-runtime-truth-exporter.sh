#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

DIAG_URL="${DIAG_URL:-http://127.0.0.1:4100/__void/runtime/validator-truth/diag/all}"
OUT_NAME="${OUT_NAME:-void_validator_runtime_truth.prom}"
TEXTFILE_DIR="${TEXTFILE_DIR:-}"

detect_textfile_dir() {
  if [ -n "${TEXTFILE_DIR:-}" ]; then
    printf '%s\n' "$TEXTFILE_DIR"
    return 0
  fi

  python3 - <<'PY'
import pathlib, re, subprocess, sys

try:
    out = subprocess.check_output(["ps", "-eo", "args"], text=True, errors="ignore")
    for line in out.splitlines():
        if "node_exporter" not in line:
            continue
        m = re.search(r"--collector\.textfile\.directory=([^ ]+)", line)
        if m:
            print(m.group(1))
            raise SystemExit(0)
except Exception:
    pass

for cand in [
    "/var/lib/node_exporter/textfile_collector",
    "/var/lib/node_exporter",
    "/var/lib/prometheus/node-exporter",
    "/var/lib/prometheus/node_exporter",
]:
    if pathlib.Path(cand).exists():
        print(cand)
        raise SystemExit(0)

raise SystemExit(1)
PY
}

TEXTFILE_DIR="$(detect_textfile_dir || true)"
if [ -z "$TEXTFILE_DIR" ]; then
  echo "[ERR] could not detect node_exporter textfile directory"
  exit 1
fi

OUT_PATH="$TEXTFILE_DIR/$OUT_NAME"
TMP_LOCAL="/tmp/${OUT_NAME}.$$"

echo "=== [1] render metrics from diag route ==="
python3 - "$DIAG_URL" "$TMP_LOCAL" <<'PY'
import json
import sys
import urllib.request

diag_url = sys.argv[1]
out_path = sys.argv[2]

with urllib.request.urlopen(diag_url) as r:
    diag = json.loads(r.read().decode("utf-8", "replace"))

status = diag.get("status") or {}
shadow = diag.get("shadow") or {}
summary = shadow.get("summary") or diag.get("shadowLatestSummary") or {}
compare = diag.get("compare") or {}
compare_summary = compare.get("summary") or diag.get("compareLatestSummary") or {}

def num(v):
    try:
        return int(v)
    except Exception:
        return 0

def esc(s):
    return str(s).replace("\\", "\\\\").replace('"', '\\"')

lines = []
lines.append("# HELP void_validator_runtime_truth_diag_ok Validator runtime truth diag route overall status.")
lines.append("# TYPE void_validator_runtime_truth_diag_ok gauge")
lines.append(f"void_validator_runtime_truth_diag_ok {1 if diag.get('ok') else 0}")

lines.append("# HELP void_validator_runtime_truth_info Validator runtime truth mode info.")
lines.append("# TYPE void_validator_runtime_truth_info gauge")
lines.append(
    'void_validator_runtime_truth_info{configured_mode="%s",mode="%s"} 1'
    % (esc(diag.get("configuredMode", "")), esc(diag.get("mode", "")))
)

lines.append("# HELP void_validator_runtime_truth_lookups_available Whether runtime truth lookups are available.")
lines.append("# TYPE void_validator_runtime_truth_lookups_available gauge")
lines.append(f"void_validator_runtime_truth_lookups_available {1 if diag.get('lookupsAvailable') else 0}")

lines.append("# HELP void_validator_runtime_truth_loaded_epochs_count Count of loaded validator truth epochs.")
lines.append("# TYPE void_validator_runtime_truth_loaded_epochs_count gauge")
lines.append(f"void_validator_runtime_truth_loaded_epochs_count {len(diag.get('loadedEpochs') or [])}")

lines.append("# HELP void_validator_runtime_truth_latest_epoch Latest loaded validator truth epoch.")
lines.append("# TYPE void_validator_runtime_truth_latest_epoch gauge")
latest_epoch = diag.get("latestEpoch")
lines.append(f"void_validator_runtime_truth_latest_epoch {num(latest_epoch)}")

lines.append("# HELP void_validator_runtime_truth_shadow_latest_ok Whether the shadow latest report was read successfully.")
lines.append("# TYPE void_validator_runtime_truth_shadow_latest_ok gauge")
lines.append(f"void_validator_runtime_truth_shadow_latest_ok {1 if diag.get('shadowLatestOk') else 0}")

lines.append("# HELP void_validator_runtime_truth_shadow_report_ok Whether the shadow comparison report itself is OK.")
lines.append("# TYPE void_validator_runtime_truth_shadow_report_ok gauge")
lines.append(f"void_validator_runtime_truth_shadow_report_ok {1 if summary.get('ok') else 0}")

lines.append("# HELP void_validator_runtime_truth_shadow_mismatch_count Shadow compare mismatch count.")
lines.append("# TYPE void_validator_runtime_truth_shadow_mismatch_count gauge")
lines.append(f"void_validator_runtime_truth_shadow_mismatch_count {num(summary.get('mismatchCount'))}")

checked = summary.get("checkedCounts") or {}
lines.append("# HELP void_validator_runtime_truth_shadow_checked_epochs Count of epoch endpoints checked by shadow compare.")
lines.append("# TYPE void_validator_runtime_truth_shadow_checked_epochs gauge")
lines.append(f"void_validator_runtime_truth_shadow_checked_epochs {num(checked.get('epochs'))}")

lines.append("# HELP void_validator_runtime_truth_shadow_checked_proposers Count of proposer endpoints checked by shadow compare.")
lines.append("# TYPE void_validator_runtime_truth_shadow_checked_proposers gauge")
lines.append(f"void_validator_runtime_truth_shadow_checked_proposers {num(checked.get('proposers'))}")

lines.append("# HELP void_validator_runtime_truth_shadow_checked_windows Count of window endpoints checked by shadow compare.")
lines.append("# TYPE void_validator_runtime_truth_shadow_checked_windows gauge")
lines.append(f"void_validator_runtime_truth_shadow_checked_windows {num(checked.get('windows'))}")

lines.append("# HELP void_validator_runtime_truth_compare_latest_ok Whether the frozen-vs-upgrade latest report was read successfully.")
lines.append("# TYPE void_validator_runtime_truth_compare_latest_ok gauge")
lines.append(f"void_validator_runtime_truth_compare_latest_ok {1 if diag.get('compareLatestOk') else 0}")

lines.append("# HELP void_validator_runtime_truth_compare_report_ok Whether the frozen-vs-upgrade compare report core truth is OK.")
lines.append("# TYPE void_validator_runtime_truth_compare_report_ok gauge")
lines.append(f"void_validator_runtime_truth_compare_report_ok {1 if compare_summary.get('ok') else 0}")

lines.append("# HELP void_validator_runtime_truth_compare_core_mismatch_count Frozen-vs-upgrade core mismatch count.")
lines.append("# TYPE void_validator_runtime_truth_compare_core_mismatch_count gauge")
lines.append(f"void_validator_runtime_truth_compare_core_mismatch_count {num(compare_summary.get('coreMismatchCount'))}")

lines.append("# HELP void_validator_runtime_truth_compare_expected_difference_count Frozen-vs-upgrade expected difference count.")
lines.append("# TYPE void_validator_runtime_truth_compare_expected_difference_count gauge")
lines.append(f"void_validator_runtime_truth_compare_expected_difference_count {num(compare_summary.get('expectedDifferenceCount'))}")

compare_core = compare_summary.get("coreSummary") or {}
lines.append("# HELP void_validator_runtime_truth_compare_epoch Latest compared epoch for frozen-vs-upgrade truth.")
lines.append("# TYPE void_validator_runtime_truth_compare_epoch gauge")
lines.append(f"void_validator_runtime_truth_compare_epoch {num(compare_core.get('epoch'))}")

lines.append("# HELP void_validator_runtime_truth_compare_schedule_window_length Latest compared schedule window length.")
lines.append("# TYPE void_validator_runtime_truth_compare_schedule_window_length gauge")
lines.append(f"void_validator_runtime_truth_compare_schedule_window_length {num(compare_core.get('scheduleWindowLength'))}")

with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")

print(f"[ok] wrote {out_path}")
PY

echo
echo "=== [2] install metrics file into node_exporter textfile dir ==="
echo "textfile_dir=$TEXTFILE_DIR"
echo "out_path=$OUT_PATH"

if [ -w "$TEXTFILE_DIR" ]; then
  mv -f "$TMP_LOCAL" "$OUT_PATH"
elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  sudo install -d "$TEXTFILE_DIR"
  sudo mv -f "$TMP_LOCAL" "$OUT_PATH"
else
  rm -f "$TMP_LOCAL"
  echo "[ERR] textfile dir is not writable: $TEXTFILE_DIR"
  echo "[ERR] rerun with sudo or set TEXTFILE_DIR to a writable node_exporter collector dir"
  exit 1
fi

echo "[ok] installed $OUT_PATH"
