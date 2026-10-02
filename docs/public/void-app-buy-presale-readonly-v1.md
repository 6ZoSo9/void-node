# VOID App Buy presale launch-ready v1

Historical filename: `void-app-buy-presale-readonly-v1.md`

Marker: `VOID_BUY_VOID_APP_LAUNCH_READY_V1`

This contract supersedes the earlier static/read-only Buy shell. The Buy view is
now prepared for the already-reviewed guarded request-creation route, while
remaining fail-closed until the live checkout configuration reports that intake
is enabled.

The browser reads `/__void/buy-void/config.json`,
`/__void/buy-void/status.json`, and `/__void/buy-void/sale-state.json`.
The request form remains disabled unless request intake, payment readiness,
receiver binding, request-intake readiness, and remaining verified inventory
are all green.

The participant-visible policy price remains mechanically bound to the
canonical `VOID_BUY_PRICE_USDC_PER_VOID` default in `src/index.ts`.

## Request boundary

When the gate is OPEN, the page may POST one guarded request to
`/__void/buy-void/request`. It does not connect a wallet, approve USDC, sign a
message or transaction, or send funds.

Request creation retains the reviewed acknowledgements for self-custody, Base
native USDC, request-before-payment, sender/destination identity, and the
fulfillment boundary.

Before displaying returned payment instructions, the browser also fails closed
unless the response has the reviewed checkout-result schema, the returned VOID
destination matches the submitted self-custody destination, the returned USDC
amount matches the submitted amount exactly at six-decimal Base-USDC precision,
the approved receiver remains canonical, and the returned safety object still
states manual review with automatic fulfillment disabled.

## Exchange/custody warning

SELF-CUSTODY ONLY. VOID is not listed on any exchange. The Base USDC sender
address is the VOID delivery identity. An exchange or pooled custodian can send
from an address the participant does not control, causing the resulting VOID
delivery to be inaccessible to that participant. VOID cannot recover those
funds. The UI instructs participants to treat exchange/custodial sends as lost.

## WC/VOID and Earn

The Buy page links to separate WC/VOID launch-status and Earn views. Neither
link grants market authority. Useful verified work earns Work Credits; the
future WC/VOID exchange rate is market-determined and is not fixed by the
presale price.

## Authority boundary

- request record creation: activation-gated
- browser wallet connection: false
- token approval: false
- transaction signing: false
- USDC send by page: false
- VOID transfer by page: false
- automatic fulfillment authority created here: false
- WC/VOID trading authority created here: false
- funds movement by this UI source: false

## Proof

```sh
node scripts/prove_void_app_buy_presale_readonly_v1.mjs
```

The historical proof filename is retained so existing CI and branch-protection
continuity do not silently disappear. Its assertions now enforce the
launch-ready, activation-gated contract rather than the retired static shell.
