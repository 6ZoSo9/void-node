#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT=".runtime/mainnet0/canonical-tx-hotpath-v1-proof.${STAMP}.json"
LATEST=".runtime/mainnet0/canonical-tx-hotpath-v1-proof.latest.json"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 127
  }
}

need curl
need jq
need python3

curlj() {
  timeout 8 curl -fsS "$1"
}

postj() {
  timeout 8 curl -fsS -X POST "$1" \
    -H 'content-type: application/json' \
    -d "$2"
}

health="$(curlj "$BASE/health")"
storage="$(curlj "$BASE/__void/diag/storage-repair-readiness-v1.json")"
cleanup="$(curlj "$BASE/__void/diag/txsubmit_canonical_cleanup.json")"
canon0="$(curlj "$BASE/__void/diag/txsubmit_canonical.json")"
count0="$(curlj "$BASE/mempool/count")"

before="$(printf '%s' "$count0" | jq -r '.count // .size // 0')"
test -n "$before"

nonce="canonical-tx-hotpath-v1-proof-${STAMP}-$(date +%s%N)"
payload="$(printf '{"kind":"canonical_tx_hotpath_v1_proof","nonce":"%s"}' "$nonce")"

submit="$(postj "$BASE/tx/submit" "$payload")"

count1="$(curlj "$BASE/mempool/count")"
after="$(printf '%s' "$count1" | jq -r '.count // .size // 0')"
test -n "$after"

delta="$((after-before))"

cleanup2="$(curlj "$BASE/__void/diag/txsubmit_canonical_cleanup.json")"
canon1="$(curlj "$BASE/__void/diag/txsubmit_canonical.json")"

printf '%s\n' "$storage" | jq -e '.ok == true and .storage_repair_state == "green"' >/dev/null
printf '%s\n' "$cleanup2" | jq -e '.route_count.routes == 1 and .route_count.keep == 1 and .route_count.legacy == 0' >/dev/null
printf '%s\n' "$canon1" | jq -e '.route_count.routes == 1 and .state.accepted_total >= 1 and .state.append_ok_total >= 1' >/dev/null
printf '%s\n' "$submit" | jq -e '.ok == true and .handled == "txsubmit_canonical_v1"' >/dev/null
test "$delta" = "1"

python3 - "$OUT" "$BASE" "$STAMP" "$nonce" "$before" "$after" "$delta" <<'PY'
import json, sys, subprocess

out, base, stamp, nonce, before, after, delta = sys.argv[1:8]

def j(cmd):
    return json.loads(subprocess.check_output(cmd, text=True))

proof = {
    "ok": True,
    "marker": "VOID_CANONICAL_TX_HOTPATH_V1_PROOF_GREEN",
    "stamp": stamp,
    "base": base,
    "nonce": nonce,
    "before": int(before),
    "after": int(after),
    "delta": int(delta),
    "health": j(["curl", "-fsS", base + "/health"]),
    "storage": j(["curl", "-fsS", base + "/__void/diag/storage-repair-readiness-v1.json"]),
    "cleanup": j(["curl", "-fsS", base + "/__void/diag/txsubmit_canonical_cleanup.json"]),
    "canonical": j(["curl", "-fsS", base + "/__void/diag/txsubmit_canonical.json"]),
    "mempool_count": j(["curl", "-fsS", base + "/mempool/count"]),
    "pass_conditions": {
        "storage_green": True,
        "txsubmit_routes_exactly_one": True,
        "canonical_keep_routes_exactly_one": True,
        "legacy_txsubmit_routes_zero": True,
        "one_submit_one_mempool_increment": True,
        "handled_by_canonical_v1": True
    }
}

with open(out, "w") as f:
    json.dump(proof, f, indent=2)
    f.write("\n")

print(out)
PY

cp "$OUT" "$LATEST"

jq '.marker,.pass_conditions,.before,.after,.delta,.cleanup.route_count,.canonical.route_count,.canonical.state' "$LATEST"

echo "VOID_CANONICAL_TX_HOTPATH_V1_PROOF_GREEN"
