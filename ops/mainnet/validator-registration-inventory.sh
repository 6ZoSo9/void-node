#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== git ==="
git branch --show-current
git rev-parse --short HEAD
git describe --tags --always --dirty || true
git status --short

echo
echo "=== candidate staking/validator contracts ==="
find contracts script test src ops -type f 2>/dev/null \
  | grep -E '\.(sol|ts|js|cjs|mjs|sh|json)$' \
  | grep -Ei 'validator|staking|epoch|runtime|truth|mainnet' \
  | sort \
  | sed -n '1,240p'

echo
echo "=== solidity contract declarations mentioning validator/staking ==="
grep -RInE 'contract .*Validator|contract .*Staking|enum .*Validator|struct .*Validator|mapping.*validator|register.*validator|activate.*validator|active.*validator|waiting|candidate|jailed|unbond' contracts test script 2>/dev/null \
  | sed -n '1,260p' || true

echo
echo "=== node/http routes mentioning validator truth/runtime ==="
grep -RInE 'validator-truth|ValidatorRuntime|validator.*status|validator.*epoch|next-onboard|onboard|runtime/validator' src ops 2>/dev/null \
  | sed -n '1,260p' || true

echo
echo "=== participant UI anchors likely used for staking/register panel ==="
grep -RInE 'participant|Stake|staking|validator|wallet|Account Wallet|Buy VOID|tabs|drawer' src 2>/dev/null \
  | sed -n '1,260p' || true

echo
echo "=== current validator runtime truth, if node is running ==="
if curl -fsS --max-time 3 http://127.0.0.1:4100/__void/runtime/validator-truth/status >/tmp/void-validator-status.json 2>/dev/null; then
  cat /tmp/void-validator-status.json | python3 -m json.tool | tail -n 120
else
  echo "[warn] node runtime truth endpoint not reachable on 127.0.0.1:4100"
fi
