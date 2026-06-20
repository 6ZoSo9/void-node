#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_BEGIN"
echo "host=$(hostname)"
echo "branch=$(git branch --show-current)"
echo "head=$(git rev-parse --short HEAD)"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("src/index.ts")
text = src.read_text()
lines = text.splitlines()

# Literal route handlers only. We intentionally scan actual APP/app method handlers,
# not route-index JSON strings or documentation references.
mutation_re = re.compile(r'\b(?:APP|app)\.(post|put|patch|delete)\(\s*["\']([^"\']+)["\']')
all_mutations = []
public_node_mutations = []

for n, line in enumerate(lines, 1):
    m = mutation_re.search(line)
    if not m:
        continue
    method = m.group(1).upper()
    path = m.group(2)
    all_mutations.append((method, path, n))
    if path.startswith("/public-node"):
        public_node_mutations.append((method, path, n))

print(f"literal_mutation_handler_count={len(all_mutations)}")
print(f"public_node_literal_mutation_handler_count={len(public_node_mutations)}")

if public_node_mutations:
    print("public_node_literal_mutation_handlers_begin")
    for method, path, n in public_node_mutations:
        print(f"{method} {path} line={n}")
    print("public_node_literal_mutation_handlers_end")
    raise SystemExit(11)

required_markers = [
    "VOID_FUNDING_GATEWAY_CARD_UI_V1",
    "VOID_FUNDING_PATH_TIGHTEN_V1",
    "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1",
]
missing = [m for m in required_markers if m not in text]
if missing:
    print("missing_required_public_src_markers_begin")
    for marker in missing:
        print(marker)
    print("missing_required_public_src_markers_end")
    raise SystemExit(12)

for forbidden in [
    'APP.post("/public-node',
    'APP.put("/public-node',
    'APP.patch("/public-node',
    'APP.delete("/public-node',
    "app.post('/public-node",
    "app.put('/public-node",
    "app.patch('/public-node",
    "app.delete('/public-node",
]:
    if forbidden in text:
        print(f"forbidden_public_node_mutation_pattern_present={forbidden}")
        raise SystemExit(13)

print("public_node_mutation_method_boundary_green=true")
PY

bash ops/mainnet0/runtime-route-patch-safety-preflight-v1.sh >/tmp/void-public-mutation-boundary-preflight.out
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" /tmp/void-public-mutation-boundary-preflight.out >/dev/null

bash ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh >/tmp/void-public-mutation-boundary-route-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-public-mutation-boundary-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-public-mutation-boundary-route-audit.out >/dev/null

echo "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN"
