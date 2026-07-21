#!/usr/bin/env bash
set -euo pipefail
set +H
cd "${VOID_REPO:-$(git rev-parse --show-toplevel)}"

echo "=== VOID public release update channel wall v1 proof ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty 2>/dev/null || true

echo
echo "=== [1] static channel/update contract ==="
node scripts/prove_public_release_update_channel_v1.mjs

echo
echo "=== [2] syntax ==="
node --check tools/build-public-release-channel-v1.mjs
node --check release/bin/void-node-update
node --check scripts/prove_public_release_update_channel_v1.mjs
bash -n release/bin/void-node
bash -n ops/security/public-release-update-channel-v1-proof.sh

echo
echo "=== [3] application build ==="
npm run build

echo
echo "=== [4] release1 -> release2 -> tamper rejection -> health rollback ==="
node scripts/prove_public_release_update_channel_v1.mjs --full

echo
echo "=== [5] diff hygiene ==="
git diff --check

echo
echo "VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_WALL_V1_PROOF_GREEN"
