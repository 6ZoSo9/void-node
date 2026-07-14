# VOID UI Wave 2 Home — Visual Approval

**Approved:** 2026-07-14
**Approved by:** ZoSo
**Status:** Approved for staging and PR preparation

## Reviewed surface

- `/app/#/home`
- Live Precision source state
- Desktop application-shell layout
- Narrow/mobile responsive behavior
- Manual refresh behavior
- Honest no-account-selected state
- Honest unavailable balance state
- Live node, readiness, chain-head, and peer-count presentation

## Decision

The user reviewed the live isolated Wave 2 Home preview and stated that it
“looks much better.” This approves the visual direction for staging.

## Runtime evidence

- Receipt: `/home/zoso/void-precision-smoke/void-ui-wave2-home-visual-20260714T180144Z.txt`
- Receipt SHA-256: `964f5d6977702ed3aa60f6dd7416f4845a9b3dd8d4e64cf4cbb9dadeffb237ff`
- Live Precision PID remained `1654903`
- Restart count remained `0`
- Production-canary and legacy Work Credit ledger hashes remained unchanged
- No wallet send, ledger write, fulfillment, WC-to-VOID, validator mutation,
  operator mutation, or money movement occurred

## Scope boundary

This approval applies only to the typed read-only Home view. It does not
approve future Wallet, Earn, Data, Buy, Validate, Network, or Advanced feature
migrations without their own visual and authority review.
