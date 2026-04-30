#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

OUT="${OUT:-/tmp/mainnet0-launch-readiness.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

run_step() {
  local name="$1"
  shift
  local safe
  safe="$(printf '%s' "$name" | tr ' /:' '---')"
  local log="$OUT/${safe}.log"

  echo
  echo "=== $name ==="
  ("$@") 2>&1 | tee "$log"
}

echo "out=$OUT"

echo
echo "=== [0] git truth ==="
git branch --show-current | tee "$OUT/git.branch.txt"
git rev-parse --short HEAD | tee "$OUT/git.head.txt"
git log --oneline --decorate -n 12 | tee "$OUT/git.log.txt"

run_step "[1] two-box mainnet0 state-change proof" \
  bash ops/two-box-mainnet0-state-change-proof.v2.sh

run_step "[2] validator admission sanity" \
  bash ops/void-mainnet0-validator-admission-sanity.sh

run_step "[3] mainnet0 policy stack sanity" \
  bash ops/void-mainnet0-policy-stack-sanity.sh

run_step "[4] bootstrap sanity" \
  bash ops/void-mainnet-bootstrap-sanity.sh

run_step "[5] restamp validator status" \
  bash ops/void-mainnet0-stamp-validator-status.sh

echo
echo "=== [6] compact validator artifact ==="
grep -nE '^(status|status_reason|last_known_head|last_known_drift|checkpoint_awareness_status|incident_response_readiness):' \
  ops/mainnet/validator-status.current.yaml | tee "$OUT/validator-status.compact.txt"

echo
echo "=== [7] runtime spot-check ==="
: > "$OUT/runtime-checks.txt"
for u in \
  "http://127.0.0.1:4100/head.txt" \
  "http://127.0.0.1:4100/__void/ready.json" \
  "http://127.0.0.1:4100/__void/agent/pillar4.summary.json"
do
  echo
  echo "===== $u ====="
  curl -fsS --max-time 10 "$u" | tee -a "$OUT/runtime-checks.txt"
  echo | tee -a "$OUT/runtime-checks.txt"
done

run_step "[8] mainnet0 update safety gate" \
  make mainnet0-update-safety-proof


python3 - "$OUT" <<'PY'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])
compact = Path("ops/mainnet/validator-status.current.yaml").read_text()
fields = {}
for key in [
    "status",
    "status_reason",
    "last_known_head",
    "last_known_drift",
    "checkpoint_awareness_status",
    "incident_response_readiness",
]:
    for line in compact.splitlines():
        if line.startswith(key + ":"):
            fields[key] = line.split(":", 1)[1].strip()
            break

summary = {
    "out_dir": str(out),
    "head": Path(out / "git.head.txt").read_text().strip() if (out / "git.head.txt").exists() else "",
    "validator": fields,
}
(out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
PY

echo
echo "[ok] mainnet0 launch-readiness runner passed"
echo "artifacts=$OUT"
