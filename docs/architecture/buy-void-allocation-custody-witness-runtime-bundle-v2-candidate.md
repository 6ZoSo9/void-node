# Buy VOID custody witness runtime-bundle V2 candidate

## Purpose

This lane derives a successor runtime-bundle identity after the reviewed
filesystem bakery-lock repair in parent Draft #2683.

Historical runtime-bundle qualification V1 remains immutable. Its reviewed
bakery-lock compiled identity is:

`sha256:7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994`.

The repaired #2683 source builds:

`sha256:47e80dfffa0cd1fd97169f9d63e836c9dbf52461aaafafdf10499b5cf91fd3ca`.

That mismatch is why the historical V1 runtime-bundle proof correctly HOLDs.

## Derive-only boundary

The candidate pins exact parent source generation
`b0f7189af0d29769ec701bd590e0df81b23b5c07` and exact repaired bakery-lock
source Git blob `9bd47abb857368d928c0ca289766cdf3571629ba`.

It rebuilds the existing eight-file witness runtime closure, rescans the exact
relative import graph, and requires:

- exactly eight reviewed runtime files;
- exactly eleven reviewed relative import edges;
- no dynamic import;
- no `require()`;
- every predecessor runtime file except the bakery-lock artifact to retain its
  V1 SHA-256;
- the bakery-lock artifact to equal the independently observed repaired hash;
- no reviewed runtime/build input drift after the pinned #2683 source commit.

The resulting candidate uses a new V2 manifest schema/marker and content
address. It does not edit or repin the historical V1 qualifier.

The Node 22/24/26 workflow independently rebuilds and derives the complete
candidate JSON and then requires all three outputs to be byte-identical.

## Non-authority

This is candidate evidence only:

- `predecessor_manifest_accepted=false`;
- `candidate_manifest_accepted=false`;
- `live_nimo_installed=false`;
- `runtime_integration=false`;
- `protected_high_water_custody_proven=false`;
- `production_gate_ready=false`;
- `funds_movement=false`.

A later locked V2 qualification must independently review the derived manifest
ID/hash and then propagate the accepted generation through installation
qualification/evidence. No historical manifest may be rewritten merely to make
older workflows green.

No service, Nimo host, SSH, authorized_keys, custody storage, customer/payment
ledger, wallet/key/signer, transaction, Chain-2050/WC, presale/market,
treasury/liquidity or funds action occurs in this lane.

**PROTECT THE CORE.**
