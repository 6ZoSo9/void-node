#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

CONTRACT="${CONTRACT:-fixtures/public/mainnet0-public-node-self-check-snapshot-contract-v1.json}"
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
OUT=".runtime/mainnet0/public-node-self-check-snapshot-contract-v1-proof.${STAMP}.json"
LATEST=".runtime/mainnet0/public-node-self-check-snapshot-contract-v1-proof.latest.json"
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

SNAPSHOT_FILE="$TMP/self-check-snapshot.json"
MANIFEST_FILE="$TMP/route-manifest.json"
ROUTE_INDEX_FILE="$TMP/route-index.json"
WELL_KNOWN_FILE="$TMP/well-known.json"

curlj "$BASE_REMOTE/public-node/self-check-snapshot.json" > "$SNAPSHOT_FILE"
curlj "$BASE_REMOTE/public-node/route-manifest.json" > "$MANIFEST_FILE"
curlj "$BASE_REMOTE/public-node/route-index.json" > "$ROUTE_INDEX_FILE"
curlj "$BASE_REMOTE/.well-known/void-public-node.json" > "$WELL_KNOWN_FILE"

LEGACY_SCAN=".runtime/mainnet0/public-node-self-check-snapshot-contract-v1-legacy-txsubmit-scan.${STAMP}.txt"

grep -nE 'app\.(post|use)\(["'"'"']/tx/submit["'"'"']|a\.(post|use)\(["'"'"']/tx/submit["'"'"']|Object\.prototype\.filter|globalEnqueueTx\(req\.body|handled: ?"early_singleton|handled: ?"txsubmit_late_repair_v1"' src/index.ts \
  > "$LEGACY_SCAN" || true

LEGACY_HITS="$(wc -l < "$LEGACY_SCAN" | tr -d ' ')"

PUBLIC_NODE_ROUTE_MANIFEST_RC=0
HTTP_PORT="${HTTP_PORT:-4100}" \
BASE_LOCAL="$BASE_LOCAL" \
BASE_REMOTE="$BASE_REMOTE" \
REMOTE_HOST="$REMOTE_HOST" \
ops/mainnet0/public-node-route-manifest-contract-v1-proof.sh >/tmp/void-public-node-self-check-route-manifest.out 2>&1 || PUBLIC_NODE_ROUTE_MANIFEST_RC="$?"

PUBLIC_NODE_ROUTE_INDEX_RC=0
HTTP_PORT="${HTTP_PORT:-4100}" \
BASE_LOCAL="$BASE_LOCAL" \
BASE_REMOTE="$BASE_REMOTE" \
REMOTE_HOST="$REMOTE_HOST" \
ops/mainnet0/public-node-route-index-contract-v1-proof.sh >/tmp/void-public-node-self-check-route-index.out 2>&1 || PUBLIC_NODE_ROUTE_INDEX_RC="$?"

PUBLIC_ROUTE_CONTRACT_RC=0
HTTP_PORT="${HTTP_PORT:-4100}" \
BASE_LOCAL="$BASE_LOCAL" \
BASE_REMOTE="$BASE_REMOTE" \
REMOTE_HOST="$REMOTE_HOST" \
ops/mainnet0/public-route-contract-v1-proof.sh >/tmp/void-public-node-self-check-public-route-contract.out 2>&1 || PUBLIC_ROUTE_CONTRACT_RC="$?"

PUBLIC_BOUNDARY_RC=0
HTTP_PORT="${HTTP_PORT:-4100}" \
BASE_LOCAL="$BASE_LOCAL" \
BASE_REMOTE="$BASE_REMOTE" \
REMOTE_HOST="$REMOTE_HOST" \
ops/mainnet0/public-live-boundary-v1-proof.sh >/tmp/void-public-node-self-check-public-boundary.out 2>&1 || PUBLIC_BOUNDARY_RC="$?"

CANONICAL_RC=0
BASE="$BASE_LOCAL" \
ops/mainnet0/canonical-tx-hotpath-v1-proof.sh >/tmp/void-public-node-self-check-canonical.out 2>&1 || CANONICAL_RC="$?"

