#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
PROMFILE="${PROMFILE:-$TEXTFILE_DIR/void-mainnet-validator-lifecycle.prom}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-validator-lifecycle-composite-prom-proof.$STAMP}"

mkdir -p "$OUT"
chmod 700 "$OUT"

echo "=== validator lifecycle composite Prom proof ==="
echo "base=$BASE"
echo "prom=$PROM"
echo "promfile=$PROMFILE"
echo "out=$OUT"

echo
echo "=== [a] build + baseline ready ==="
npm run build

curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.baseline.json"
cat "$OUT/ready.baseline.json"
echo
python3 - "$OUT/ready.baseline.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] VOID baseline ready")
PY

curl -fsS "$PROM/-/ready" > "$OUT/prom.ready.txt"
cat "$OUT/prom.ready.txt"
echo

echo
echo "=== [b] run validator lifecycle composite gate ==="
make validator-lifecycle-composite-proof

echo
echo "=== [c] export composite artifact to node_exporter textfile ==="
make validator-lifecycle-composite-exporter

if sudo test -f "$PROMFILE"; then
  sudo cat "$PROMFILE" > "$OUT/exported.prom"
else
  cat "$PROMFILE" > "$OUT/exported.prom"
fi

cat "$OUT/exported.prom"

python3 - "$OUT/exported.prom" <<'PY'
import sys
s=open(sys.argv[1]).read()
assert "void_mainnet_validator_lifecycle_composite_ok 1" in s, s
assert "void_mainnet_validator_lifecycle_composite_lanes_total 7" in s, s
print("[ok] exported textfile has ok=1 and 7 lanes")
PY

echo
echo "=== [d] wait for Prometheus to scrape lifecycle metric ==="
ok=0
for i in $(seq 1 90); do
  curl -fsS --get "$PROM/api/v1/query" \
    --data-urlencode 'query=void_mainnet_validator_lifecycle_composite_ok' \
    > "$OUT/prom.lifecycle.ok.json" || true

  if python3 - "$OUT/prom.lifecycle.ok.json" <<'PY' >/dev/null 2>&1
import json, sys
j=json.load(open(sys.argv[1]))
r=(j.get("data") or {}).get("result") or []
assert r
assert any(str((x.get("value") or ["",""])[1]) in ("1","1.0") for x in r)
PY
  then
    ok=1
    break
  fi

  sleep 2
done

cat "$OUT/prom.lifecycle.ok.json"
echo

if [ "$ok" != "1" ]; then
  echo "[ERR] Prometheus did not scrape void_mainnet_validator_lifecycle_composite_ok=1"
  curl -fsS "$PROM/api/v1/targets?state=active" | head -c 2400 || true
  echo
  exit 1
fi

echo "[ok] Prometheus sees lifecycle composite ok=1"

echo
echo "=== [e] query all lifecycle metrics ==="
for q in \
  'void_mainnet_validator_lifecycle_composite_ok' \
  'void_mainnet_validator_lifecycle_composite_ready_head' \
  'void_mainnet_validator_lifecycle_composite_lanes_total' \
  'void_mainnet_validator_lifecycle_composite_timestamp_seconds' \
  'void_mainnet_validator_lifecycle_composite_info'
do
  echo
  echo "--- query: $q ---"
  safe="$(printf '%s' "$q" | tr -c 'A-Za-z0-9_' '_')"
  curl -fsS --get "$PROM/api/v1/query" --data-urlencode "query=$q" > "$OUT/prom-$safe.json"
  cat "$OUT/prom-$safe.json"
  echo
  python3 - "$OUT/prom-$safe.json" "$q" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
q=sys.argv[2]
r=(j.get("data") or {}).get("result") or []
assert j.get("status") == "success", (q, j)
assert r, (q, j)
print(f"[ok] populated: {q}")
PY
done

echo
echo "=== [f] final guards/readiness ==="
/usr/local/bin/prom-job-dupes.sh
/usr/local/bin/prom-safe-reload.sh

curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.final.json"
cat "$OUT/ready.final.json"
echo
python3 - "$OUT/ready.final.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] VOID final ready")
PY

curl -fsS --get "$PROM/api/v1/query" --data-urlencode 'query=ready:last_30s' > "$OUT/prom.ready.last30s.final.json"
cat "$OUT/prom.ready.last30s.final.json"
echo
python3 - "$OUT/prom.ready.last30s.final.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
r=(j.get("data") or {}).get("result") or []
assert r, j
assert any(str((x.get("value") or ["",""])[1]) in ("1","1.0") for x in r), j
print("[ok] ready:last_30s final green")
PY

echo
echo "=== [g] write proof summary ==="
READY_HEAD="$(python3 - "$OUT/ready.final.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1])).get("head"))
PY
)"
cat > "$OUT/summary.json" <<JSON
{
  "ok": true,
  "kind": "validator_lifecycle_composite_prom_proof",
  "promfile": "$PROMFILE",
  "readyHead": "$READY_HEAD",
  "metric": "void_mainnet_validator_lifecycle_composite_ok",
  "metricValue": 1,
  "lanesTotal": 7,
  "prometheusScraped": true,
  "guardsPassed": true
}
JSON

mkdir -p .runtime/mainnet0
cp "$OUT/summary.json" .runtime/mainnet0/validator-lifecycle-composite-prom.local.current.json
cat "$OUT/summary.json"

echo
echo "[ok] validator lifecycle composite Prom proof green"
