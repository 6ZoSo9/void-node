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

grep -q '3280ff66058b5429872a7e41a4b5c21d' "$DOC"
grep -q 'ec877b747894d093e4ffd4ab9ad8e83c0c43729efb9e002806287e4cfb4296a1' "$DOC"
grep -q '6a24c375872459c0f9941c58e88bd61e' "$DOC"
grep -q 'f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372' "$DOC"

grep -q 'mainnet0-current-public-status.md' "$DOC"
grep -q 'datanet-site-bundle-seeding.md' "$DOC"
grep -q 'repo static fallback is bootstrap availability only' "$DOC"
grep -q 'DataNet-backed public site proof requires datanet_live_v1 headers' "$DOC"

echo "public_docs_index_site_bundle_proof=green"
