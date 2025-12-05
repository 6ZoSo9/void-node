#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "=== [wc-relayer-wallet-api-smoke] repo ==="
pwd

# Ensure WC_RELAYER_DEMO_PK is present; fall back to the helper if needed
if [ "${WC_RELAYER_DEMO_PK:-}" = "" ]; then
  if [ -f /tmp/wc-relayer-demo-env.sh ]; then
    echo "=== [env] loading /tmp/wc-relayer-demo-env.sh ==="
    # shellcheck source=/tmp/wc-relayer-demo-env.sh
    source /tmp/wc-relayer-demo-env.sh
  fi
fi

if [ "${WC_RELAYER_DEMO_PK:-}" = "" ]; then
  echo "[fatal] WC_RELAYER_DEMO_PK not set and /tmp/wc-relayer-demo-env.sh missing/empty."
  echo "        Run /tmp/wc-relayer-demo-key.sh first."
  exit 1
fi

echo "=== [env] WC_RELAYER_DEMO_PK length ==="
echo " ${#WC_RELAYER_DEMO_PK}"

echo
echo "=== [health] checking wc-relayer-dev on :4311 ==="
curl -fsS "http://127.0.0.1:4311/api/wc-relayer/v1/health" | jq '.'

echo
echo "=== [wallet-dev] quote + sign+submit SEND_VOID ==="

npx --yes tsx -e '
  import { quoteSendVoidDevDemo, signAndSubmitSendVoidDevDemo } from "./src/obelisk_wallet_workcredits_api.ts";

  (async () => {
    const to = "0x0000000000000000000000000000000000000002";

    console.log("=== [wallet-dev] quote SEND_VOID ===");
    const q = await quoteSendVoidDevDemo({
      user: "0x9debd6C09052E7CEDd19D2258216500d4c98f820",
      to,
    });
    console.log("quote voidNeeded =", q.quoteResponse.quote.voidNeeded);
    console.log("quote wcFee      =", q.quoteResponse.quote.wcFee);

    console.log();
    console.log("=== [wallet-dev] sign+submit SEND_VOID ===");
    const res = await signAndSubmitSendVoidDevDemo({
      privateKey: process.env.WC_RELAYER_DEMO_PK as string,
      to,
    });
    console.log("signerAddress    =", res.signerAddress);
    console.log("tx.hash          =", res.submitResponse.tx.hash);
    console.log("tx.status        =", res.submitResponse.tx.status);
  })().catch((err) => {
    console.error("[wallet-dev] ERROR", err);
    process.exit(1);
  });
'

echo
echo "=== [wc-relayer-wallet-api-smoke] DONE ==="
