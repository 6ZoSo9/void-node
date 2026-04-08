#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
TOKEN="${TOKEN:-}"
OUT="/tmp/void-pick2-fairness-proof"
mkdir -p "$OUT"

if [ -z "$TOKEN" ]; then
  echo "[fail] set TOKEN first"
  exit 1
fi

DATASET_ID="$(find "$HOME/dev/void-node/data_a/datanet_v1/local_jobs" -maxdepth 1 -name 'ds_*.txt' | sed 's#.*/##; s#\.txt$##' | sort | tail -n 1)"
test -n "$DATASET_ID"

DATASET_PATH="$HOME/dev/void-node/data_a/datanet_v1/local_jobs/${DATASET_ID}.txt"
EXPECTED_HASH="$(sha256sum "$DATASET_PATH" | awk '{print $1}')"

echo "dataset_id=$DATASET_ID"
echo "expected_hash=$EXPECTED_HASH"

python3 - <<PY > "$OUT/queued.json"
import json, urllib.request
base = "${BASE}"
dataset_id = "${DATASET_ID}"
expected_hash = "${EXPECTED_HASH}"
jobs = []
for i in range(6):
    kind = "datanet_fetch_verify" if i % 2 == 0 else "datanet_redundancy_check"
    stale = 600000 + i * 1000
    need = 0.9 if kind == "datanet_fetch_verify" else 0.85
    body = {
        "account": "fairness-proof",
        "kind": kind,
        "plaintext": json.dumps({
            "dataset_id": dataset_id,
            "expected_input_hash": expected_hash,
            "stale_for_ms": stale,
            "difficulty_bucket": "high" if kind == "datanet_fetch_verify" else "medium",
            "network_need_score": need
        }),
        "meta": {
            "selection_reason": "fairness_proof_seed",
            "selected_task_class": kind,
            "selected_dataset_id": dataset_id,
            "selected_difficulty_bucket": "high" if kind == "datanet_fetch_verify" else "medium",
            "selected_network_need_score": need,
            "selected_stale_for_ms": stale,
            "safe_mode": False
        }
    }
    req = urllib.request.Request(base + "/jobs/submit", data=json.dumps(body).encode(), headers={"content-type":"application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        jobs.append(json.loads(r.read().decode()))
print(json.dumps(jobs, indent=2))
PY

cat "$OUT/queued.json"

: > "$OUT/picks.jsonl"
for i in 1 2 3 4 5 6; do
  curl -fsS \
    -H "x-agent-token: $TOKEN" \
    -H 'content-type: application/json' \
    --data '{"worker":"fairness-proof"}' \
    "$BASE/agent/v0/pick2" | jq -c . >> "$OUT/picks.jsonl"
done

echo
echo "=== picks ==="
cat "$OUT/picks.jsonl"

echo
echo "=== summary ==="
python3 - <<PY
import json, collections, pathlib
p = pathlib.Path("${OUT}/picks.jsonl")
rows = [json.loads(line) for line in p.read_text().splitlines() if line.strip()]
tasks = []
policies = []
reasons = []
for r in rows:
    j = (r or {}).get("job") or {}
    tasks.append(str(j.get("selected_task_class") or j.get("task_class") or j.get("kind") or ""))
    policies.append(str(j.get("selection_policy") or ""))
    reasons.append(str(j.get("selection_reason") or ""))
counts = collections.Counter(tasks)
max_streak = 0
cur = 0
prev = None
for t in tasks:
    if t == prev:
        cur += 1
    else:
        cur = 1
        prev = t
    max_streak = max(max_streak, cur)
print(json.dumps({
    "tasks": tasks,
    "counts": dict(counts),
    "max_streak": max_streak,
    "policies": policies,
    "reasons": reasons
}, indent=2))
PY

echo
echo "=== weighted debug ==="
curl -fsS -H "x-agent-token: $TOKEN" "$BASE/__void/agent/pick2/weighted.v2" | jq .
