#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

CONTRACT="${CONTRACT:-fixtures/public/mainnet0-public-node-route-index-contract-v1.json}"
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
OUT=".runtime/mainnet0/public-node-route-index-contract-v1-proof.${STAMP}.json"
LATEST=".runtime/mainnet0/public-node-route-index-contract-v1-proof.latest.json"
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

: > "$TMP/remote_required.tsv"

jq -r '.required_remote_public_paths[].path' "$CONTRACT" | while read -r p; do
  [ -n "$p" ] || continue
  allowed="$(jq -r --arg p "$p" '.required_remote_public_paths[] | select(.path == $p) | .allowed_status | join(",")' "$CONTRACT")"
  status="$(status_of "$BASE_REMOTE$p")"
  printf '%s\t%s\t%s\n' "$p" "$status" "$allowed" >> "$TMP/remote_required.tsv"
done

ROUTE_INDEX_FILE="$TMP/route-index.json"
DASHBOARD_FILE="$TMP/public-node.html"

curlj "$BASE_REMOTE/public-node/route-index.json" > "$ROUTE_INDEX_FILE"
timeout 8 curl -fsS "$BASE_REMOTE/public-node" > "$DASHBOARD_FILE"

LEGACY_SCAN=".runtime/mainnet0/public-node-route-index-contract-v1-legacy-txsubmit-scan.${STAMP}.txt"

grep -nE 'app\.(post|use)\(["'"'"']/tx/submit["'"'"']|a\.(post|use)\(["'"'"']/tx/submit["'"'"']|Object\.prototype\.filter|globalEnqueueTx\(req\.body|handled: ?"early_singleton|handled: ?"txsubmit_late_repair_v1"' src/index.ts \
  > "$LEGACY_SCAN" || true

LEGACY_HITS="$(wc -l < "$LEGACY_SCAN" | tr -d ' ')"

PUBLIC_ROUTE_CONTRACT_RC=0
HTTP_PORT="${HTTP_PORT:-4100}" \
BASE_LOCAL="$BASE_LOCAL" \
BASE_REMOTE="$BASE_REMOTE" \
REMOTE_HOST="$REMOTE_HOST" \
ops/mainnet0/public-route-contract-v1-proof.sh >/tmp/void-public-node-route-index-public-route-contract.out 2>&1 || PUBLIC_ROUTE_CONTRACT_RC="$?"

PUBLIC_BOUNDARY_RC=0
HTTP_PORT="${HTTP_PORT:-4100}" \
BASE_LOCAL="$BASE_LOCAL" \
BASE_REMOTE="$BASE_REMOTE" \
REMOTE_HOST="$REMOTE_HOST" \
ops/mainnet0/public-live-boundary-v1-proof.sh >/tmp/void-public-node-route-index-public-boundary.out 2>&1 || PUBLIC_BOUNDARY_RC="$?"

CANONICAL_RC=0
BASE="$BASE_LOCAL" \
ops/mainnet0/canonical-tx-hotpath-v1-proof.sh >/tmp/void-public-node-route-index-canonical.out 2>&1 || CANONICAL_RC="$?"

python3 - "$OUT" "$CONTRACT" "$BASE_LOCAL" "$BASE_REMOTE" "$REMOTE_HOST" "$TMP/remote_required.tsv" "$ROUTE_INDEX_FILE" "$DASHBOARD_FILE" "$LEGACY_SCAN" "$LEGACY_HITS" "$PUBLIC_ROUTE_CONTRACT_RC" "$PUBLIC_BOUNDARY_RC" "$CANONICAL_RC" <<'PY'
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
    remote_required_tsv,
    route_index_file,
    dashboard_file,
    legacy_scan,
    legacy_hits,
    public_route_contract_rc,
    public_boundary_rc,
    canonical_rc,
) = sys.argv[1:14]

contract = json.loads(Path(contract_path).read_text())
route_index = json.loads(Path(route_index_file).read_text())
dashboard_html = Path(dashboard_file).read_text(errors="replace")

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

def collect_paths(x):
    found = []
    if isinstance(x, dict):
      for k, v in x.items():
        if k == "path" and isinstance(v, str):
          found.append(v)
        found.extend(collect_paths(v))
    elif isinstance(x, list):
      for v in x:
        found.extend(collect_paths(v))
    return found

