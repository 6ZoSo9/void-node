#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_HTTP="${REMOTE_HTTP:-http://100.122.79.39:4100}"
TS="$(date +%Y%m%d-%H%M%S)"
ACCOUNT="mainnet0-remote-state-change-$TS"
PLAINTEXT="two-box mainnet0 remote state change proof $TS"
OUT="${OUT:-/tmp/two-box-mainnet0-state-change-proof.v2.$TS}"
mkdir -p "$OUT"

echo "=== [1] baseline truth ==="
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/ready.json | tee "$OUT/local-ready-before.json"
echo
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/peer-main-status.json | tee "$OUT/local-peer-before.json"
echo

echo
echo "=== [1b] precondition gate ==="
python3 -c 'import json,sys; ready=json.load(open(sys.argv[1])); peer=json.load(open(sys.argv[2])); assert ready.get("ready") is True, ready; gap=int(peer.get("head_gap",999999)); assert abs(gap)<=2, peer; print("[ok] local precondition gate green")' \
  "$OUT/local-ready-before.json" "$OUT/local-peer-before.json"

echo
echo "=== [2] publish direct DataNet state change on Alienware ==="
PLAINTEXT="$PLAINTEXT" python3 -c 'import base64,json,os; print(json.dumps({"name":"mainnet0-state-change-proof.txt","mime":"text/plain","plaintext_b64":base64.b64encode(os.environ["PLAINTEXT"].encode()).decode()}))' \
  > "$OUT/publish-payload.json"

ssh "$ALIEN" "curl -fsS -H 'content-type: application/json' -X POST 'http://127.0.0.1:4100/datanet/v1/publish?who=$ACCOUNT' --data-binary @-" \
  < "$OUT/publish-payload.json" > "$OUT/remote-publish.json"

cat "$OUT/remote-publish.json"
echo

DATASET_ID="$(python3 -c 'import json,sys; j=json.load(open(sys.argv[1])); assert j.get("ok") is True, j; print(j.get("id") or j.get("dataset_id") or "")' "$OUT/remote-publish.json")"
ROOT_HEX="$(python3 -c 'import json,sys; j=json.load(open(sys.argv[1])); print(j.get("merkleRootHex") or j.get("rootTxt") or "")' "$OUT/remote-publish.json")"

test -n "$DATASET_ID"
echo "dataset_id=$DATASET_ID"
echo "root_hex=$ROOT_HEX"

echo
echo "=== [3] prove Alienware local fetch truth ==="
ssh "$ALIEN" "curl -fsS 'http://127.0.0.1:4100/datanet/v1/fetch/$DATASET_ID?who=$ACCOUNT'" \
  > "$OUT/remote-fetch.json"

cat "$OUT/remote-fetch.json"
echo

PLAINTEXT="$PLAINTEXT" python3 -c 'import base64,json,os,sys; j=json.load(open(sys.argv[1])); assert j.get("ok") is True,j; assert str(j.get("id") or "")==sys.argv[2],j; assert str(j.get("who") or "")==sys.argv[3],j; decoded=base64.b64decode(j.get("cipher_b64") or "").decode(); assert decoded==os.environ["PLAINTEXT"], {"decoded":decoded,"expected":os.environ["PLAINTEXT"]}; print("[ok] Alienware fetch returned exact published plaintext")' \
  "$OUT/remote-fetch.json" "$DATASET_ID" "$ACCOUNT"

echo
echo "=== [4] local follower truth after remote state change ==="
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/peer-main-status.json | tee "$OUT/local-peer-after.json"
echo
curl -fsS --max-time 10 "http://127.0.0.1:4100/follower/status?peer=http://100.122.79.39:4100" | tee "$OUT/local-follower-after.json"
echo

echo
echo "=== [5] Precision cross-box fetch of Alienware dataset ==="
curl -fsS --max-time 20 "$REMOTE_HTTP/datanet/v1/fetch/$DATASET_ID?who=$ACCOUNT" > "$OUT/precision-crossbox-fetch.json"

cat "$OUT/precision-crossbox-fetch.json"
echo

PLAINTEXT="$PLAINTEXT" python3 -c 'import base64,json,os,sys; peer=json.load(open(sys.argv[1])); follower=json.load(open(sys.argv[2])); fetch=json.load(open(sys.argv[3])); gap=int(peer.get("head_gap",999999)); assert abs(gap)<=2, peer; drift=int(follower.get("drift",999999)); assert abs(drift)<=2, follower; assert fetch.get("ok") is True, fetch; assert str(fetch.get("id") or "")==sys.argv[4], fetch; decoded=base64.b64decode(fetch.get("cipher_b64") or "").decode(); assert decoded==os.environ["PLAINTEXT"], {"decoded":decoded,"expected":os.environ["PLAINTEXT"]}; print("[ok] remote DataNet publish is fetchable from Precision over cross-box HTTP and follower stayed within bounded drift tolerance")' \
  "$OUT/local-peer-after.json" "$OUT/local-follower-after.json" "$OUT/precision-crossbox-fetch.json" "$DATASET_ID"

echo
echo "out=$OUT"
