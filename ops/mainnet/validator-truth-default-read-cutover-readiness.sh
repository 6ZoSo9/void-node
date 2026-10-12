#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
COMPARE_LATEST="${COMPARE_LATEST:-$HOME/dev/void-node/.runtime/validator_truth_compare/latest.json}"
SHADOW_LATEST="${SHADOW_LATEST:-$HOME/dev/void-node/.runtime/validator_runtime_truth_shadow/latest.json}"
VERIFIED_CURRENT="${VERIFIED_CURRENT:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current}"
OUT_JSON="${OUT_JSON:-/tmp/validator-truth-default-read-cutover-readiness.$(date +%Y%m%d-%H%M%S).json}"

python3 - <<'PY' "$BASE" "$COMPARE_LATEST" "$SHADOW_LATEST" "$VERIFIED_CURRENT" "$OUT_JSON"
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

base, compare_path_s, shadow_path_s, verified_current_s, out_json_s = sys.argv[1:6]
compare_path = Path(compare_path_s)
shadow_path = Path(shadow_path_s)
verified_current = Path(verified_current_s)
out_json = Path(out_json_s)

def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

def get_json(url: str):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

compare = load_json(compare_path)
shadow = load_json(shadow_path)
diag_all = get_json(base.rstrip("/") + "/__void/runtime/validator-truth/diag/all")

core = compare.get("coreSummary") or {}
epoch = int(core.get("epoch") or 0)
epoch_name = f"epoch-{epoch:06d}.manifest.verified.json"
current_manifest = verified_current / epoch_name

current_source = "unknown"
current_manifest_sha256 = None
frozen_manifest = Path(compare["frozenManifest"])
upgrade_manifest = Path(compare["upgradeManifest"])

if current_manifest.exists():
    current_manifest_sha256 = sha256_file(current_manifest)
    frozen_sha = sha256_file(frozen_manifest)
    upgrade_sha = sha256_file(upgrade_manifest)
    if current_manifest_sha256 == frozen_sha:
        current_source = "frozen"
    elif current_manifest_sha256 == upgrade_sha:
        current_source = "upgrade"

compare_summary = diag_all.get("compareLatestSummary") or {}
shadow_summary = diag_all.get("shadowLatestSummary") or {}

eligible_for_upgrade_default = all([
    bool(diag_all.get("ok")),
    bool(compare_summary.get("ok")),
    bool(shadow_summary.get("ok")),
    int(compare_summary.get("coreMismatchCount") or 0) == 0,
    int(shadow_summary.get("mismatchCount") or 0) == 0,
    current_source in ("frozen", "upgrade"),
])

report = {
    "ok": True,
    "base": base,
    "policyVersion": 1,
    "compareLatestPath": str(compare_path),
    "shadowLatestPath": str(shadow_path),
    "verifiedCurrent": str(verified_current),
    "currentSource": current_source,
    "currentManifest": str(current_manifest),
    "currentManifestExists": current_manifest.exists(),
    "currentManifestSha256": current_manifest_sha256,
    "loadedEpochs": diag_all.get("loadedEpochs"),
    "latestEpoch": diag_all.get("latestEpoch"),
    "compareLatestSummary": compare_summary,
    "shadowLatestSummary": shadow_summary,
    "eligibleForUpgradeDefault": eligible_for_upgrade_default,
    "recommendedDefaultSource": ("upgrade" if eligible_for_upgrade_default else "hold"),
    "upgradeDefaultLive": bool(eligible_for_upgrade_default and current_source == "upgrade"),
    "rollbackReady": bool(compare_summary.get("coreMismatchCount") == 0 and shadow_summary.get("mismatchCount") == 0),
}

out_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

print("=== [readiness summary] ===")
print(f"out_json={out_json}")
print(f"current_source={report['currentSource']}")
print(f"eligible_for_upgrade_default={report['eligibleForUpgradeDefault']}")
print(f"recommended_default_source={report['recommendedDefaultSource']}")
print(f"upgrade_default_live={report['upgradeDefaultLive']}")
print(f"latest_epoch={report['latestEpoch']}")
print(f"compare_core_mismatch_count={int(compare_summary.get('coreMismatchCount') or 0)}")
print(f"shadow_mismatch_count={int(shadow_summary.get('mismatchCount') or 0)}")
print(f"compare_expected_difference_count={int(compare_summary.get('expectedDifferenceCount') or 0)}")

if not eligible_for_upgrade_default:
    raise SystemExit("[ERR] upgrade default-read cutover is not currently eligible")
PY
