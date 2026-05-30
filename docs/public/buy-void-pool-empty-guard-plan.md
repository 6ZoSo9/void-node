# Buy VOID Pool-Empty Guard Plan

Status: plan only. No live fulfillment logic is changed by this document.

## Goal

When the sellable Buy VOID pool is empty, the participant Buy VOID surface must fail closed.

Users must not be able to create new Buy VOID requests once there is no sellable VOID inventory. Existing history and status records must remain visible.

## Required Backend Behavior

1. Add a canonical sellable inventory source for Buy VOID.
2. Treat missing, unreadable, invalid, or zero inventory as unavailable.
3. Reject new Buy VOID request creation when sellable inventory is exhausted.
4. Reject manual or operator fulfillment when inventory is exhausted unless the fulfillment is for an already-reserved request.
5. Preserve existing request, status, and history read routes.
6. Never infer inventory from UI state alone.
7. Never allow negative inventory.
8. Never allow a request amount greater than available sellable inventory.

## Required Participant UI Behavior

1. Hide or disable the Buy VOID create-request action when pool inventory is empty.
2. Show clear sold-out copy:
   - Buy VOID is temporarily unavailable.
   - The current sellable pool is empty.
   - Existing requests and history remain visible.
3. Keep Wallet, Earn, Stake, DataNet, and status sections available.
4. Do not tell users to send USDC when inventory is empty.
5. Do not show blind-deposit instructions.

## Future Proof Requirements

A future implementation proof must verify:

1. Positive inventory allows request draft creation.
2. Zero inventory disables or blocks new request creation.
3. Missing inventory fails closed.
4. Invalid inventory fails closed.
5. Oversized requested amount fails closed.
6. Existing history and status remain readable.
7. Fulfillment cannot send more VOID than reserved or available.
8. Mainnet-0 status smoke remains green.
9. No Buy VOID auto-send behavior is introduced.

## Intended Future Markers

- VOID_BUY_POOL_EMPTY_GUARD_V1
- VOID_BUY_POOL_SOLD_OUT_UI_V1
- VOID_BUY_POOL_INVENTORY_FAIL_CLOSED_V1

## Non-goals

This plan does not implement live inventory accounting yet.
This plan does not move funds.
This plan does not alter Buy VOID fulfillment.
This plan does not change receiver addresses.
