#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

CONTRACT="${CONTRACT:-fixtures/public/mainnet0-public-route-contract-v1.json}"
BASE_LOCAL="${BASE_LOCAL:-http://127.0.0.1:${HTTP_PORT:-4100}}"

detect_remote_host() {
  local ip0=""
  ip0="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++){if($i=="src"){print $(i+1); exit}}}' || true)"
  if [ -z "$ip0" ]; then
    ip0="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  printf '%s' "$ip0"
}

REMOTE_HOST="${REMOTE_HOST:-$(detect_remote_host)}"

if [ -z "$REMOTE_HOST" ]; then
  echo "missing REMOTE_HOST; set REMOTE_HOST=<lan-or-tailscale-ip>" >&2
  exit 2
fi

BASE_REMOTE="${BASE_REMOTE:-http://${REMOTE_HOST}:${HTTP_PORT:-4100}}"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT=".runtime/mainnet0/public-route-contract-v1-proof.${STAMP}.json"
LATEST=".runtime/mainnet0/public-route-contract-v1-proof.latest.json"
TMP="$(mktemp -d)"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 127
  }
}

need curl
need jq
need python3
need grep

if [ ! -f "$CONTRACT" ]; then
  echo "missing contract fixture: $CONTRACT" >&2
  exit 3
fi

status_of() {
  local url="$1"
  timeout 8 curl -sS -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || printf '000'
}

curlj() {
  timeout 8 curl -fsS "$1"
}

for i in $(seq 1 90); do
  if timeout 5 curl -fsS "$BASE_LOCAL/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

timeout 8 curl -fsS "$BASE_LOCAL/health" >/dev/null
sleep 3

LOCAL_HEALTH="$(curlj "$BASE_LOCAL/health")"
LOCAL_STORAGE="$(curlj "$BASE_LOCAL/__void/diag/storage-repair-readiness-v1.json")"
LOCAL_CLEANUP="$(curlj "$BASE_LOCAL/__void/diag/txsubmit_canonical_cleanup.json")"
LOCAL_CANONICAL="$(curlj "$BASE_LOCAL/__void/diag/txsubmit_canonical.json")"
LOCAL_MEMPOOL="$(curlj "$BASE_LOCAL/mempool/count")"

printf '%s\n' "$LOCAL_STORAGE" | jq -e '.ok == true and .storage_repair_state == "green"' >/dev/null
printf '%s\n' "$LOCAL_CLEANUP" | jq -e '.route_count.routes == 1 and .route_count.keep == 1 and .route_count.legacy == 0' >/dev/null
printf '%s\n' "$LOCAL_CANONICAL" | jq -e '.route_count.routes == 1' >/dev/null

: > "$TMP/public.tsv"
: > "$TMP/hidden.tsv"
: > "$TMP/local_diag.tsv"

jq -r '.public_paths[].path' "$CONTRACT" | while read -r p; do
  [ -n "$p" ] || continue
  allowed="$(jq -r --arg p "$p" '.public_paths[] | select(.path == $p) | .allowed_status | join(",")' "$CONTRACT")"
  status="$(status_of "$BASE_REMOTE$p")"
  printf '%s\t%s\t%s\n' "$p" "$status" "$allowed" >> "$TMP/public.tsv"
done

jq -r '.remote_hidden_paths[].path' "$CONTRACT" | while read -r p; do
  [ -n "$p" ] || continue
  allowed="$(jq -r --arg p "$p" '.remote_hidden_paths[] | select(.path == $p) | .allowed_status | join(",")' "$CONTRACT")"
  status="$(status_of "$BASE_REMOTE$p")"
  printf '%s\t%s\t%s\n' "$p" "$status" "$allowed" >> "$TMP/hidden.tsv"
done

jq -r '.local_diag_paths[].path' "$CONTRACT" | while read -r p; do
  [ -n "$p" ] || continue
  allowed="$(jq -r --arg p "$p" '.local_diag_paths[] | select(.path == $p) | .allowed_status | join(",")' "$CONTRACT")"
  status="$(status_of "$BASE_LOCAL$p")"
  printf '%s\t%s\t%s\n' "$p" "$status" "$allowed" >> "$TMP/local_diag.tsv"
done

LEGACY_SCAN=".runtime/mainnet0/public-route-contract-v1-legacy-txsubmit-scan.${STAMP}.txt"

grep -nE 'app\.(post|use)\(["'"'"']/tx/submit["'"'"']|a\.(post|use)\(["'"'"']/tx/submit["'"'"']|Object\.prototype\.filter|globalEnqueueTx\(req\.body|handled: ?"early_singleton|handled: ?"txsubmit_late_repair_v1"' src/index.ts \
  > "$LEGACY_SCAN" || true

LEGACY_HITS="$(wc -l < "$LEGACY_SCAN" | tr -d ' ')"

BOUNDARY_RC=0
if [ -x ops/mainnet0/public-live-boundary-v1-proof.sh ]; then
  HTTP_PORT="${HTTP_PORT:-4100}" \
  BASE_LOCAL="$BASE_LOCAL" \
  BASE_REMOTE="$BASE_REMOTE" \
  REMOTE_HOST="$REMOTE_HOST" \
  ops/mainnet0/public-live-boundary-v1-proof.sh >/tmp/void-public-route-contract-boundary-proof.out 2>&1 || BOUNDARY_RC="$?"
