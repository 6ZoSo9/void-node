#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-alienware-rejoin-runbook.md"

echo "=== VOID Public Node Alienware Rejoin Runbook Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -f docs/public/public-node-precision-only-storm-baseline.md
test -x ops/mainnet0/public-node-precision-only-storm-baseline-proof.sh

grep -Fq "VOID_PUBLIC_NODE_ALIENWARE_REJOIN_RUNBOOK_V1" "$DOC"
grep -Fq "Alienware is temporarily offline after a storm" "$DOC"
grep -Fq "0f44b8d7" "$DOC"
grep -Fq "ckpt-public-node-precision-only-storm-baseline-green-20260612-084430" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_PRECISION_ONLY_STORM_BASELINE_V1_GREEN" "$DOC"
grep -Fq "This is not cross-box green" "$DOC"
grep -Fq "git fetch origin main --tags" "$DOC"
grep -Fq "git reset --hard origin/main" "$DOC"
grep -Fq "systemctl --user restart void-node.service" "$DOC"
grep -Fq "curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json" "$DOC"

grep -Fq "bash ops/mainnet0/public-node-local-data-drop-weighted-status-card-closeout-proof.sh" "$DOC"
grep -Fq "bash ops/mainnet0/public-node-local-data-drop-object-browser-card-closeout-proof.sh" "$DOC"
grep -Fq "bash ops/mainnet0/public-node-local-data-drop-import-own-data-card-closeout-proof.sh" "$DOC"
grep -Fq "bash ops/mainnet0/public-node-local-data-drop-human-demo-closeout-proof.sh" "$DOC"
grep -Fq "bash ops/mainnet0/public-node-local-data-drop-human-demo-top-card-closeout-proof.sh" "$DOC"
grep -Fq "bash ops/mainnet0/public-node-local-data-drop-hide-legacy-intelligence-live-closeout-proof.sh" "$DOC"

grep -Fq "Only after Alienware runs those proofs green may a later closeout say cross-box green" "$DOC"
grep -Fq "Do not say cross-box green yet" "$DOC"

bash ops/mainnet0/public-node-precision-only-storm-baseline-proof.sh

echo "VOID_PUBLIC_NODE_ALIENWARE_REJOIN_RUNBOOK_V1_GREEN"
