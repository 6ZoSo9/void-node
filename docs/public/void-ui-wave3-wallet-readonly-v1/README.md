# VOID UI Wave 3 — Wallet Read-only

**Base:** `c2441e3514d47006c3256158f694a8f2dbc8c056`
**Branch:** `feat/void-ui-wave3-wallet-readonly-v1`
**Route:** `/app/#/wallet`

Wave 3 replaces the Wallet placeholder with an explicit participant-account
lookup and a sanitized loopback-only adapter.

## Product behavior

The user enters one exact participant account ID. The browser calls one typed
adapter, which reads three fixed local GET routes and returns only sanitized
wallet identity and separated Work Credit accounting values.

The view does not connect a browser wallet and does not expose a create, import,
unlock, export, send, swap, settlement, or ledger-write action.

## Honest balances

- VOID remains unavailable until a verified read-only VOID token balance source
  exists.
- Ledger WC is shown as accounting balance only; Wave 3 makes no spendability
  claim.
- Production WC remains explicitly non-spendable, non-redeemable, and separate
  from legacy accounting.
