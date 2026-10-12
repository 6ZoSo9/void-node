#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-}"

if [ -z "$ACCOUNT" ]; then
  echo "[fail] ACCOUNT is required" >&2
  exit 1
fi

OUT="/tmp/void-runner-safety-proof.$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

curl -fsS --max-time 10 "$BASE/wc/runner/config?account=$ACCOUNT" > "$OUT/config.json"
curl -fsS --max-time 10 "$BASE/wc/runner/status?account=$ACCOUNT" > "$OUT/status.json"

python3 - "$OUT/config.json" "$OUT/status.json" <<'PY'
import json, sys

cfg = json.load(open(sys.argv[1]))
st = json.load(open(sys.argv[2]))

safe_mode = bool(cfg.get("safe_mode"))
min_gap = int(cfg.get("min_submit_gap_ms") or 0)
max_jobs = int(cfg.get("max_jobs_per_hour") or 0)
allow_pub = bool(cfg.get("allow_datanet_publish"))
allow_verify = bool(cfg.get("allow_datanet_fetch_verify"))
allow_redund = bool(cfg.get("allow_datanet_redundancy_check"))
enabled = bool(st.get("enabled"))
override = str(st.get("user_override") or "")
task_classes = st.get("approved_task_classes") or []

problems = []
if not safe_mode:
    problems.append("safe_mode_off")
if min_gap < 45000:
    problems.append(f"min_gap_too_low:{min_gap}")
if max_jobs > 40:
    problems.append(f"max_jobs_too_high:{max_jobs}")
if enabled:
    problems.append("runner_enabled_by_default")
if allow_verify:
    problems.append("fetch_verify_enabled_by_default")
if allow_redund:
    problems.append("redundancy_enabled_by_default")
if not allow_pub:
    problems.append("publish_disabled")
if override != "stop_only":
    problems.append(f"unexpected_override:{override}")

print(f"account={cfg.get('account')}")
print(f"safe_mode={safe_mode}")
print(f"min_submit_gap_ms={min_gap}")
print(f"max_jobs_per_hour={max_jobs}")
print(f"allow_datanet_publish={allow_pub}")
print(f"allow_datanet_fetch_verify={allow_verify}")
print(f"allow_datanet_redundancy_check={allow_redund}")
print(f"runner_enabled={enabled}")
print(f"user_override={override}")
print(f"approved_task_classes={','.join(task_classes)}")

if problems:
    print("runner_safety_proof_ok=0")
    print("problems=" + ",".join(problems))
    raise SystemExit(1)
else:
    print("runner_safety_proof_ok=1")
    print("problems=none")
PY

echo
echo "[ok] bundle: $OUT"
