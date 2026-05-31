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

grep -q '1b8bf41db2d64f8877d0aec397373fa1' "$DOC"
grep -q 'db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2' "$DOC"
grep -q '2930d5e8436eb5674be06d2b0152d20c' "$DOC"
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