python3 - "$OUT" "$CONTRACT" "$BASE_LOCAL" "$BASE_REMOTE" "$REMOTE_HOST" "$TMP/remote_required.tsv" "$SNAPSHOT_FILE" "$MANIFEST_FILE" "$ROUTE_INDEX_FILE" "$WELL_KNOWN_FILE" "$LEGACY_SCAN" "$LEGACY_HITS" "$PUBLIC_NODE_ROUTE_MANIFEST_RC" "$PUBLIC_NODE_ROUTE_INDEX_RC" "$PUBLIC_ROUTE_CONTRACT_RC" "$PUBLIC_BOUNDARY_RC" "$CANONICAL_RC" <<'PY'
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
    snapshot_file,
    manifest_file,
    route_index_file,
    well_known_file,
    legacy_scan,
    legacy_hits,
    public_node_route_manifest_rc,
    public_node_route_index_rc,
    public_route_contract_rc,
    public_boundary_rc,
    canonical_rc,
) = sys.argv[1:18]

contract = json.loads(Path(contract_path).read_text())
snapshot = json.loads(Path(snapshot_file).read_text())
manifest = json.loads(Path(manifest_file).read_text())
route_index = json.loads(Path(route_index_file).read_text())
well_known = json.loads(Path(well_known_file).read_text())

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
        for _k, v in x.items():
            if isinstance(v, str) and v.startswith("/"):
                found.append(v)
            found.extend(collect_paths(v))
    elif isinstance(x, list):
        for v in x:
            found.extend(collect_paths(v))
    return found

def collect_urls(x):
    found = []
    if isinstance(x, dict):
        for _k, v in x.items():
            if isinstance(v, str) and (v.startswith("http://") or v.startswith("https://")):
                found.append(v)
            found.extend(collect_urls(v))
    elif isinstance(x, list):
        for v in x:
            found.extend(collect_urls(v))
    return found

remote_required = rows(remote_required_tsv)
remote_required_ok = bool(remote_required) and all(r["ok"] for r in remote_required)

required = contract["required_snapshot"]
required_manifest_entry = contract["required_manifest_entry"]
required_policy = contract["policy_if_present"]

snapshot_marker_ok = snapshot.get("marker") == required["marker"]
snapshot_status_ok = snapshot.get("status") == required["status"]

expected_routes = snapshot.get("expected_routes")
if not isinstance(expected_routes, list):
    expected_routes = []
expected_routes = [str(x) for x in expected_routes]

expected_route_count = int(snapshot.get("expected_route_count") or 0)
expected_route_count_matches = expected_route_count == len(expected_routes)
expected_route_count_min_ok = expected_route_count >= int(required["min_expected_route_count"])

missing_expected_routes = [p for p in required["must_include_expected_routes"] if p not in expected_routes]
must_include_ok = not missing_expected_routes

forbidden_hits = []
for p in expected_routes:
    if p in set(required["forbidden_exact_routes"]):
        forbidden_hits.append(p)
    for prefix in required["forbidden_expected_route_prefixes"]:
        if p.startswith(prefix):
            forbidden_hits.append(p)
forbidden_ok = not forbidden_hits

links = snapshot.get("links") if isinstance(snapshot.get("links"), dict) else {}
missing_links = [k for k in required["required_links"] if k not in links or not str(links.get(k) or "").startswith(("http://", "https://"))]
links_ok = not missing_links

policy = snapshot.get("policy") if isinstance(snapshot.get("policy"), dict) else {}
policy_mismatches = {}
if policy:
    for k, expected in required_policy.items():
        if policy.get(k) is not expected:
            policy_mismatches[k] = {"expected": expected, "actual": policy.get(k)}
policy_ok = not policy_mismatches

manifest_routes = manifest.get("routes") if isinstance(manifest.get("routes"), list) else []
manifest_entry = None
for r in manifest_routes:
    if isinstance(r, dict) and r.get("path") == required_manifest_entry["path"]:
        manifest_entry = r
        break

manifest_entry_ok = (
    isinstance(manifest_entry, dict)
    and manifest_entry.get("marker") == required_manifest_entry["marker"]
    and manifest_entry.get("safety_class") == required_manifest_entry["safety_class"]
)

route_index_paths = collect_paths(route_index)
route_index_discovers_snapshot = required_manifest_entry["path"] in route_index_paths

well_known_urls = collect_urls(well_known)
well_known_discovers_snapshot = any(required_manifest_entry["path"] in u for u in well_known_urls)

legacy_ok = int(legacy_hits) == 0
public_node_route_manifest_ok = int(public_node_route_manifest_rc) == 0
public_node_route_index_ok = int(public_node_route_index_rc) == 0
public_route_contract_ok = int(public_route_contract_rc) == 0
public_boundary_ok = int(public_boundary_rc) == 0
canonical_ok = int(canonical_rc) == 0

