# 2026-09-27 — WC/VOID Opening Window Policy V1

Marker: `VOID_REN_WC_VOID_OPENING_WINDOW_POLICY_V1`

## Canonical base

This lane starts from canonical main:

`d424c84a4ba9b4771d73ea6b82cd457b11fc9cb4`

That main includes merged #1917 claim-binding source and merged #1921 shared
post-discovery V2 reconciliation.

## Selected blocker

The next bounded source gate is:

`opening_commitment_window_policy_ready`

The policy had been required but not defined as a standalone canonical source
contract.

## Source policy

`VOID_WC_VOID_OPENING_WINDOW_POLICY_V1` now requires:

- one content-addressed absolute window bound to the coupled launch ID;
- policy commitment strictly before opening;
- strict ordering
  `policy_committed_at_ms < opens_at_ms < closes_at_ms`;
- commitment admission only on
  `[opens_at_ms, closes_at_ms)`;
- exact rejection at the close boundary;
- exactly one admission for every canonical opening commitment;
- exact commitment/participant/account/window/launch binding; and
- order-independent policy-state identity.

No window duration is hardcoded. The exact launch artifact must provide the
absolute timestamps.

The source gate records
`opening_commitment_window_policy_ready=true`.

## Still held

This does not close:

- participant provenance or eligibility;
- concentration/Sybil controls;
- minimum real-WC opening depth;
- exclusion of non-production/test WC;
- durable claim/refund binding;
- live WC-ledger persistence or quote custody;
- reverse VOID→WC settlement;
- participant VoidToken control;
- anti-grief/TTL/cap policy;
- public quote disclosure;
- bounded canary; or
- coupled activation.

## Authority boundary

No wall clock is read by the source verifier and no wallet/signer/key access,
WC mutation, transaction construction/signing/broadcast, Chain-2050 write,
inventory funding, liquidity movement, runtime/service mutation, market
activation, presale activation, or funds movement occurs.

Highest truth state at journal creation: source branch; hosted CI pending.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
