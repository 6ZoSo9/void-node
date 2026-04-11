#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-data_a}"
ACCOUNT="${ACCOUNT:-runner-proof-persist-$(date +%Y%m%d-%H%M%S)}"
OUT="${OUT:-/tmp/live-runner-selection-persistence-proof.$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

jget() {
  curl -fsS --max-time "${2:-15}" "$1"
}

jpost_json() {
  curl -fsS --max-time "${3:-15}" \
    -H 'content-type: application/json' \
    -X POST "$1" \
    --data "$2"
}

echo "=== [1] baseline ==="
echo "account=$ACCOUNT"
jget "$BASE/health" 10 > "$OUT/health.json"
cat "$OUT/health.json"
echo

echo "=== [2] configure runner for proof ==="
jpost_json "$BASE/wc/runner/config" "{\"account\":\"$ACCOUNT\",\"safe_mode\":false,\"allow_datanet_fetch_verify\":true,\"allow_datanet_redundancy_check\":true,\"min_submit_gap_ms\":1000,\"max_jobs_per_hour\":120}" 10 | tee "$OUT/runner.config.json"
echo
jpost_json "$BASE/wc/runner/set" "{\"account\":\"$ACCOUNT\",\"enabled\":true}" 10 | tee "$OUT/runner.set.json"
echo

echo "=== [3] drive runner until publish + verify + redundancy are all seen ==="
SEEN_PUBLISH=0
SEEN_VERIFY=0
SEEN_REDUND=0

for i in $(seq 1 24); do
  echo "--- tick=$i ---"
  jpost_json "$BASE/wc/runner/tick" "{\"account\":\"$ACCOUNT\"}" 25 > "$OUT/runner.tick.$i.json" || true
  jget "$BASE/wc/runner/status?account=$ACCOUNT" 10 > "$OUT/runner.status.$i.json"

  python3 - "$DATA_DIR/jobs_v1/jobs.jsonl" "$ACCOUNT" <<'PY' > "$OUT/runner.seen.$i.env"
import json, sys, pathlib
jobs = pathlib.Path(sys.argv[1])
acct = sys.argv[2]
seen_publish = 0
seen_verify = 0
seen_redund = 0
if jobs.exists():
    for line in jobs.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        if str(obj.get("account") or "") != acct:
            continue
        kind = str(obj.get("kind") or "")
        if kind == "datanet_publish":
            seen_publish = 1
        elif kind == "datanet_fetch_verify":
            seen_verify = 1
        elif kind == "datanet_redundancy_check":
            seen_redund = 1
print(f"SEEN_PUBLISH={seen_publish}")
print(f"SEEN_VERIFY={seen_verify}")
print(f"SEEN_REDUND={seen_redund}")
PY
  . "$OUT/runner.seen.$i.env"

  echo "seen_publish=$SEEN_PUBLISH seen_verify=$SEEN_VERIFY seen_redundancy=$SEEN_REDUND"

  if [ "$SEEN_PUBLISH" -eq 1 ] && [ "$SEEN_VERIFY" -eq 1 ] && [ "$SEEN_REDUND" -eq 1 ]; then
    echo "[ok] all three task classes observed"
    break
  fi

  sleep 5
done

test "$SEEN_PUBLISH" -eq 1
test "$SEEN_VERIFY" -eq 1
test "$SEEN_REDUND" -eq 1

echo
echo "=== [4] persist5 jobs rows ==="
tail -n 40 "$DATA_DIR/jobs_v1/jobs.jsonl" | grep "$ACCOUNT" || true

echo
echo "=== [5] persist5 receipt rows ==="
tail -n 20 "$DATA_DIR/agent_v1/receipts.jsonl" | grep "$ACCOUNT" || true

echo
echo "=== [6] summary rows ==="
jget "$BASE/network/value-summary.json?limit=20" 15 | grep "$ACCOUNT" || true

echo
echo "[ok] live runner selection persistence proof green"
echo "out=$OUT"
