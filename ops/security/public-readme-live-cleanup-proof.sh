#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== public README live cleanup proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [1] required public-live README markers ==="
grep -q '\[Start here\](docs/public/start-here.md)' README.md
grep -q '\[Quick start\](docs/public/quick-start.md)' README.md
grep -q '\[Run a node\](docs/public/run-a-node.md)' README.md
grep -q '\[Participant onboarding\](docs/public/participant-onboarding.md)' README.md
grep -q '\[Support guide\](SUPPORT.md)' README.md
grep -q 'Recommended public path' README.md
grep -q 'Local health check' README.md
grep -q 'GET /__void/ready.json' README.md
grep -q 'GET /participant' README.md
grep -q '\[Proof cadence\](docs/public/proof-cadence.md)' README.md
grep -q '\[Branch/release policy\](docs/public/branch-release-policy.md)' README.md
grep -q 'Do not share private keys' README.md
echo "[ok] public-live README markers present"

echo
echo "=== [2] stale public-beta wording must be gone ==="
if grep -nEi 'public beta|public-beta|BETA_READY|SELF_HOSTED_BETA|demo-video|demo proof|install-all|main-legacy|Legacy quick start|Current Proven Paths|2026-03-23|public beta happy path|beta-help' README.md; then
  echo "[fail] stale README wording still present"
  exit 1
fi
echo "[ok] stale public-beta README wording gone"

echo
echo "=== [3] local status smoke ==="
make mainnet0-status-smoke

echo "=== public README live cleanup proof OK ==="