proof_ok = (
    remote_required_ok and
    snapshot_marker_ok and
    snapshot_status_ok and
    expected_route_count_matches and
    expected_route_count_min_ok and
    must_include_ok and
    forbidden_ok and
    links_ok and
    policy_ok and
    manifest_entry_ok and
    route_index_discovers_snapshot and
    well_known_discovers_snapshot and
    legacy_ok and
    public_node_route_manifest_ok and
    public_node_route_index_ok and
    public_route_contract_ok and
    public_boundary_ok and
    canonical_ok
)

proof = {
    "ok": proof_ok,
    "marker": "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_CONTRACT_V1_GREEN" if proof_ok else "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_CONTRACT_V1_RED",
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
        "snapshot_marker_ok": snapshot_marker_ok,
        "snapshot_marker": snapshot.get("marker"),
        "snapshot_status_ok": snapshot_status_ok,
        "snapshot_status": snapshot.get("status"),
        "expected_route_count": expected_route_count,
        "expected_routes_len": len(expected_routes),
        "expected_route_count_matches": expected_route_count_matches,
        "expected_route_count_min_ok": expected_route_count_min_ok,
        "missing_expected_routes": missing_expected_routes,
        "must_include_ok": must_include_ok,
        "forbidden_expected_route_hits": sorted(set(forbidden_hits)),
        "forbidden_expected_route_hits_zero": forbidden_ok,
        "missing_required_links": missing_links,
        "links_ok": links_ok,
        "policy_present": bool(policy),
        "policy_mismatches": policy_mismatches,
        "policy_ok": policy_ok,
        "manifest_entry": manifest_entry,
        "manifest_entry_ok": manifest_entry_ok,
        "route_index_discovers_snapshot": route_index_discovers_snapshot,
        "well_known_discovers_snapshot": well_known_discovers_snapshot
    },
    "source_checks": {
        "legacy_txsubmit_scan": legacy_scan,
        "legacy_hits": int(legacy_hits),
        "legacy_literal_txsubmit_mounts_absent": legacy_ok
    },
    "nested_proofs": {
        "public_node_route_manifest_contract_v1_rc": int(public_node_route_manifest_rc),
        "public_node_route_manifest_contract_v1_green": public_node_route_manifest_ok,
        "public_node_route_index_contract_v1_rc": int(public_node_route_index_rc),
        "public_node_route_index_contract_v1_green": public_node_route_index_ok,
        "public_route_contract_v1_rc": int(public_route_contract_rc),
        "public_route_contract_v1_green": public_route_contract_ok,
        "public_live_boundary_v1_rc": int(public_boundary_rc),
        "public_live_boundary_v1_green": public_boundary_ok,
        "canonical_tx_hotpath_v1_rc": int(canonical_rc),
        "canonical_tx_hotpath_v1_green": canonical_ok
    },
    "pass_conditions": {
        "contract_fixture_loaded": True,
        "remote_self_check_snapshot_reachable": remote_required_ok,
        "snapshot_marker_matches_contract": snapshot_marker_ok,
        "snapshot_status_matches_contract": snapshot_status_ok,
        "snapshot_expected_route_count_matches": expected_route_count_matches,
        "snapshot_expected_route_count_meets_minimum": expected_route_count_min_ok,
        "snapshot_must_include_routes_present": must_include_ok,
        "snapshot_sensitive_routes_absent": forbidden_ok,
        "snapshot_required_links_present": links_ok,
        "snapshot_policy_if_present_matches_contract": policy_ok,
        "route_manifest_entry_matches_snapshot": manifest_entry_ok,
        "route_index_discovers_snapshot": route_index_discovers_snapshot,
        "well_known_discovers_snapshot": well_known_discovers_snapshot,
        "legacy_txsubmit_source_hits_zero": legacy_ok,
        "public_node_route_manifest_contract_v1_green": public_node_route_manifest_ok,
        "public_node_route_index_contract_v1_green": public_node_route_index_ok,
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

jq '.marker,.pass_conditions,.checks.remote_required_paths,.checks.expected_route_count,.checks.missing_expected_routes,.checks.forbidden_expected_route_hits,.checks.missing_required_links,.checks.policy_mismatches,.checks.manifest_entry_ok,.checks.route_index_discovers_snapshot,.checks.well_known_discovers_snapshot,.source_checks,.nested_proofs,.runtime.cleanup.route_count,.runtime.canonical.route_count,.runtime.mempool_count' "$LATEST"

echo "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_CONTRACT_V1_GREEN"
