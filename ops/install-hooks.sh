#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "$(git rev-parse --show-toplevel)"

mkdir -p .git/hooks

cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "$(git rev-parse --show-toplevel)"

changed="$(git diff --cached --name-only || true)"

needs_wc=0
if printf '%s\n' "$changed" | rg -q '^(ops/voidctl|ops/wc-demo-run\.sh|ops/wc-smoke\.sh|Makefile|config/obelisk-workcredits-dev\.json|docs/VOID-DEVNET-PROTOCOL-STATE\.json|broadcast/WorkCreditsDevnetDeploy\.s\.sol/2050/run-latest\.json|src/index\.ts|src/node_core\.ts|scripts/follower_once\.ts)$'; then
  needs_wc=1
fi

if [ "$needs_wc" -ne 1 ]; then
  echo "[pre-commit] WC files not staged; skipping wc-golden"
  exit 0
fi

echo "[pre-commit] WC-related changes detected"
echo "[pre-commit] running: make --no-print-directory wc-golden"
make --no-print-directory wc-golden

echo "[pre-commit] wc-golden passed"
HOOK

chmod +x .git/hooks/pre-commit
echo "[ok] installed .git/hooks/pre-commit"
