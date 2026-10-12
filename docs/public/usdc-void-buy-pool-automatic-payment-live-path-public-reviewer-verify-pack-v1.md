# USDC/VOID automatic payment live-path public reviewer verify pack v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1`

Public, read-only, non-activating reviewer verify pack for the automatic-payment live-path status card, discovery card, route-index wiring, and false-authority boundaries.

Routes:

- `/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json`
- `/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1`
- `/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json`
- `/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1.json`
- `/public-node/route-index.json`

Authority remains false: automatic payment execution, automatic fulfillment, wallet fulfillment, signer access, treasury transfer authority, buyer execution, public mutation, ledger write, and VOID transfer.

Copy-paste verify command:

```bash
base=${VOID_PUBLIC_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}; tmp=$(mktemp -d); set -e; curl -fsS "$base/public-node/route-index.json" > "$tmp/route-index.json"; curl -fsS "$base/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json" > "$tmp/status.json"; curl -fsS "$base/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1.json" > "$tmp/discovery.json"; curl -fsS "$base/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json" > "$tmp/pack.json"; grep -F VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1 "$tmp/pack.json" >/dev/null; grep -F VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1 "$tmp/status.json" >/dev/null; grep -F VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1 "$tmp/discovery.json" >/dev/null; grep -F /public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json "$tmp/route-index.json" >/dev/null; grep -F /public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1.json "$tmp/route-index.json" >/dev/null; grep -F /public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json "$tmp/route-index.json" >/dev/null; python3 -c "import json,sys; s=json.load(open(sys.argv[1])); d=json.load(open(sys.argv[2])); p=json.load(open(sys.argv[3])); assert s[\"marker\"]==\"VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1\"; assert d[\"marker\"]==\"VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1\"; assert p[\"marker\"]==\"VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1\"; assert s.get(\"private_details_exposed\") is False; assert d.get(\"private_details_exposed\") is False; [(_ for _ in ()).throw(AssertionError(k)) for obj in (s,d,p) for k,v in obj[\"authority\"].items() if v is not False]; print(\"VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1_REVIEWER_GREEN\")" "$tmp/status.json" "$tmp/discovery.json" "$tmp/pack.json"

