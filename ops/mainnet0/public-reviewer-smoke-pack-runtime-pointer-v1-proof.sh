#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

src="src/index.ts"
doc="docs/public/public-reviewer-smoke-pack-runtime-pointer-v1.md"

grep -F 'VOID_PUBLIC_REVIEWER_SMOKE_PACK_RUNTIME_POINTER_DOC_V1' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_SMOKE_PACK_RUNTIME_POINTER_V1' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_CLOSEOUT_SEAL_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_REVIEWER_GREEN' "$doc" >/dev/null
grep -F 'runtime_route_added=false' "$doc" >/dev/null
grep -F 'public_literal_get_count=159' "$doc" >/dev/null
grep -F 'public_literal_get_duplicate_count=0' "$doc" >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' "$doc" >/dev/null

grep -F 'VOID_PUBLIC_REVIEWER_SMOKE_PACK_RUNTIME_POINTER_V1' "$src" >/dev/null
grep -F 'smoke_pack:' "$src" >/dev/null
grep -F 'proof_marker: "VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_GREEN"' "$src" >/dev/null
grep -F 'closeout_marker: "VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_CLOSEOUT_SEAL_V1_GREEN"' "$src" >/dev/null
grep -F 'reviewer_success_marker: "VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_REVIEWER_GREEN"' "$src" >/dev/null
grep -F 'public_route_added: false' "$src" >/dev/null
grep -F 'route_count_expected: 159' "$src" >/dev/null
grep -F '<h2>One-command smoke pack</h2>' "$src" >/dev/null
grep -F 'docs/public/public-reviewer-one-command-smoke-pack-v1.md' "$src" >/dev/null

bash ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh >/tmp/void-smoke-pointer-route-audit.out
grep -F 'public_literal_get_count=159' /tmp/void-smoke-pointer-route-audit.out >/dev/null
grep -F 'public_literal_get_unique_count=159' /tmp/void-smoke-pointer-route-audit.out >/dev/null
grep -F 'public_literal_get_duplicate_count=0' /tmp/void-smoke-pointer-route-audit.out >/dev/null
grep -F 'VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN' /tmp/void-smoke-pointer-route-audit.out >/dev/null

bash ops/mainnet0/public-reviewer-one-command-smoke-pack-closeout-seal-v1-proof.sh >/tmp/void-smoke-pointer-closeout.out
grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_CLOSEOUT_SEAL_V1_GREEN' /tmp/void-smoke-pointer-closeout.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-smoke-pointer-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-smoke-pointer-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-smoke-pointer-mutation.out >/dev/null

echo 'VOID_PUBLIC_REVIEWER_SMOKE_PACK_RUNTIME_POINTER_V1_GREEN'