remote_required = rows(remote_required_tsv)

route_paths = sorted(set(collect_paths(route_index)))
must_include = contract["required_route_index"]["must_include_paths"]
forbidden_prefixes = contract["required_route_index"]["forbidden_path_prefixes"]
forbidden_exact = set(contract["required_route_index"]["forbidden_exact_paths"])

route_marker_ok = route_index.get("marker") == contract["required_route_index"]["marker"]
must_include_ok = all(p in route_paths or p in dashboard_html for p in must_include)

forbidden_hits = []
for p in route_paths:
    if p in forbidden_exact:
        forbidden_hits.append(p)
    for prefix in forbidden_prefixes:
        if p.startswith(prefix):
            forbidden_hits.append(p)

remote_required_ok = bool(remote_required) and all(r["ok"] for r in remote_required)
forbidden_ok = not forbidden_hits
legacy_ok = int(legacy_hits) == 0
public_route_contract_ok = int(public_route_contract_rc) == 0
public_boundary_ok = int(public_boundary_rc) == 0
canonical_ok = int(canonical_rc) == 0

proof_ok = (
    remote_required_ok and
    route_marker_ok and
    must_include_ok and
    forbidden_ok and
    legacy_ok and
    public_route_contract_ok and
    public_boundary_ok and
    canonical_ok
)

proof = {
    "ok": proof_ok,
    "marker": "VOID_PUBLIC_NODE_ROUTE_INDEX_CONTRACT_V1_GREEN" if proof_ok else "VOID_PUBLIC_NODE_ROUTE_INDEX_CONTRACT_V1_RED",
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
        "mempool_count": j("/mempool/count")
    },
    "checks": {
        "remote_required_paths": remote_required,
        "route_index_marker_ok": route_marker_ok,
        "route_index_marker": route_index.get("marker"),
        "route_index_path_count": len(route_paths),
        "must_include_paths": must_include,
        "must_include_ok": must_include_ok,
        "forbidden_route_index_hits": sorted(set(forbidden_hits)),
        "forbidden_route_index_hits_zero": forbidden_ok,
        "dashboard_contains_public_node": "/public-node" in dashboard_html
    },
    "source_checks": {
        "legacy_txsubmit_scan": legacy_scan,
        "legacy_hits": int(legacy_hits),
        "legacy_literal_txsubmit_mounts_absent": legacy_ok
    },
    "nested_proofs": {
        "public_route_contract_v1_rc": int(public_route_contract_rc),
        "public_route_contract_v1_green": public_route_contract_ok,
        "public_live_boundary_v1_rc": int(public_boundary_rc),
        "public_live_boundary_v1_green": public_boundary_ok,
        "canonical_tx_hotpath_v1_rc": int(canonical_rc),
        "canonical_tx_hotpath_v1_green": canonical_ok
    },
    "pass_conditions": {
        "contract_fixture_loaded": True,
        "remote_public_node_paths_reachable": remote_required_ok,
        "route_index_marker_matches_contract": route_marker_ok,
        "route_index_must_include_paths_present": must_include_ok,
        "route_index_sensitive_paths_absent": forbidden_ok,
        "legacy_txsubmit_source_hits_zero": legacy_ok,
        "public_route_contract_v1_green": public_route_contract_ok,
        "public_live_boundary_v1_green": public_boundary_ok,
        "canonical_tx_hotpath_v1_green": canonical_ok
    }
}

Path(out).write_text(json.dumps(proof, indent=2) + "\n")

print(out)
print(json.dumps({
    "marker": proof["marker"],
    "pass_conditions": proof["pass_conditions"],
    "checks": proof["checks"],
    "source_checks": proof["source_checks"],
    "nested_proofs": proof["nested_proofs"]
}, indent=2))

if not proof_ok:
    raise SystemExit(1)
PY

cp "$OUT" "$LATEST"

jq '.marker,.pass_conditions,.checks.remote_required_paths,.checks.route_index_path_count,.checks.forbidden_route_index_hits,.source_checks,.nested_proofs,.runtime.cleanup.route_count,.runtime.canonical.route_count,.runtime.mempool_count' "$LATEST"

echo "VOID_PUBLIC_NODE_ROUTE_INDEX_CONTRACT_V1_GREEN"
