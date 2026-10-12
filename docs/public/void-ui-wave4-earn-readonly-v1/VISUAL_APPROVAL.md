# Wave 4 Earn Visual Approval

**Decision:** Approved for staging and PR preparation
**Approved by:** ZoSo
**Approved date:** 2026-07-15
**Surface:** `/app/#/earn`
**Participant account contract:** `zoso`

## Reviewed behavior

- Desktop and narrow/mobile layouts were manually reviewed.
- Earned WC, Redeemable WC, and Production WC are visually separated.
- Available work remains read-only and exposes no Run Once or submit control.
- Recent jobs and verification receipts remain readable and bounded.
- Advanced source and authority details remain secondary.
- The isolated adapter contract verified the real sanitized `zoso` account
  values before the human decision.
- The supplied screenshot set includes the Earn pre-load/empty state and route
  regression surfaces; it is not represented as a loaded-account screenshot.

## Safety result

The review added no execution authority. Job execution, job submission, reward
award, runner activation, runner tick, runner configuration, WC redemption, WC
send, WC-to-VOID, ledger writes, browser-wallet connection, and money movement
remain unavailable.

## Evidence

- Visual marker:
  `VOID_UI_WAVE4_EARN_READONLY_VISUAL_PREVIEW_CORRECTED_V2_GREEN`
- Human terminal decision: `APPROVE`
- Receipt: `/home/zoso/void-precision-smoke/void-ui-wave4-earn-readonly-visual-preview-corrected-v2-20260715T040110Z.txt`
- Receipt SHA-256: `fb8ee0189556fa1a47679f4f6400b227f032cf6eaea6fac63f22e91b1239e406`
