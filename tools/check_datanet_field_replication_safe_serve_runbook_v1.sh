#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/datanet-field-replication-safe-serve-runbook-v1.md"

test -f "$doc"

grep -Fq 'DataNet field replication safe serve runbook v1' "$doc"
grep -Fq 'npm run public-node:serve -- --port 8088' "$doc"
grep -Fq 'npm run public-node:serve -- --port 8089' "$doc"
grep -Fq 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' "$doc"
grep -Fq 'VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN' "$doc"
grep -Fq 'VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN' "$doc"
grep -Fq 'VOID_FIELD_REPORT_V1_READY' "$doc"
grep -Fq 'dangerous_paths_touched=false' "$doc"
grep -Fq 'match=true' "$doc"
grep -Fq 'host=<field-node-hostname>' "$doc"

! grep -Fq '100.122.245.125' "$doc"
! grep -Fq '100.111.171.116' "$doc"
! grep -Fq 'zoso-Precision-Tower-7810' "$doc"
! grep -Fq 'zoso-N153B' "$doc"

echo "VOID_DATANET_FIELD_REPLICATION_SAFE_SERVE_RUNBOOK_V1_GREEN"
