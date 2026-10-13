# Buy VOID Nimo V3/V4 historical refusal — current successor required v1

This is a source/CI-only generation classifier stacked on dependency Draft #2865.
It does not install or contact Nimo.

## Current finding

The historical V3 witness bundle is no longer the current source generation.
It binds allocation-ledger source:

```text
66617a89d5ad9f81b5a21d98cca55fcda6902a80
```

Current source uses:

```text
8d84955e1e093a5c5af63241e62b8722fadd2f29
```

The later V4 inactive bundle correctly advanced that ledger generation, but V4
is now historical as well. V4 preserves the older compiled filesystem bakery
lock:

```text
bytes = 18018
sha256 = 7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994
```

Current source uses bakery-lock Git blob:

```text
9bd47abb857368d928c0ca289766cdf3571629ba
```

A current build therefore makes frozen V4 HOLD specifically at
`dist/economic/buy_void_filesystem_bakery_lock_v1.js`.

There is no reviewed Nimo V5/current-bakery bundle on current main. This lane
must not invent one merely to turn CI green.

## Closed generation behavior

Historical V3 remains unchanged.

When the exact historical V3 ledger and historical package/lock pair are
present, the existing workflow continues to execute the original:

- V3 candidate proof;
- V3 runtime-bundle qualification; and
- V3 evidence proof.

For the exact audited/current source generation, the workflow requires:

- current ledger Git blob
  `8d84955e1e093a5c5af63241e62b8722fadd2f29`;
- current replay Git blob
  `b451bcd895986dadaf6e53954671062068316ccf`;
- current bakery Git blob
  `9bd47abb857368d928c0ca289766cdf3571629ba`;
- audited package Git blob
  `14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`;
- audited lock Git blob
  `15b5c82ea36f13079a2f9e8863722f654eb3f201`.

It then requires both historical proofs to fail closed for the expected reasons:

1. V3 refuses the current allocation-ledger source generation.
2. V4 refuses the current compiled bakery-lock generation.

Unknown or mixed source/package generations HOLD.

## Current-generation evidence

After the normal exact build, the proof reads the current compiled bakery-lock
candidate and emits only:

- its bounded byte length;
- its SHA-256;
- its exact current source Git blob; and
- the identities of the historical V3/V4 proofs that refused it.

Node 22, 24 and 26 must emit byte-identical normalized receipts. This gives a
reviewable input for a later explicit V5/current-generation Nimo bundle without
calling that candidate accepted.

The receipt explicitly states:

```text
current_nimo_bundle_generation_qualified=false
current_nimo_bundle_successor_required=true
live_nimo_installed=false
verified_payment_to_allocation_mounted=false
production_gate_ready=false
presale_activation=false
funds_moved=false
```

## Why this is not a downgrade

A historical proof going red after reviewed source changes is expected
fail-closed behavior. Repinning V3 or V4 would erase the provenance boundary.

The correct sequence is:

```text
preserve V3
  -> preserve V4
  -> classify current source as a new generation
  -> independently review a later V5/current bundle
  -> only then consider private stage/install evidence
```

This child only performs the first three source/CI steps.

## Authority boundary

No SSH/Nimo contact, archive installation, authorized-keys change, root write,
service action, customer/payment/allocation mutation, wallet/key/signer access,
transaction, Chain-2050/WC mutation, market/presale activation,
inventory/treasury/liquidity action or funds movement is authorized or
performed.

This child must not merge independently of #2865.
