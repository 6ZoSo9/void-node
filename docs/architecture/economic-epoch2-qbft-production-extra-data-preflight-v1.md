# Economic Epoch-2 QBFT production extraData preflight v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PREFLIGHT_V1`

Status: source-only preparation gate.

## Purpose

Prepare the production QBFT `extraData` input path without weakening the
four-independent-identity requirement and without creating production validator
authority before all four real identities exist.

The preflight reads the canonical QBFT binding candidate and validates:

- pinned Besu 26.8.1 identity;
- exactly four required live identities;
- one independently attested machine role per entry;
- unique VOID node IDs, Besu public keys, validator addresses, and attestation
  hashes;
- exact Besu public-key to validator-address derivation;
- rejection of the four historical proof-only placeholder addresses; and
- all service, validator mutation, Chain-2050 write, transaction, funds,
  migration, and public-activation authority remaining false.

## Current canonical behavior

The current repository has three attested identities: Precision, Nimo, and
Xiphos. The preflight therefore returns:

`HOLD / insufficient_attested_live_nodes / 3 of 4 / one slot remaining`.

It emits no production validators file and does not generate production
`extraData`.

## Four-identity behavior

Once the canonical binding contains exactly four independently attested real
identities, the preflight may emit only the ordered JSON array of their four
Besu validator addresses. That array is the input to the pinned Besu command:

```text
rlp encode --from=/work/validators.json --type=QBFT_EXTRA_DATA
```

Generating an RLP value is still not validator activation. A later reviewed
promotion must bind the exact encoded bytes into production genesis/evidence and
must separately preserve the Sovereign-controlled migration and activation
boundaries.

## Hosted proof

CI proves two distinct conditions:

1. the real current 3/4 binding remains HOLD and cannot emit a production-ready
   four-validator input; and
2. a synthetic fourth-identity test control passes the same uniqueness,
   derivation, placeholder, and authority checks, after which pinned Besu
   26.8.1 successfully encodes the resulting four-address JSON shape.

The synthetic identity is test-only and grants no production authority.

## Authority boundary

This lane performs no service action, Besu node launch, production validator-set
mutation, wallet or credential access, transaction construction/signing/
submission/broadcast, authoritative Chain-2050 write, token/funds movement,
migration authorization, or public activation.
