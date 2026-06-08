#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/participant-datanet-store-serve-demo-proof-$(date +%Y%m%d-%H%M%S)}"
ACCOUNT="${ACCOUNT:-store-serve-demo-proof}"

mkdir -p "$OUT"

echo "=== participant DataNet Store & Serve demo proof ==="
echo "runtime_guard=VOID_RUNTIME_SERVICE_GUARD_V1"
echo "mutation=false"
echo "money_movement=false"
echo "validator_mutation=false"
echo "base=$BASE"
echo "out=$OUT"

echo
echo "=== [1] source markers ==="
grep -q 'VOID_DATANET_STORE_SERVE_DEMO_V1' src/index.ts
grep -q 'Store &amp; Serve demo' src/index.ts
grep -q '/datanet/v1/publish' src/index.ts
grep -q '/datanet/v1/fetch' src/index.ts
grep -q '/datanet-demo' src/index.ts
grep -q '/participant#datanet' src/index.ts
echo "[ok] source store/serve demo markers present"

echo
echo "=== [2] build/restart/ready ==="
npm run build > "$OUT/build.log" 2>&1

RUNTIME_SERVICE="${VOID_RUNTIME_SERVICE:-}"
if [ -z "$RUNTIME_SERVICE" ]; then
  if systemctl --user is-active --quiet void-node-live.service 2>/dev/null; then
    RUNTIME_SERVICE="void-node-live.service"
  else
    RUNTIME_SERVICE="void-node.service"
  fi
fi

echo "runtime_service=$RUNTIME_SERVICE"

if [ "${VOID_PROOF_SKIP_RESTART:-0}" = "1" ]; then
  echo "[ok] VOID_PROOF_SKIP_RESTART=1, using already-running runtime service"
else
  systemctl --user restart "$RUNTIME_SERVICE"
  sleep 3
fi

curl -fsS --max-time 10 "$BASE/__void/ready.json" > "$OUT/ready.json"
python3 -c '
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] runtime ready/gap/txroot verified")
' "$OUT/ready.json"

echo
echo "=== [3] participant page exposes visible store/serve card ==="
curl -fsS --max-time 10 "$BASE/participant?account=$ACCOUNT" > "$OUT/participant.html"

python3 -c '
import pathlib, sys
html = pathlib.Path(sys.argv[1]).read_text(errors="replace")
checks = [
  "VOID_DATANET_STORE_SERVE_DEMO_V1",
  "Store &amp; Serve demo",
  "publish a small DataNet object",
  "/datanet/v1/publish",
  "/datanet/v1/fetch",
  "/datanet-demo",
  "/participant#datanet",
]
missing = [c for c in checks if c not in html]
if missing:
    print("[fatal] missing participant store/serve markers:")
    for m in missing:
        print(" -", m)
    raise SystemExit(1)
print("[ok] served participant store/serve card present")
' "$OUT/participant.html"

echo
echo "=== [4] publish small object through DataNet ==="
PLAINTEXT="VOID_DATANET_STORE_SERVE_DEMO_V1 payload account=$ACCOUNT utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '%s' "$PLAINTEXT" > "$OUT/plaintext.txt"

PLAIN_SHA="$(sha256sum "$OUT/plaintext.txt" | awk '{print $1}')"
PLAIN_B64="$(base64 -w0 "$OUT/plaintext.txt")"

python3 -c '
import json, sys
payload = {
  "name": "void-datanet-store-serve-demo.txt",
  "mime": "text/plain",
  "plaintext_b64": sys.argv[1],
  "who": sys.argv[2],
}
print(json.dumps(payload))
' "$PLAIN_B64" "$ACCOUNT" > "$OUT/payload.json"

curl -fsS --max-time 20 \
  -H 'content-type: application/json' \
  -X POST \
  --data @"$OUT/payload.json" \
  "$BASE/datanet/v1/publish?who=$ACCOUNT" > "$OUT/publish.json"

python3 -c '
import json, pathlib, sys
j=json.load(open(sys.argv[1]))
plain_sha=sys.argv[2]
assert j.get("ok") is True, j
dataset = j.get("id") or j.get("dataset_id") or j.get("datasetId") or j.get("root") or j.get("content_root")
assert dataset, j
if j.get("plain_sha256") is not None:
    assert str(j.get("plain_sha256")) == plain_sha, j
pathlib.Path(sys.argv[3]).write_text(str(dataset))
print("[ok] publish returned dataset=" + str(dataset))
print("[ok] expected_plain_sha256=" + plain_sha)
' "$OUT/publish.json" "$PLAIN_SHA" "$OUT/dataset-id.txt"

DATASET_ID="$(cat "$OUT/dataset-id.txt")"

echo
echo "=== [5] fetch object back through DataNet ==="
curl -fsS --max-time 20 "$BASE/datanet/v1/fetch/$DATASET_ID?who=$ACCOUNT" > "$OUT/fetch.json"

python3 -c '
import json, sys
pub=json.load(open(sys.argv[1]))
fet=json.load(open(sys.argv[2]))
dataset=sys.argv[3]
assert fet.get("ok") is True, fet
blob=json.dumps(fet, sort_keys=True)
assert dataset in blob or str(fet.get("id") or "") == dataset, fet
if "verify_ok" in fet:
    assert fet.get("verify_ok") is True, fet
if pub.get("cipher_sha256") and fet.get("cipher_sha256_server"):
    assert pub["cipher_sha256"] == fet["cipher_sha256_server"], (pub, fet)
print("[ok] fetch returned dataset=" + dataset)
print("[ok] fetch verification fields accepted")
' "$OUT/publish.json" "$OUT/fetch.json" "$DATASET_ID"

echo
echo "=== [6] safety backstop ==="
make mainnet0-status-smoke

echo
echo "VOID_DATANET_STORE_SERVE_DEMO_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "out=$OUT"
