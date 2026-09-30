#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DOC="docs/ops/alienware-runtime-service.md"

echo "=== Alienware retired runtime service history proof ==="

test -f "$DOC"

grep -Fq "VOID_ALIENWARE_USER_SERVICE_RESTART_V1" "$DOC"
grep -Fq "VOID_ALIENWARE_NO_SYSTEM_SERVICE_RESTART_V1" "$DOC"
grep -Fq "VOID_ALIENWARE_RUNTIME_SERVICE_DOC_V1" "$DOC"
grep -Fq "VOID_RETIRED_ALIENWARE_RUNTIME_SERVICE_HISTORY_V1" "$DOC"

grep -Fq "Status: retired historical evidence" "$DOC"
grep -Fq "Current authority: none" "$DOC"
grep -Fq "Alienware is permanently retired" "$DOC"
grep -Fq "Do not execute these commands as current operations" "$DOC"

if grep -Fq "Status: current operational truth" "$DOC"; then
  echo "[fatal] retired Alienware document regained present-tense authority" >&2
  exit 1
fi

# Preserve exact historical facts without executing them.
grep -Fq "systemctl --user restart void-node.service" "$DOC"
grep -Fq "sudo systemctl restart void-node.service" "$DOC"
grep -Fq "npm exec tsx src/index.ts" "$DOC"
grep -Fq "4100" "$DOC"
grep -Fq "4700" "$DOC"

echo "VOID_RETIRED_ALIENWARE_RUNTIME_SERVICE_HISTORY_V1_GREEN"
echo "historical_evidence_only=true"
echo "current_runtime_authority=false"
echo "runtime_mutation_performed=false"
