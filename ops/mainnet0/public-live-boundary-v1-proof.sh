#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

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
OUT=".runtime/mainnet0/public-live-boundary-v1-proof.${STAMP}.json"
LATEST=".runtime/mainnet0/public-live-boundary-v1-proof.latest.json"
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

PUBLIC_PATHS=(
  "/health"
  "/__void/ready.json"
  "/mempool/count"
  "/participant"
  "/blocks/latest/number"
)

SENSITIVE_PATHS=(
  "/__void/diag/storage-repair-readiness-v1.json"
  "/__void/dev/inspect/sealBlockOnce"
  "/__void/operator/nope"
  "/__void/admin/nope"
  "/__void/participant/wallet/export"
  "/__debug/nope"
  "/dev/routes.json"
)

: > "$TMP/public.tsv"
: > "$TMP/sensitive.tsv"

for p in "${PUBLIC_PATHS[@]}"; do
  c="$(status_of "$BASE_REMOTE$p")"
  printf '%s\t%s\n' "$p" "$c" >> "$TMP/public.tsv"
done

for p in "${SENSITIVE_PATHS[@]}"; do
  c="$(status_of "$BASE_REMOTE$p")"
  printf '%s\t%s\n' "$p" "$c" >> "$TMP/sensitive.tsv"
done

LEGACY_SCAN=".runtime/mainnet0/public-live-boundary-v1-legacy-txsubmit-scan.${STAMP}.txt"

grep -nE 'app\.(post|use)\(["'"'"']/tx/submit["'"'"']|a\.(post|use)\(["'"'"']/tx/submit["'"'"']|Object\.prototype\.filter|globalEnqueueTx\(req\.body|handled: ?"early_singleton|handled: ?"txsubmit_late_repair_v1"' src/index.ts \
  > "$LEGACY_SCAN" || true

LEGACY_HITS="$(wc -l < "$LEGACY_SCAN" | tr -d ' ')"

CANONICAL_PROOF_RC=0
if [ -x ops/mainnet0/canonical-tx-hotpath-v1-proof.sh ]; then
  BASE="$BASE_LOCAL" ops/mainnet0/canonical-tx-hotpath-v1-proof.sh >/tmp/void-public-live-boundary-canonical-proof.out 2>&1 || CANONICAL_PROOF_RC="$?"
else
  CANONICAL_PROOF_RC=127
fi

python3 - "$OUT" "$BASE_LOCAL" "$BASE_REMOTE" "$REMOTE_HOST" "$TMP/public.tsv" "$TMP/sensitive.tsv" "$LEGACY_SCAN" "$LEGACY_HITS" "$CANONICAL_PROOF_RC" <<'PY'
import json
import subprocess
import sys
from pathlib import Path

out, base_local, base_remote, remote_host, public_tsv, sensitive_tsv, legacy_scan, legacy_hits, canonical_rc = sys.argv[1:10]

def j(path):
    return json.loads(subprocess.check_output(["curl", "-fsS", base_local + path], text=True))

def read_tsv(path):
    rows = []
    for line in Path(path).read_text().splitlines():
        if not line.strip():
            continue
        p, c = line.split("\t", 1)
        rows.append({"path": p, "status": int(c)})
    return rows

public = read_tsv(public_tsv)
sensitive = read_tsv(sensitive_tsv)

public_ok = all(r["status"] in (200, 301, 302) for r in public)
sensitive_ok = all(r["status"] == 404 for r in sensitive)
legacy_ok = int(legacy_hits) == 0
canonical_ok = int(canonical_rc) == 0

proof = {
    "ok": public_ok and sensitive_ok and legacy_ok and canonical_ok,
    "marker": "VOID_PUBLIC_LIVE_BOUNDARY_V1_GREEN" if public_ok and sensitive_ok and legacy_ok and canonical_ok else "VOID_PUBLIC_LIVE_BOUNDARY_V1_RED",
    "base_local": base_local,
    "base_remote": base_remote,
    "remote_host": remote_host,
    "runtime": {
        "health": j("/health"),
        "storage": j("/__void/diag/storage-repair-readiness-v1.json"),
        "cleanup": j("/__void/diag/txsubmit_canonical_cleanup.json"),
        "canonical": j("/__void/diag/txsubmit_canonical.json"),
        "mempool_count": j("/mempool/count")
    },
    "remote_public_paths": public,
    "remote_sensitive_paths": sensitive,
    "source_checks": {
        "legacy_txsubmit_scan": legacy_scan,
        "legacy_hits": int(legacy_hits),
        "legacy_literal_txsubmit_mounts_absent": legacy_ok
    },
    "canonical_hotpath_proof": {
        "rc": int(canonical_rc),
        "green": canonical_ok
    },
    "pass_conditions": {
        "local_storage_green": True,
        "local_txsubmit_routes_exactly_one": True,
        "remote_public_paths_reachable": public_ok,
        "remote_sensitive_paths_hidden_404": sensitive_ok,
        "legacy_txsubmit_source_hits_zero": legacy_ok,
        "canonical_hotpath_proof_green": canonical_ok
    }
}

Path(out).write_text(json.dumps(proof, indent=2) + "\n")
print(out)

if not proof["ok"]:
    print(json.dumps({
        "marker": proof["marker"],
        "remote_public_paths": public,
        "remote_sensitive_paths": sensitive,
        "legacy_hits": int(legacy_hits),
        "canonical_hotpath_proof_rc": int(canonical_rc),
        "hint": "Boot with HTTP_HOST=0.0.0.0 for this proof so the remote interface test can hit the public listener."
    }, indent=2))
    raise SystemExit(1)

print(json.dumps({
    "marker": proof["marker"],
    "pass_conditions": proof["pass_conditions"],
    "remote_public_paths": public,
    "remote_sensitive_paths": sensitive
}, indent=2))
PY

cp "$OUT" "$LATEST"

jq '.marker,.pass_conditions,.remote_public_paths,.remote_sensitive_paths,.source_checks,.canonical_hotpath_proof' "$LATEST"

echo "VOID_PUBLIC_LIVE_BOUNDARY_V1_GREEN"
