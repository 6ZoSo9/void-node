#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_BEGIN"
echo "host=$(hostname)"
echo "branch=$(git branch --show-current)"
echo "head=$(git rev-parse --short HEAD)"

python3 - <<'PY'
from pathlib import Path
import re
from collections import Counter

src = Path("src/index.ts")
text = src.read_text()
lines = text.splitlines()

# Literal GET handlers only. This intentionally ignores route-index JSON entries
# and other string references because we only care about actual route handlers here.
get_re = re.compile(r'\b(?:APP|app)\.get\(\s*"([^"]+)"')
post_re = re.compile(r'\b(?:APP|app)\.(post|put|patch|delete)\(\s*"([^"]+)"')

public_gets = []
public_mutations = []

for n, line in enumerate(lines, 1):
    gm = get_re.search(line)
    if gm:
        path = gm.group(1)
        if path.startswith("/public-node") or path == "/.well-known/void-public-node.json" or path == "/proofs":
            public_gets.append((path, n))

    mm = post_re.search(line)
    if mm:
        method, path = mm.group(1).upper(), mm.group(2)
        if path.startswith("/public-node"):
            public_mutations.append((method, path, n))

counts = Counter(path for path, _ in public_gets)
dupes = sorted(path for path, c in counts.items() if c > 1)

print("public_literal_get_count=" + str(len(public_gets)))
print("public_literal_get_unique_count=" + str(len(counts)))
print("public_literal_get_duplicate_count=" + str(len(dupes)))

if dupes:
    print("duplicate_public_get_routes_begin")
    for path in dupes:
        route_lines = [str(n) for p, n in public_gets if p == path]
        print(f"{path} lines={','.join(route_lines)}")
    print("duplicate_public_get_routes_end")
    raise SystemExit(11)

if public_mutations:
    print("public_mutation_routes_begin")
    for method, path, n in public_mutations:
        print(f"{method} {path} line={n}")
    print("public_mutation_routes_end")
    raise SystemExit(12)

required_markers = [
    "VOID_PUBLIC_NODE_ROUTE_INDEX_V1",
    "VOID_FUNDING_GATEWAY_CARD_UI_V1",
    "VOID_FUNDING_PATH_TIGHTEN_V1",
    "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1",
    "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN",
]

# The preflight marker is in the script, not src/index.ts. Check it separately below.
src_required = required_markers[:-1]
missing = [m for m in src_required if m not in text]
if missing:
    print("missing_required_src_markers_begin")
    for m in missing:
        print(m)
    print("missing_required_src_markers_end")
    raise SystemExit(13)

for forbidden in [
    'APP.get("/public-node/funding-proof-pack-v1.json"',
    'app.get("/public-node/funding-proof-pack-v1.json"',
    'APP.get("/public-node/funding-safe-public-packet-v1.json"',
    'app.get("/public-node/funding-safe-public-packet-v1.json"',
]:
    if forbidden in text:
        print(f"forbidden_runtime_route_present={forbidden}")
        raise SystemExit(14)

print("public_surface_route_registry_safety_audit_green=true")
PY

bash ops/mainnet0/runtime-route-patch-safety-preflight-v1.sh >/tmp/void-runtime-route-patch-safety-preflight-v1.audit.out
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" /tmp/void-runtime-route-patch-safety-preflight-v1.audit.out >/dev/null

echo "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN"
