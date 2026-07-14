# VOID UI Wave 2 — Typed Read-only Home v1

**Base:** `1149c5fe22c6cc4eea7f19d33e19b4fe0aca6262`
**Branch:** `feat/void-ui-wave2-home-readonly-v1`
**Route:** `/app/#/home`

Wave 2 turns the approved Home scaffold into the first live product view.

## Included

- A typed loopback-only Home adapter at `/__void/ui/wave2/home.json`
- Exact local GET sources:
  - `/health`
  - `/__void/ready.json`
  - `/blocks/latest/number2.json`
  - `/p2p/peers`
- Live network, readiness, block-height, peer-count, and node-identity state
- Explicit account-not-selected and balance-unavailable states
- Manual refresh, loading, degraded, and error presentation
- Same-origin-only CSP
- Desktop/mobile review launcher

## Excluded

- Account discovery
- Wallet balance access
- Work Credit balance access
- Wallet sends
- Ledger writes
- Buy VOID fulfillment
- DataNet writes
- Validator mutation
- Operator mutation
- Route replacement
- Money movement

The participant monolith remains untouched.
