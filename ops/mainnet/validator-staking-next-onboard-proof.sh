#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
SECRETS="${SECRETS:-/mnt/key2/mainnet-keygen/20260418-023715/private/wallet-secrets.json}"
OUT_JSON="${OUT_JSON:-/tmp/validator-staking-next-onboard-proof.$(date +%Y%m%d-%H%M%S).json}"

echo "=== [1] run next-validator selector in dry-run mode ==="
TMP_OUT="$(mktemp)"
DRY_RUN=1 BASE="$BASE" SECRETS="$SECRETS" \
  "$HOME/dev/void-node/ops/mainnet/validator-staking-next-onboard-runbook.sh" | tee "$TMP_OUT"

echo
echo "=== [2] parse dry-run output and prove increment logic ==="
python3 - <<'PY' "$TMP_OUT" "$OUT_JSON"
import json, re, sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8")
out_json = Path(sys.argv[2])

def grab(name: str):
    m = re.search(rf'^{re.escape(name)}=(.+)$', text, flags=re.M)
    return m.group(1).strip() if m else None

candidate_name = grab("selected_candidate_name")
candidate_addr = grab("selected_candidate_addr")
current_epoch = grab("current_epoch")
target_epoch = grab("target_epoch")
current_validator_count = grab("current_validator_count")
expected_validator_count = grab("expected_validator_count")
used_rewards_json = grab("used_rewards_json")
command = grab("command")

if not all([candidate_name, candidate_addr, current_epoch, target_epoch, current_validator_count, expected_validator_count, used_rewards_json, command]):
    raise SystemExit("[ERR] missing expected fields in dry-run output")

used_rewards = json.loads(used_rewards_json)
report = {
    "ok": True,
    "selectedCandidateName": candidate_name,
    "selectedCandidateAddr": candidate_addr,
    "currentEpoch": int(current_epoch),
    "targetEpoch": int(target_epoch),
    "currentValidatorCount": int(current_validator_count),
    "expectedValidatorCount": int(expected_validator_count),
    "usedRewards": used_rewards,
    "command": command,
}

assert report["targetEpoch"] == report["currentEpoch"] + 1, report
assert report["expectedValidatorCount"] == report["currentValidatorCount"] + 1, report
assert candidate_name not in {"", "TBD"}, report
assert candidate_addr.lower() not in set(used_rewards), report
assert "validator-staking-upgrade-onboard-runbook.sh" in command, report

out_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
print(f"[ok] wrote {out_json}")
print("[ok] next-validator dry-run proof green")
PY

echo
echo "[ok] validator next-onboard proof green"
