#!/usr/bin/env bash
set -euo pipefail
set +H

DOC="docs/public/README.md"

echo "=== public docs index site bundle proof ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

test -f "$DOC"

grep -q 'Native public site bundle' "$DOC"
grep -q 'cross-box proven' "$DOC"
grep -q '25899017 / ckpt-public-site-status-doc-green-20260528-131313' "$DOC"

grep -q '/download redirects to /site/voidchain' "$DOC"
grep -q '/voidchain redirects to /site/voidchain' "$DOC"
grep -q '/nullfeed redirects to /site/nullfeed' "$DOC"
grep -q '/site/voidchain serves the Voidchain public site' "$DOC"
grep -q '/site/nullfeed serves the NullFeed public preview' "$DOC"

grep -q '1b8bf41db2d64f8877d0aec397373fa1' "$DOC"
grep -q 'db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2' "$DOC"
grep -q '2930d5e8436eb5674be06d2b0152d20c' "$DOC"
grep -q 'f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372' "$DOC"

grep -q 'mainnet0-current-public-status.md' "$DOC"
grep -q 'datanet-site-bundle-seeding.md' "$DOC"
grep -q 'repo static fallback is bootstrap availability only' "$DOC"
grep -q 'DataNet-backed public site proof requires datanet_live_v1 headers' "$DOC"

echo "public_docs_index_site_bundle_proof=green"
