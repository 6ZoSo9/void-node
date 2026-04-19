#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

TEXTFILE_DIR="${TEXTFILE_DIR:-}"
DIAG_URL="${DIAG_URL:-http://127.0.0.1:4100/__void/runtime/validator-truth/diag}"

"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-exporter.sh"

python3 - <<'PY'
import urllib.request

url = "http://127.0.0.1:9100/metrics"
with urllib.request.urlopen(url) as r:
    body = r.read().decode("utf-8", "replace")

keys = [
    "void_validator_runtime_truth_diag_ok",
    "void_validator_runtime_truth_info",
    "void_validator_runtime_truth_lookups_available",
    "void_validator_runtime_truth_loaded_epochs_count",
    "void_validator_runtime_truth_latest_epoch",
    "void_validator_runtime_truth_shadow_latest_ok",
    "void_validator_runtime_truth_shadow_report_ok",
    "void_validator_runtime_truth_shadow_mismatch_count",
    "void_validator_runtime_truth_shadow_checked_epochs",
    "void_validator_runtime_truth_shadow_checked_proposers",
    "void_validator_runtime_truth_shadow_checked_windows",
]

hits = []
for line in body.splitlines():
    if any(k in line for k in keys):
        hits.append(line)

print("=== [metrics hits] ===")
for line in hits:
    print(line)

required = {
    "void_validator_runtime_truth_diag_ok 1",
    "void_validator_runtime_truth_shadow_latest_ok 1",
    "void_validator_runtime_truth_shadow_report_ok 1",
    "void_validator_runtime_truth_shadow_mismatch_count 0",
}
missing = [x for x in required if x not in hits]
if missing:
    raise SystemExit(f"[ERR] missing required metrics lines: {missing}")

print("[ok] exporter proof green")
PY
