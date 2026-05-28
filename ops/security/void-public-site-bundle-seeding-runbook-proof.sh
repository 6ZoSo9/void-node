#!/usr/bin/env bash
set -euo pipefail
set +H

DOC="ops/runbooks/datanet-site-bundle-seeding.md"

echo "=== public site bundle seeding runbook proof ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

test -f "$DOC"

grep -q 'DataNet Site Bundle Seeding Runbook' "$DOC"
grep -q 'DataNet-first with repo static fallback' "$DOC"
grep -q 'Until peer materialization for site bundles is automated' "$DOC"
grep -q 'follower nodes must have the packed DataNet site bundles seeded locally' "$DOC"

grep -q '3280ff66058b5429872a7e41a4b5c21d' "$DOC"
grep -q 'ec877b747894d093e4ffd4ab9ad8e83c0c43729efb9e002806287e4cfb4296a1' "$DOC"
grep -q '6a24c375872459c0f9941c58e88bd61e' "$DOC"
grep -q 'f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372' "$DOC"

grep -q 'data_a/datanet/publish_shim_v1/packed/<dataset_id>/' "$DOC"
grep -q 'root.txt' "$DOC"
grep -q 'manifest.v1.json' "$DOC"
grep -q 'chunk_000000.bin' "$DOC"
grep -q 'meta.publish_shim.v1.json' "$DOC"

grep -q 'rsync -a --delete' "$DOC"
grep -q 'make void-public-site-bundle-proof' "$DOC"

grep -q 'x-void-site-source: repo_static_fallback_v1' "$DOC"
grep -q 'x-void-datanet-backed: false' "$DOC"
grep -q 'x-void-site-fallback-reason: missing_datanet_chunk' "$DOC"
grep -q 'x-void-site-source: datanet_live_v1' "$DOC"
grep -q 'x-void-datanet-backed: true' "$DOC"

grep -q 'Do not treat repo static fallback as DataNet-backed serving' "$DOC"

echo "public_site_bundle_seeding_runbook_proof=green"
