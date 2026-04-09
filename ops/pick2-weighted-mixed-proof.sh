#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
TOKEN="${TOKEN:-dev-agent-local-20260409}"
OUT="${OUT:-/tmp/void-pick2-weighted-mixed-proof}"
mkdir -p "$OUT"

if [ -z "$TOKEN" ]; then
  echo "[fail] set TOKEN"
  exit 1
fi

RUN_ID="${RUN_ID:-$(date +%s)}"
ACCOUNT="weighted-mixed-proof-${RUN_ID}"
WORKER="weighted-mixed-proof-${RUN_ID}"

DATASET_ID="$(find "$HOME/dev/void-node/data_a/datanet_v1/local_jobs" -maxdepth 1 -name 'ds_*.txt' | sed 's#.*/##; s#\.txt$##' | sort | tail -n 1)"
test -n "$DATASET_ID"
DATASET_PATH="$HOME/dev/void-node/data_a/datanet_v1/local_jobs/${DATASET_ID}.txt"
EXPECTED_HASH="$(sha256sum "$DATASET_PATH" | awk '{print $1}')"

echo "run_id=$RUN_ID"
echo "account=$ACCOUNT"
echo "worker=$WORKER"
echo "dataset_id=$DATASET_ID"
echo "expected_hash=$EXPECTED_HASH"

python3 - <<PY > "$OUT/queued.json"
import json, urllib.request

base = "${BASE}"
dataset_id = "${DATASET_ID}"
expected_hash = "${EXPECTED_HASH}"
account = "${ACCOUNT}"

BIG = "X" * 12000000

jobs = [
    {
        "label": "good_fetch_high",
        "kind": "datanet_fetch_verify",
        "stale_for_ms": 604000,
        "difficulty_bucket": "high",
        "network_need_score": 0.90,
        "extra": {}
    },
    {
        "label": "good_redundancy_medium",
        "kind": "datanet_redundancy_check",
        "stale_for_ms": 605000,
        "difficulty_bucket": "medium",
        "network_need_score": 0.85,
        "extra": {}
    },
    {
        "label": "bad_missing_dataset_id",
        "kind": "datanet_fetch_verify",
        "stale_for_ms": 604500,
        "difficulty_bucket": "high",
        "network_need_score": 0.95,
        "extra": {"omit_dataset_id": True}
    },
    {
        "label": "bad_too_stale",
        "kind": "datanet_fetch_verify",
        "stale_for_ms": 999999999,
        "difficulty_bucket": "high",
        "network_need_score": 0.99,
        "extra": {}
    },
    {
        "label": "bad_payload_too_large",
        "kind": "datanet_fetch_verify",
        "stale_for_ms": 604200,
        "difficulty_bucket": "high",
        "network_need_score": 0.95,
        "extra": {"filler": BIG}
    }
]

out = []
for j in jobs:
    payload = {
        "dataset_id": dataset_id,
        "expected_input_hash": expected_hash,
        "stale_for_ms": j["stale_for_ms"],
        "difficulty_bucket": j["difficulty_bucket"],
        "network_need_score": j["network_need_score"],
    }
    extra = dict(j["extra"])
    if extra.pop("omit_dataset_id", False):
        payload.pop("dataset_id", None)
    payload.update(extra)
    body = {
        "account": account,
        "kind": j["kind"],
        "plaintext": json.dumps(payload),
        "meta": {
            "label": j["label"],
            "selection_reason": "weighted_mixed_seed",
            "selected_task_class": j["kind"],
            **({"selected_dataset_id": dataset_id} if not j["extra"].get("omit_dataset_id", False) else {}),
            "selected_difficulty_bucket": j["difficulty_bucket"],
            "selected_network_need_score": j["network_need_score"],
            "selected_stale_for_ms": j["stale_for_ms"],
            "safe_mode": False
        }
    }
    req = urllib.request.Request(
        base + "/jobs/submit",
        data=json.dumps(body).encode(),
        headers={"content-type":"application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        out.append({
            "seed": j,
            "resp": json.loads(r.read().decode())
        })

print(json.dumps(out, indent=2))
PY

echo
echo "=== queued ==="
cat "$OUT/queued.json"

echo
echo "=== public weighted picks ==="
: > "$OUT/picks.jsonl"
for i in 1 2 3 4; do
  curl -fsS --max-time 8 -X POST \
    -H "x-agent-token: $TOKEN" \
    -H 'content-type: application/json' \
    --data "{\"worker\":\"$WORKER\",\"account\":\"$ACCOUNT\"}" \
    "$BASE/agent/v0/pick2" | tee -a "$OUT/picks.jsonl" | jq .
  echo
done

echo
echo "=== runtime truth ==="
curl -fsS --max-time 8 -H "x-agent-token: $TOKEN" \
  "$BASE/__void/agent/pick2/weighted.v2" | tee "$OUT/weighted.json" | jq .

echo
echo "=== reject samples ==="
curl -fsS --max-time 8 "$BASE/__void/agent/pick2/rejects.v2" | tee "$OUT/rejects.json" | jq .

echo
echo "=== weighted metrics ==="
curl -fsS --max-time 8 "$BASE/__void/metrics/agent_pick2_v2.prom" | tee "$OUT/metrics.prom" | sed -n '1,220p'

echo
echo "=== summary ==="
python3 - <<PY
import json, pathlib, collections

rows = [json.loads(x) for x in pathlib.Path("${OUT}/picks.jsonl").read_text().splitlines() if x.strip()]
weighted = json.loads(pathlib.Path("${OUT}/weighted.json").read_text())
rejects = json.loads(pathlib.Path("${OUT}/rejects.json").read_text())

tasks = []
policies = []
scores = []
reasons = []
for r in rows:
    j = (r or {}).get("job") or {}
    tasks.append(str(j.get("selected_task_class") or j.get("kind") or ""))
    policies.append(str(j.get("selection_policy") or ""))
    scores.append(j.get("selected_score"))
    reasons.append(str(j.get("selection_reason") or ""))

counts = collections.Counter(tasks)
reject_counts = collections.Counter(str(s.get("reject_reason") or "") for s in (rejects.get("samples") or []))

print(json.dumps({
    "account": "${ACCOUNT}",
    "worker": "${WORKER}",
    "picked_tasks": tasks,
    "picked_counts": dict(counts),
    "policies": policies,
    "scores": scores,
    "last_runtime_best": weighted.get("best"),
    "reject_reasons_seen": dict(reject_counts),
    "expectation": {
        "all_policies_weighted": all(str(p).startswith("weighted_v2") for p in policies if p),
        "good_tasks_should_win": all(t in ["datanet_fetch_verify","datanet_redundancy_check"] for t in tasks if t),
        "bad_rejects_should_appear": True
    }
}, indent=2))
PY

echo
echo "[ok] output_dir=$OUT"
