#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"

get_json_to_file() {
  local url="$1"
  local out="$2"
  curl -fsS "$url" > "$out"
}

post_json_to_file() {
  local url="$1"
  local out="$2"
  curl -fsS -X POST "$url" > "$out"
}

echo "=== [1] stop auto proposer (best effort) ==="
curl -fsS -X POST "$BASE/proposer/auto/stop" || true
echo

echo "=== [2] drain any old noise first ==="
for i in $(seq 1 12); do
  MP="$(curl -fsS "$BASE/mempool/count" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("count", -1))')"
  QS="$(curl -fsS "$BASE/proposer/queue/size" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("size", -1))' || echo -1)"
  echo "drain_poll=$i mempool=$MP queue=$QS"
  if [ "$MP" = "0" ] && [ "$QS" = "0" ]; then
    break
  fi
  curl -fsS -X POST "$BASE/__void/rescue/proposer/seal-now?dry=0&confirm=proposerSealOnce" || true
  sleep 1
done

MP="$(curl -fsS "$BASE/mempool/count" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("count", -1))')"
QS="$(curl -fsS "$BASE/proposer/queue/size" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("size", -1))' || echo -1)"
echo "post_drain mempool=$MP queue=$QS"
if [ "$MP" != "0" ] || [ "$QS" != "0" ]; then
  echo "[FAIL] queue or mempool not clean before ping proof"
  exit 1
fi

echo
echo "=== [3] enqueue ping only ==="
PING_JSON="$(mktemp)"
post_json_to_file "$BASE/tx/ping2" "$PING_JSON"
cat "$PING_JSON"; echo

PING_HASH="$(python3 - "$PING_JSON" <<'PY'
import sys, json
j=json.load(open(sys.argv[1]))
print(j.get("hash",""))
PY
)"
PING_TS="$(python3 - "$PING_JSON" <<'PY'
import sys, json
j=json.load(open(sys.argv[1]))
print((j.get("body") or {}).get("ts",""))
PY
)"
PING_NONCE="$(python3 - "$PING_JSON" <<'PY'
import sys, json
j=json.load(open(sys.argv[1]))
print((j.get("body") or {}).get("nonce",""))
PY
)"
PING_NOTE="$(python3 - "$PING_JSON" <<'PY'
import sys, json
j=json.load(open(sys.argv[1]))
print((j.get("body") or {}).get("note",""))
PY
)"

echo "ping_hash=$PING_HASH"
echo "ping_ts=$PING_TS"
echo "ping_nonce=$PING_NONCE"
echo "ping_note=$PING_NOTE"

MP="$(curl -fsS "$BASE/mempool/count" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("count", -1))')"
QS="$(curl -fsS "$BASE/proposer/queue/size" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("size", -1))' || echo -1)"
echo "after_ping mempool=$MP queue=$QS"

SKIP_SEAL=0
SEALED_NUMBER=""
SEALED_TAKEN=""

if [ "$MP" -lt 1 ] && [ "$QS" -lt 1 ]; then
  echo "[warn] ping not visible in mempool/queue; checking if it already sealed"
  EARLY_VERIFY="$(curl -fsS "$BASE/tx/ping/verify2?window=20" || true)"
  echo "$EARLY_VERIFY"

  EARLY_NUMBER="$(printf '%s' "$EARLY_VERIFY" | python3 - "$PING_TS" "$PING_NONCE" "$PING_NOTE" <<'PY'
import sys, json
pts, pnonce, pnote = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    j = json.load(sys.stdin)
except Exception:
    print("")
    raise SystemExit(0)

found = ""
for hit in j.get("hits", []):
    for p in hit.get("pings", []):
        b = p.get("body") or {}
        if str(b.get("ts","")) == pts and str(b.get("nonce","")) == pnonce and str(b.get("note","")) == pnote and b.get("kind") == "ping":
            found = str(hit.get("number",""))
            break
    if found:
        break
print(found)
PY
)"
  if [ -n "$EARLY_NUMBER" ]; then
    echo "[ok] ping already sealed in block $EARLY_NUMBER"
    SKIP_SEAL=1
    SEALED_NUMBER="$EARLY_NUMBER"
    SEALED_TAKEN="1"
  else
    echo "[FAIL] ping neither visible in mempool/queue nor already sealed"
    exit 1
  fi
