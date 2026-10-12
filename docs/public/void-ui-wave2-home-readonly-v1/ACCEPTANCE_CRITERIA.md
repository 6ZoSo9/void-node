# Wave 2 Home Acceptance Criteria

## Visual

- Home uses the approved Wave 1 shell and tokens.
- No fake account, balance, activity, block, or peer values remain.
- Loading, healthy, partial, degraded, and adapter-error states are readable.
- Desktop and mobile review occurs before commit.

## Accessibility

- Refresh is a native button.
- Updated state is announced through the existing polite live region.
- Status is communicated with text, not color alone.
- No focus behavior from Wave 1 regresses.
- Reduced-motion support remains intact.

## Functional

- The frontend performs exactly one kind of fetch: GET to the exact Home adapter.
- The adapter reads exactly four fixed local GET sources.
- Partial source failure returns an honest degraded response.
- No background mutation or automatic action exists.
- Existing `/participant` and `/public-node` routes remain available.

## Authority

- Loopback only.
- GET and HEAD only.
- No account selection or discovery.
- No wallet balance access.
- No Work Credit access.
- No wallet send, ledger write, fulfillment, WC-to-VOID, validator mutation,
  operator mutation, or money movement.
