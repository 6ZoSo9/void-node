# Repaired V7/V2 current-generation dispatch v2

Status: **source/CI-only exact protected-integration successor; no deployment or economic authority**.

## Purpose

Dispatch V1 remains frozen at Git blob
`4e123302d25dd0a83923032d2dc0f40c8937e77f` with its architecture note
`1244b91d26a51485cefadd962398c43a13c28f71`.

The accepted V2 candidate and lock remain frozen. Their 49-row protected source
inventory records `src/index.ts` at
`123ec1792a027f93d4c9030749a0e7e136a75a44`.

The reviewed machine-readable bounded-range alias/recovery generation changes only that
protected row to exact current blob
`a09661797aa4295371c036be36d82995e5233269`. Dispatch V2 does not claim
that the current protected inventory is byte-identical to the frozen candidate.

## Exact successor contract

Current dispatch V2 proof Git blob:
`81a4f189b2c3a1ff988e44ece93ed1ee983898f8`.

It requires:
- frozen dispatch V1 proof and V1 document unchanged;
- frozen candidate JSON, accepted lock and V4 census evidence unchanged;
- all 49 protected path modes exact;
- 48 protected source blobs exactly equal the frozen candidate rows;
- the remaining protected row is exactly `src/index.ts: 123ec179... -> 7df1f21c...`;
- the frozen 49-row inventory digest remains exactly the accepted candidate digest;
- the three previously reviewed non-protected economic drifts remain exact;
- current compiled economic census remains byte-identical to frozen V4 evidence;
- provider source/build identity remains exact;
- the five consumer workflows select Dispatch V2.

The receipt deliberately reports:
```text
protected_path_identity_preserved=false
frozen_protected_inventory_preserved=true
reviewed_protected_drift_count=1
reviewed_range_index_successor_bound=true
current_built_census_identity_matches_frozen_v4=true
frozen_candidate_rederived_on_current_head=false
current_generation_integration_verified=true
```

This is a reviewed successor mapping over one exact source identity, not a
generic protected-drift allowlist.

## Authority

No candidate JSON, accepted lock, product/runtime source, protected installation,
service mutation, signer/key access, transaction, payment acceptance, presale/WC
activation, treasury/liquidity action or funds movement is changed or authorized.

**PROTECT THE CORE.**
