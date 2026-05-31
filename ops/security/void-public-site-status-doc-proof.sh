#!/usr/bin/env bash
set -euo pipefail
set +H

DOC="docs/public/mainnet0-current-public-status.md"

echo "=== public site status doc proof ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

test -f "$DOC"

grep -q 'Native public site bundle' "$DOC"
grep -q 'cross-box proven' "$DOC"
grep -q '1ee9285e / ckpt-voidchain-run-node-doc-links-datanet-green-20260531-104226' "$DOC"

grep -q '/download' "$DOC"
grep -q '/voidchain' "$DOC"
grep -q '/nullfeed' "$DOC"
grep -q '/site/voidchain' "$DOC"
grep -q '/site/nullfeed' "$DOC"

grep -q '1b8bf41db2d64f8877d0aec397373fa1' "$DOC"
grep -q 'db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2' "$DOC"
grep -q '2930d5e8436eb5674be06d2b0152d20c' "$DOC"
grep -q 'f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372' "$DOC"

grep -q 'DataNet-first with repo static fallback' "$DOC"
grep -q 'Follower nodes must have the packed DataNet site bundles seeded locally' "$DOC"
grep -q 'Repo static fallback must not be treated as DataNet-backed serving' "$DOC"

echo "public_site_status_doc_proof=green"