fi

echo
echo "=== [4] seal exactly one block ==="
if [ "$SKIP_SEAL" = "1" ]; then
  echo "already_sealed_number=$SEALED_NUMBER"
  echo "sealed_number=$SEALED_NUMBER"
  echo "sealed_taken=$SEALED_TAKEN"
else
  SEAL_JSON="$(mktemp)"
  post_json_to_file "$BASE/__void/rescue/proposer/seal-now?dry=0&confirm=proposerSealOnce" "$SEAL_JSON"
  cat "$SEAL_JSON"; echo

  SEALED_NUMBER="$(python3 - "$SEAL_JSON" <<'PY'
import sys, json
j=json.load(open(sys.argv[1]))
print(j.get("number",-1))
PY
)"
  SEALED_TAKEN="$(python3 - "$SEAL_JSON" <<'PY'
import sys, json
j=json.load(open(sys.argv[1]))
print(j.get("taken",-1))
PY
)"
  echo "sealed_number=$SEALED_NUMBER"
  echo "sealed_taken=$SEALED_TAKEN"

  if [ "$SEALED_NUMBER" = "-1" ]; then
    echo "[FAIL] proposer/seal-now did not return a valid block number"
    exit 1
  fi
fi

echo
echo "=== [5] persisted truth for sealed block ==="
FULL_JSON="$(mktemp)"
INSPECT_JSON="$(mktemp)"
VERIFY_JSON="$(mktemp)"

get_json_to_file "$BASE/blocks/$SEALED_NUMBER/full2" "$FULL_JSON"
get_json_to_file "$BASE/blocks/$SEALED_NUMBER/inspect" "$INSPECT_JSON"
get_json_to_file "$BASE/blocks/$SEALED_NUMBER/txroot/verify2" "$VERIFY_JSON"

echo "--- full2"
cat "$FULL_JSON"; echo
echo "--- inspect"
cat "$INSPECT_JSON"; echo
echo "--- verify2"
cat "$VERIFY_JSON"; echo

echo
echo "=== [6] assert sealed block contains THIS ping tx ==="
python3 - "$FULL_JSON" "$PING_TS" "$PING_NONCE" "$PING_NOTE" <<'PY'
import sys, json
full = json.load(open(sys.argv[1]))
ping_ts = str(sys.argv[2])
ping_nonce = str(sys.argv[3])
ping_note = sys.argv[4]

txs = full.get("txs") or []
found = None
for tx in txs:
    cand = tx.get("data") if isinstance(tx, dict) and isinstance(tx.get("data"), dict) else tx
    if not isinstance(cand, dict):
        continue
    if str(cand.get("ts","")) == ping_ts and str(cand.get("nonce","")) == ping_nonce and str(cand.get("note","")) == ping_note and cand.get("kind") == "ping":
        found = tx
        break

if not found:
    print("[FAIL] sealed block does not contain expected ping tx")
    sys.exit(1)

print("[ok] sealed block contains expected ping tx")
print(json.dumps(found, indent=2))
PY

echo
echo "=== [7] assert txroot verify route matches ==="
python3 - "$VERIFY_JSON" <<'PY'
import sys, json
j=json.load(open(sys.argv[1]))
if not j.get("match"):
    print("[FAIL] verify2 did not match")
    sys.exit(1)
if int(j.get("txCount") or 0) < 1:
    print("[FAIL] verify2 txCount < 1")
    sys.exit(1)
print("[ok] verify2 matched with txCount >= 1")
PY

echo
echo "=== [8] advisory ping routes ==="
curl -fsS "$BASE/tx/ping/verify2?window=120" || true
echo
curl -fsS "$BASE/tx/ping/seen?window=120" || true
echo

echo
echo "=== [9] after ==="
curl -fsS "$BASE/mempool/count" ; echo
curl -fsS "$BASE/proposer/queue/size" || true ; echo

echo
echo "[GREEN] proposer rescue ping proof passed for block $SEALED_NUMBER"
