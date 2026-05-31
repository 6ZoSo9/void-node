#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DOC="docs/ops/alienware-runtime-service.md"

echo "=== Alienware runtime service doc proof ==="

test -f "$DOC"

grep -q "VOID_ALIENWARE_USER_SERVICE_RESTART_V1" "$DOC"
grep -q "VOID_ALIENWARE_NO_SYSTEM_SERVICE_RESTART_V1" "$DOC"
grep -q "VOID_ALIENWARE_RUNTIME_SERVICE_DOC_V1" "$DOC"

grep -q "systemctl --user restart void-node.service" "$DOC"
grep -q "sudo systemctl restart void-node.service" "$DOC"
grep -q "Alienware runs the VOID node as a user-level systemd service" "$DOC"
grep -q "npm exec tsx src/index.ts" "$DOC"
grep -q "4100" "$DOC"
grep -q "4700" "$DOC"

echo "alienware_runtime_service_doc_proof=green"
