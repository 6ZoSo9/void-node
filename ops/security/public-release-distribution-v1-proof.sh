#!/usr/bin/env bash
set -euo pipefail
set +H

cd "${VOID_REPO:-$(git rev-parse --show-toplevel)}"

echo "=== VOID public release distribution wall v1 proof ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty 2>/dev/null || true

echo
echo "=== [1] static release contract ==="
node scripts/prove_public_release_distribution_v1.mjs

echo
echo "=== [2] shell syntax ==="
bash -n release/bin/void-node-run
bash -n release/bin/void-node
bash -n ops/public/install-void-node-v1.sh
bash -n ops/security/public-release-distribution-v1-proof.sh

echo
echo "=== [3] application build ==="
npm run build

echo
echo "=== [4] deterministic build + checksum + install/uninstall chain ==="
node scripts/prove_public_release_distribution_v1.mjs --full

echo
echo "=== [5] diff hygiene ==="
git diff --check

echo
echo "VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_PROOF_GREEN"
