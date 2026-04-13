#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTDIR="/root/void-mainnet0-policy"
PROM_DIR="/var/lib/node_exporter/textfile_collector"
TS="$(date +%Y%m%d-%H%M%S)"
EPOCH="$(date +%s)"

mkdir -p "$OUTDIR" "$PROM_DIR"

JSON_OUT="$OUTDIR/policy-stack.${TS}.json"
JSON_LATEST="$OUTDIR/policy-stack.latest.json"
TXT_OUT="$OUTDIR/policy-stack.${TS}.txt"
TXT_LATEST="$OUTDIR/policy-stack.latest.txt"
PROM_TMP="$(mktemp)"
PROM_OUT="$PROM_DIR/void_mainnet0_policy_stack.prom"

HEAD_SHA="$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo unknown)"
BRANCH="$(git -C "$REPO" branch --show-current 2>/dev/null || echo unknown)"
TAG="$(git -C "$REPO" describe --tags --exact-match 2>/dev/null || echo "")"

RC=0
LOG="$(
  cd "$REPO"
  bash ops/void-mainnet0-policy-stack-sanity.sh 2>&1
)" || RC=$?

printf '%s\n' "$LOG" > "$TXT_OUT"
cp -a "$TXT_OUT" "$TXT_LATEST"

RESULT_OK=0
if [[ "$RC" -eq 0 ]]; then
  RESULT_OK=1
fi

export TXT_OUT JSON_OUT RESULT_OK RC EPOCH TS HEAD_SHA BRANCH TAG
export POLICY_SCRIPT="$REPO/ops/void-mainnet0-policy-stack-sanity.sh"

python3 - "$JSON_OUT" <<'PY'
import json, os, sys, hashlib
from pathlib import Path

out = Path(sys.argv[1])
txt_path = Path(os.environ["TXT_OUT"])
txt = txt_path.read_text()

payload = {
    "ok": int(os.environ["RESULT_OK"]),
    "rc": int(os.environ["RC"]),
    "ts_epoch": int(os.environ["EPOCH"]),
    "ts_label": os.environ["TS"],
    "head": os.environ["HEAD_SHA"],
    "branch": os.environ["BRANCH"],
    "tag": os.environ["TAG"],
    "policy_stack_script": os.environ["POLICY_SCRIPT"],
    "text_artifact_path": str(txt_path),
    "text_artifact_sha256": hashlib.sha256(txt.encode()).hexdigest(),
    "contains_pillars_preflight": int("=== [mainnet0-policy] run mainnet pillars preflight ===" in txt),
    "contains_stub_plan_gate": int("=== [void-mainnet-pillars-preflight] stub bootstrap plan gate ===" in txt),
    "contains_policy_stack_pass": int("[ok] mainnet-0 policy stack sanity passed" in txt),
}
out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
PY

cp -a "$JSON_OUT" "$JSON_LATEST"

JSON_HASH="$(sha256sum "$JSON_OUT" | awk '{print $1}')"
TXT_HASH="$(sha256sum "$TXT_OUT" | awk '{print $1}')"

PILLARS_INCLUDED="$(python3 - "$JSON_OUT" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["contains_pillars_preflight"])
PY
)"
STUB_GATE_INCLUDED="$(python3 - "$JSON_OUT" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["contains_stub_plan_gate"])
PY
)"

cat > "$PROM_TMP" <<PROM
# HELP void_mainnet0_policy_stack_ok 1 if mainnet0 policy stack sanity passed.
# TYPE void_mainnet0_policy_stack_ok gauge
void_mainnet0_policy_stack_ok ${RESULT_OK}

# HELP void_mainnet0_policy_stack_last_run_ts_seconds Unix timestamp of last policy stack run.
# TYPE void_mainnet0_policy_stack_last_run_ts_seconds gauge
void_mainnet0_policy_stack_last_run_ts_seconds ${EPOCH}

# HELP void_mainnet0_policy_stack_info Build/info labels for latest policy stack artifact.
# TYPE void_mainnet0_policy_stack_info gauge
void_mainnet0_policy_stack_info{head="${HEAD_SHA}",branch="${BRANCH}",tag="${TAG}",json_hash="${JSON_HASH}",txt_hash="${TXT_HASH}"} 1

# HELP void_mainnet0_policy_stack_contains_pillars_preflight 1 if the policy stack run included pillars preflight.
# TYPE void_mainnet0_policy_stack_contains_pillars_preflight gauge
void_mainnet0_policy_stack_contains_pillars_preflight ${PILLARS_INCLUDED}

# HELP void_mainnet0_policy_stack_contains_stub_plan_gate 1 if the policy stack run included the stub bootstrap plan gate.
# TYPE void_mainnet0_policy_stack_contains_stub_plan_gate gauge
void_mainnet0_policy_stack_contains_stub_plan_gate ${STUB_GATE_INCLUDED}
PROM

mv -f "$PROM_TMP" "$PROM_OUT"
chmod 0644 "$PROM_OUT"

echo "[ok] txt   = $TXT_OUT"
echo "[ok] json  = $JSON_OUT"
echo "[ok] prom  = $PROM_OUT"
echo "[ok] rc    = $RC"
echo "[ok] ok    = $RESULT_OK"
