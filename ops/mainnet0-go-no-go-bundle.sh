#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

TS="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/mainnet0-go-no-go-bundle.$TS}"
LAUNCH_OUT="$OUT/launch_readiness"
mkdir -p "$OUT"/{meta,validator,bootstrap,runtime,docs}

echo "out=$OUT"

run_step() {
  local name="$1"
  shift
  local safe
  safe="$(printf '%s' "$name" | tr ' /:' '---')"
  local log="$OUT/meta/${safe}.log"
  echo
  echo "=== $name ==="
  ("$@") 2>&1 | tee "$log"
}

echo
echo "=== [0] git truth ==="
git branch --show-current | tee "$OUT/meta/git.branch.txt"
git rev-parse --short HEAD | tee "$OUT/meta/git.head.txt"
git rev-parse HEAD | tee "$OUT/meta/git.head.full.txt"
git log --oneline --decorate -n 20 | tee "$OUT/meta/git.log.txt"
git status --short | tee "$OUT/meta/git.status.txt"

echo
echo "=== [1] prelaunch safety hard-stop gate ==="
run_step "[1] prelaunch safety hard-stop gate" \
  make mainnet0-prelaunch-safety-proof

echo
echo "=== [2] run launch-readiness runner ==="
OUT="$LAUNCH_OUT" bash ops/mainnet0-launch-readiness.sh | tee "$OUT/meta.launch-readiness.stdout.log"

echo
echo "=== [2] capture validator + bootstrap artifacts ==="
cp -a ops/mainnet/validator-status.current.yaml "$OUT/validator/"
cp -a ops/mainnet/validator-status.template.yaml "$OUT/validator/"
cp -a ops/mainnet/canonical-incident-bundle.template.yaml "$OUT/validator/"
cp -a ops/mainnet/void-mainnet.live.json "$OUT/bootstrap/"

run_step "[2b] live-json guard" \
  bash ops/void-mainnet-livejson-guard.sh ops/mainnet/void-mainnet.live.json

run_step "[2c] bootstrap sanity" \
  bash ops/void-mainnet-bootstrap-sanity.sh

echo
echo "=== [3] capture operator docs ==="
for f in \
  docs/MAINNET0_VALIDATOR_ADMISSION_RUNBOOK.md \
  docs/MAINNET0_VALIDATOR_ADMISSION_CHECKLIST.md \
  docs/MAINNET0_OPERATOR_INCIDENT_BUNDLE.md \
  docs/MAINNET0_VALIDATOR_FORK_POLICY.md \
  docs/MAINNET0_CHECKPOINT_FINALITY_POLICY.md \
  docs/MAINNET0_INCIDENT_BAD_BLOCK_POLICY.md \
  docs/MAINNET0_REORG_SEVERITY_THRESHOLDS.md
do
  [ -f "$f" ] && cp -a "$f" "$OUT/docs/"
done

echo
echo "=== [4] runtime spot-check ==="
: > "$OUT/runtime/runtime-checks.txt"
for u in \
  "http://127.0.0.1:4100/health" \
  "http://127.0.0.1:4100/head.txt" \
  "http://127.0.0.1:4100/__void/ready.json" \
  "http://127.0.0.1:4100/__void/agent/pillar4.summary.json" \
  "http://127.0.0.1:4100/__void/peer-main-status.json"
do
  echo
  echo "===== $u ====="
  {
    echo "URL=$u"
    curl -fsS --max-time 10 "$u"
    echo
  } | tee -a "$OUT/runtime/runtime-checks.txt"
done

python3 - "$OUT" <<'PY'
import hashlib, json, sys
from pathlib import Path

out = Path(sys.argv[1])

def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        while True:
            b = f.read(1024 * 1024)
            if not b:
                break
            h.update(b)
    return h.hexdigest()

validator_file = Path("ops/mainnet/validator-status.current.yaml")
live_json = Path("ops/mainnet/void-mainnet.live.json")
git_head = (out / "meta" / "git.head.txt").read_text().strip()
git_branch = (out / "meta" / "git.branch.txt").read_text().strip()

validator = {}
for line in validator_file.read_text().splitlines():
    for key in [
        "status",
        "status_reason",
        "last_known_head",
        "last_known_drift",
        "checkpoint_awareness_status",
        "incident_response_readiness",
    ]:
        if line.startswith(key + ":"):
            validator[key] = line.split(":", 1)[1].strip()

summary = {
    "bundle_dir": str(out),
    "git_branch": git_branch,
    "git_head": git_head,
    "validator": validator,
    "live_json_sha256": sha256_file(live_json) if live_json.exists() else None,
    "validator_status_sha256": sha256_file(validator_file) if validator_file.exists() else None,
    "launch_readiness_dir": str(out / "launch_readiness"),
    "docs_dir": str(out / "docs"),
}
(out / "meta" / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
PY

echo
echo "[ok] mainnet0 go/no-go bundle created"
echo "bundle=$OUT"