else
  BOUNDARY_RC=127
fi

CANONICAL_RC=0
if [ -x ops/mainnet0/canonical-tx-hotpath-v1-proof.sh ]; then
  BASE="$BASE_LOCAL" ops/mainnet0/canonical-tx-hotpath-v1-proof.sh >/tmp/void-public-route-contract-canonical-proof.out 2>&1 || CANONICAL_RC="$?"
else
  CANONICAL_RC=127
fi

python3 - "$OUT" "$CONTRACT" "$BASE_LOCAL" "$BASE_REMOTE" "$REMOTE_HOST" "$TMP/public.tsv" "$TMP/hidden.tsv" "$TMP/local_diag.tsv" "$LEGACY_SCAN" "$LEGACY_HITS" "$BOUNDARY_RC" "$CANONICAL_RC" <<'PY'
import json
import subprocess
import sys
from pathlib import Path

(
    out,
    contract_path,
    base_local,
    base_remote,
    remote_host,
    public_tsv,
    hidden_tsv,
    local_diag_tsv,
    legacy_scan,
    legacy_hits,
    boundary_rc,
    canonical_rc,
) = sys.argv[1:13]

contract = json.loads(Path(contract_path).read_text())

def j(path):
    return json.loads(subprocess.check_output(["curl", "-fsS", base_local + path], text=True))

def rows(path):
    out = []
    for line in Path(path).read_text().splitlines():
        if not line.strip():
            continue
        p, status, allowed = line.split("\t", 2)
        allowed_set = [int(x) for x in allowed.split(",") if x.strip()]
        out.append({
            "path": p,
            "status": int(status),
            "allowed_status": allowed_set,
            "ok": int(status) in allowed_set,
        })
    return out

public = rows(public_tsv)
hidden = rows(hidden_tsv)
local_diag = rows(local_diag_tsv)

public_ok = bool(public) and all(r["ok"] for r in public)
hidden_ok = bool(hidden) and all(r["ok"] for r in hidden)
local_diag_ok = bool(local_diag) and all(r["ok"] for r in local_diag)
legacy_ok = int(legacy_hits) == 0
boundary_ok = int(boundary_rc) == 0
canonical_ok = int(canonical_rc) == 0

proof_ok = public_ok and hidden_ok and local_diag_ok and legacy_ok and boundary_ok and canonical_ok

proof = {
    "ok": proof_ok,
    "marker": "VOID_PUBLIC_ROUTE_CONTRACT_V1_GREEN" if proof_ok else "VOID_PUBLIC_ROUTE_CONTRACT_V1_RED",
    "contract": contract,
    "contract_path": contract_path,
    "base_local": base_local,
    "base_remote": base_remote,
    "remote_host": remote_host,
    "runtime": {
        "health": j("/health"),
        "storage": j("/__void/diag/storage-repair-readiness-v1.json"),
        "cleanup": j("/__void/diag/txsubmit_canonical_cleanup.json"),
        "canonical": j("/__void/diag/txsubmit_canonical.json"),
        "mempool_count": j("/mempool/count"),
    },
    "checks": {
        "remote_public_paths": public,
        "remote_hidden_paths": hidden,
        "local_diag_paths": local_diag,
    },
    "source_checks": {
        "legacy_txsubmit_scan": legacy_scan,
        "legacy_hits": int(legacy_hits),
        "legacy_literal_txsubmit_mounts_absent": legacy_ok,
    },
    "nested_proofs": {
        "public_live_boundary_v1_rc": int(boundary_rc),
        "public_live_boundary_v1_green": boundary_ok,
        "canonical_tx_hotpath_v1_rc": int(canonical_rc),
        "canonical_tx_hotpath_v1_green": canonical_ok,
    },
    "pass_conditions": {
        "contract_fixture_loaded": True,
        "local_storage_green": True,
        "local_txsubmit_routes_exactly_one": True,
        "remote_public_paths_match_contract": public_ok,
        "remote_hidden_paths_match_contract": hidden_ok,
        "local_diag_paths_match_contract": local_diag_ok,
        "legacy_txsubmit_source_hits_zero": legacy_ok,
        "public_live_boundary_v1_green": boundary_ok,
        "canonical_tx_hotpath_v1_green": canonical_ok,
    },
}

Path(out).write_text(json.dumps(proof, indent=2) + "\n")
print(out)

print(json.dumps({
    "marker": proof["marker"],
    "pass_conditions": proof["pass_conditions"],
    "remote_public_paths": public,
    "remote_hidden_paths": hidden,
    "local_diag_paths": local_diag,
    "source_checks": proof["source_checks"],
    "nested_proofs": proof["nested_proofs"],
}, indent=2))

if not proof_ok:
    raise SystemExit(1)
PY

cp "$OUT" "$LATEST"

jq '.marker,.pass_conditions,.checks.remote_public_paths,.checks.remote_hidden_paths,.checks.local_diag_paths,.source_checks,.nested_proofs' "$LATEST"

echo "VOID_PUBLIC_ROUTE_CONTRACT_V1_GREEN"
