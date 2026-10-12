#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== public README navigation proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

grep -q '\[Start here\](docs/public/start-here.md)' README.md
grep -q '\[Quick start\](docs/public/quick-start.md)' README.md
grep -q '\[Windows WSL2 quick start\](docs/public/windows-wsl2-quick-start.md)' README.md
grep -q '\[Run a node\](docs/public/run-a-node.md)' README.md
grep -q '\[Participant onboarding\](docs/public/participant-onboarding.md)' README.md
grep -q '\[Current public status\](docs/public/mainnet0-current-public-status.md)' README.md
grep -q '\[Public live announcement\](docs/public/mainnet0-public-live-announcement.md)' README.md
grep -q '\[Support guide\](SUPPORT.md)' README.md
grep -q '\[Security policy\](SECURITY.md)' README.md
grep -q '\[Contributing guide\](CONTRIBUTING.md)' README.md
grep -q '\[Proof cadence\](docs/public/proof-cadence.md)' README.md
grep -q '\[Branch/release policy\](docs/public/branch-release-policy.md)' README.md
grep -q '\[Developer reference\](docs/public/developer-reference.md)' README.md
grep -q '\[Whitepaper\](docs/public/void-network-whitepaper.md)' README.md

grep -q 'Public active validator admission remains disabled.' README.md
grep -q 'Public validator registration remains candidate/waiting only.' README.md
grep -q 'Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.' README.md
grep -q 'Do not share private keys or seed phrases.' README.md

make mainnet0-status-smoke

echo "=== public README navigation proof OK ==="
