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
grep -q 'c8f28e4c / ckpt-datanet-site-bundle-seeding-runbook-green-20260528-130538' "$DOC"

grep -q '/download' "$DOC"
grep -q '/voidchain' "$DOC"
grep -q '/nullfeed' "$DOC"
grep -q '/site/voidchain' "$DOC"
grep -q '/site/nullfeed' "$DOC"

grep -q '3280ff66058b5429872a7e41a4b5c21d' "$DOC"
grep -q 'ec877b747894d093e4ffd4ab9ad8e83c0c43729efb9e002806287e4cfb4296a1' "$DOC"
grep -q '6a24c375872459c0f9941c58e88bd61e' "$DOC"
grep -q 'f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372' "$DOC"

grep -q 'DataNet-first with repo static fallback' "$DOC"
grep -q 'Follower nodes must have the packed DataNet site bundles seeded locally' "$DOC"
grep -q 'Repo static fallback must not be treated as DataNet-backed serving' "$DOC"

echo "public_site_status_doc_proof=green"
