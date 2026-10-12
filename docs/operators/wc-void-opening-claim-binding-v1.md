# WC/VOID opening claim binding v1

Marker: `VOID_WC_VOID_OPENING_CLAIM_BINDING_V1`

Status: source-only claim/refund binding mechanism. No live ledger write, token
transfer, refund, signer use, Chain-2050 transaction, funding, market activation,
presale activation, or funds movement is performed or authorized by this gate.

## Purpose

The coupled WC/VOID opening already derives a deterministic 5,000,000-VOID
participant tranche from the exact settled opening cohort. The unresolved source
gap was what happens after the WC debit is bound to an allocation.

This gate makes that relationship explicit and content-addressed. It makes
duplicate or substituted dispositions detectable within an evaluated cohort,
but it does not claim durable replay protection until the binding itself is
persisted and verified.

The production candidate therefore keeps
`opening_claim_transfer_or_refund_binding_ready=false` after this source slice.

Every settled opening commitment must participate in exactly one cohort-wide
outcome:

- `finalize`: every commitment is bound to one exact VoidToken transfer claim;
- `abort`: every commitment is bound to one exact full-WC refund claim.

Every disposition is also domain-separated to:

- chain ID `2050`;
- network identity `mainnet0`;
- execution epoch `2`; and
- canonical VoidToken `0x470075b85352eb86f7d089fb9ba88945f12aad94`.

A cohort may not mix transfer claims and refunds. A disposition for another
chain, network identity, execution epoch, or token fails closed.

## Why cohort atomicity is required

The clearing price is derived from the complete settled WC cohort against the
fixed 5,000,000-VOID opening tranche.

Allowing one participant to refund after the opening state is fixed while other
participants keep their original allocations would silently change both the WC
reserve and the price-forming cohort. This V1 therefore fails closed on mixed or
partial recovery.

A later design may support deterministic re-clearing, but V1 does not invent
that complexity.

## Finalize binding

Each transfer claim binds all of the following:

- coupled launch ID;
- exact opening-state ID;
- exact opening commitment ID;
- exact WC settlement ID;
- participant ID;
- canonical WC account;
- one nonzero lowercase EVM recipient; and
- the exact deterministic VoidToken atom allocation for that commitment.

The claim ID is content-addressed. Amount drift, settlement substitution,
participant substitution, account substitution, state substitution, duplicate
claim IDs, and duplicate commitment disposition fail closed.

The entire finalized cohort must claim exactly the full 5,000,000-VOID opening
tranche.

## Abort binding

Each refund claim binds:

- coupled launch ID;
- exact opening-state ID;
- exact opening commitment ID;
- exact WC settlement ID;
- participant ID;
- canonical WC account; and
- the exact whole-WC amount previously settled for that commitment.

An abort is valid only when the aggregate refund amount equals the entire
settled WC cohort and no VoidToken transfer claim is present.

This is a source recovery contract, not proof that any refund was actually
written back to the canonical WC ledger.

## Deliberately unproven

This source gate does not prove:

- claim-binding persistence;
- live canonical WC refund writes;
- live VoidToken transfers;
- participant wallet/control usability;
- market-vault inventory custody;
- bounded canary execution;
- reverse VOID-to-WC settlement;
- public economic activation; or
- presale activation.

Those remain separate gates.

## Authority boundary

The exported authority object keeps all mutation and value-bearing capabilities
false. In particular:

- `ledger_write=false`;
- `wc_balance_mutation=false`;
- `token_transfer=false`;
- `wallet_or_signer_access=false`;
- `transaction_construction=false`;
- `transaction_signing=false`;
- `transaction_broadcast=false`;
- `chain2050_write=false`;
- `inventory_funding=false`;
- `liquidity_movement=false`;
- `market_activation=false`;
- `public_presale_activation=false`; and
- `funds_movement=false`.

Verification:

```bash
node scripts/prove_void_wc_void_opening_claim_binding_v1.mjs
```
