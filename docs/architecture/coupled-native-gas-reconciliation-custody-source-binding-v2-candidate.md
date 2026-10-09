# Coupled native-gas reconciliation custody source-binding V2 candidate

## Purpose

The repaired filesystem bakery-lock source in parent Draft #2683 changes one
member of the historical native-gas reconciliation custody reviewed-source set.

Historical V1 pins:

`src/economic/buy_void_filesystem_bakery_lock_v1.ts`
→ `03376ad9853c1ca37c5be4d7f36d9daccab25078`.

The repaired exact #2683 source is:

`9bd47abb857368d928c0ca289766cdf3571629ba`.

V1 therefore correctly HOLDs on the repaired source and must not be repinned in
place.

## Candidate contract

The derive-only candidate pins exact source generation
`b0f7189af0d29769ec701bd590e0df81b23b5c07`, rehashes every path in the
historical V1 reviewed-source set, and requires the bakery-lock source to be
the **only** changed Git blob.

It retains the complete historical V1 manifest hash and reviewed base commit as
predecessor evidence, then derives a separate V2 candidate manifest hash over
the current source set.

Node 22/24/26 independently derive the candidate and require byte-identical
receipts.

## Non-authority

This lane does not replace the V1 source-binding observer and does not claim:
- accepted V2 source manifest;
- deployed artifact generation;
- trusted collector;
- live host qualification;
- runtime integration;
- payment acceptance;
- production gate readiness;
- funds movement.

A later independently reviewed V2 source-binding successor must consume the
candidate identity and preserve all historical evidence.

No live host, customer/payment state, custody write, credential, wallet/key/
signer, transaction, Chain-2050/WC, inventory, presale/market,
treasury/liquidity or funds action occurs.

**PROTECT THE CORE.**
