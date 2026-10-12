#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
COMPARE_LATEST="${COMPARE_LATEST:-$HOME/dev/void-node/.runtime/validator_truth_compare/latest.json}"

CANDIDATE_NAME="${CANDIDATE_NAME:-vault03}"
TARGET_EPOCH="${TARGET_EPOCH:-4}"
EXPECTED_VALIDATOR_COUNT="${EXPECTED_VALIDATOR_COUNT:-4}"

PREV_EPOCH="$((TARGET_EPOCH - 1))"
PREV_COUNT="$((EXPECTED_VALIDATOR_COUNT - 1))"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${OUT_DIR:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/upgrade-track-${CANDIDATE_NAME}-${STAMP}}"
LIVE_STAGE="${LIVE_STAGE:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/upgrade-live-${CANDIDATE_NAME}-${STAMP}}"
REPORT_JSON="${REPORT_JSON:-/tmp/validator-staking-upgrade-onboard-runbook.${STAMP}.json}"

mkdir -p "$LIVE_STAGE"

echo "=== [1] preflight previous-state gates ==="
TARGET_EPOCH="$PREV_EPOCH" EXPECTED_VALIDATOR_COUNT="$PREV_COUNT" \
  "$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-multivalidator-readiness.sh"

TARGET_EPOCH="$PREV_EPOCH" EXPECTED_VALIDATOR_COUNT="$PREV_COUNT" \
  "$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-onboarding-runbook-gate.sh"

echo
echo "=== [2] run generic onboarding proof ==="
CANDIDATE_NAME="$CANDIDATE_NAME" \
TARGET_EPOCH="$TARGET_EPOCH" \
EXPECTED_VALIDATOR_COUNT="$EXPECTED_VALIDATOR_COUNT" \
OUT_DIR="$OUT_DIR" \
"$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-onboard-proof.sh"

echo
echo "=== [3] resolve manifests epoch1..target ==="
readarray -t MANIFESTS < <(
python3 - <<'PY' "$OUT_DIR" "$TARGET_EPOCH"
import sys
from pathlib import Path

out_dir, target_epoch_s = sys.argv[1:3]
target_epoch = int(target_epoch_s)
current = Path.home() / "dev/void-node/.runtime/validator_epoch_manifests/verified-current"

for epoch in range(1, target_epoch):
    p = current / f"epoch-{epoch:06d}.manifest.verified.json"
    if not p.exists():
        raise SystemExit(f"[ERR] missing current verified manifest for epoch {epoch}: {p}")
    print(str(p))

p = Path(out_dir) / "import" / f"epoch-{target_epoch:06d}.manifest.verified.json"
if not p.exists():
    raise SystemExit(f"[ERR] missing target epoch manifest: {p}")
print(str(p))
PY
)

echo "--- resolved manifests"
printf '%s\n' "${MANIFESTS[@]}"

echo
echo "=== [4] stage manifests for live publish ==="
for f in "${MANIFESTS[@]}"; do
  cp -av "$f" "$LIVE_STAGE/"
done

echo
echo "=== [5] publish live manifests via canonical publisher ==="
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-publish-dir.sh" "$LIVE_STAGE"

echo
echo "=== [6] refresh shadow latest ==="
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-shadow-run.sh" \
  "$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current"

echo
echo "=== [7] rerun parameterized gates for target epoch/count ==="
TARGET_EPOCH="$TARGET_EPOCH" EXPECTED_VALIDATOR_COUNT="$EXPECTED_VALIDATOR_COUNT" \
  "$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-multivalidator-readiness.sh"

TARGET_EPOCH="$TARGET_EPOCH" EXPECTED_VALIDATOR_COUNT="$EXPECTED_VALIDATOR_COUNT" \
  "$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-onboarding-runbook-gate.sh"

echo
echo "=== [8] write final report artifact ==="
python3 - <<'PY' "$BASE" "$REPORT_JSON" "$CANDIDATE_NAME" "$TARGET_EPOCH" "$EXPECTED_VALIDATOR_COUNT" "$OUT_DIR"
import json
import urllib.request
import sys
from pathlib import Path

base, report_json, candidate_name, target_epoch_s, expected_count_s, out_dir = sys.argv[1:7]
target_epoch = int(target_epoch_s)
expected_count = int(expected_count_s)

def get_json(path: str):
    with urllib.request.urlopen(base.rstrip("/") + path) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

status = get_json("/__void/runtime/validator-truth/status")
epochN = get_json(f"/__void/runtime/validator-truth/epoch/{target_epoch}")
proposerN0 = get_json(f"/__void/runtime/validator-truth/proposer/{target_epoch}/0")
windowN = get_json(f"/__void/runtime/validator-truth/window/{target_epoch}/0/8")
diag_all = get_json("/__void/runtime/validator-truth/diag/all")

rows = windowN.get("window") or []
unique_rewards = sorted({str(x.get("reward","")).lower() for x in rows if isinstance(x, dict) and x.get("reward")})

report = {
    "ok": True,
    "candidateName": candidate_name,
    "targetEpoch": target_epoch,
    "expectedValidatorCount": expected_count,
    "outDir": out_dir,
    "status": {
        "loadedEpochs": status.get("loadedEpochs"),
        "latestEpoch": status.get("latestEpoch"),
        "sourceDir": status.get("sourceDir"),
    },
    "epochSummary": epochN.get("summary"),
    "proposer0": proposerN0.get("proposer"),
    "uniqueRewardsInWindow": unique_rewards,
    "diagAll": {
        "latestEpoch": diag_all.get("latestEpoch"),
        "shadowLatestSummary": diag_all.get("shadowLatestSummary"),
        "compareLatestSummary": diag_all.get("compareLatestSummary"),
    },
}

Path(report_json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
print(f"[ok] wrote {report_json}")

summary = epochN.get("summary") or {}
assert status.get("loadedEpochs") == list(range(1, target_epoch + 1)), status
assert status.get("latestEpoch") == target_epoch, status
assert summary.get("validatorCount") == expected_count, summary
assert summary.get("published") is True, summary
assert summary.get("publishedMatch") is True, summary
assert len(unique_rewards) >= 2, unique_rewards
PY

echo
echo "[ok] validator onboarding operator runbook green"
echo "report_json=$REPORT_JSON"
