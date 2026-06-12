#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"

echo "=== VOID Public Node Local Data Drop Current Capability Route Source Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_runtime_restart=true"
echo "source_only=true"

test -f "$SRC"

grep -Fq 'APP.get("/public-node/local-data-drop/current-capability.json"' "$SRC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_ROUTE_V1" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_V1" "$SRC"
grep -Fq "current_capability_ready" "$SRC"
grep -Fq "live-import-demo-002.txt" "$SRC"
grep -Fq "264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871" "$SRC"
grep -Fq "local_data_drop_current_capability" "$SRC"
grep -Fq "operator_local_import_only: true" "$SRC"
grep -Fq "public_read_only: true" "$SRC"
grep -Fq "mutation_from_public: false" "$SRC"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_ROUTE_SOURCE_V1_GREEN"
