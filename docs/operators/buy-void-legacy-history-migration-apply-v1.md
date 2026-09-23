# Buy VOID legacy history migration apply v1

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1`

Status: Phase-B source/apply contract for #1692. **Not yet authorized for Precision execution by source merge alone.**

## Accepted Phase-A input

The production wrapper is pinned to the accepted Phase-A migration-plan SHA-256:

```text
de939c9fcbdb9f5f39440c689912d3f637ec571913b5f4dd49c2f6d125061be6
```

Phase B recomputes Phase A immediately before any storage mutation and refuses if that exact plan identity changed.

The accepted production lineage is:

```text
lineage_mode=legacy_pool_consumed_current_pool_alias
current pool=buy-void-presale-v1
predecessor pool=void-presale-mainnet0-v1
```

The canonical segmented row remains the current-pool reservation. The consumed predecessor reservation, legacy consumption record, attempt-state fingerprint, and alias fingerprint remain separately bound in the durable migration evidence.

## Dedicated namespace

Phase B writes only below:

```text
<runtime-root>/buy-void-payment-history-segmented-v1/
```

The namespace is:

```text
current.v1.json
generations/
  <migration-plan-sha256>/
    migration-owner.v1.json
    canonical-row.v1.jsonl
    store/
    materialized.v1.jsonl
    durable-root/
    migration-evidence.v1.json
```

No legacy payment, reservation, attempt, consumption, public-request, or saga file is rewritten.

## Publication model

The generation is built before the current pointer is published.

The apply gate:

1. recomputes the exact accepted Phase-A plan;
2. recomputes the canonical current-pool JSONL row;
3. creates or verifies the immutable plan-named generation;
4. builds one generation-1 segmented JSONL store with the accepted storage primitive;
5. reconstructs the exact materialized row;
6. derives snapshot, checkpoint and materialized authority with accepted code;
7. publishes the genesis durable root through the accepted two-slot durable-root primitive;
8. re-reads the durable root and verifies the exact row through the durable-root/materialized-at-use reader;
9. writes deterministic alias-aware migration evidence;
10. publishes `current.v1.json` create-only only after the generation is complete;
11. rereads the complete published generation.

The current pointer is therefore the visibility boundary for downstream #1682.

## Replay and foreign-state behavior

An exact successful replay is read-only with respect to persistent state.

If `current.v1.json` already exists, the apply gate first requires that it names the exact accepted migration plan. It does not create a missing generation before that check.

A foreign generation sibling is rejected before the expected generation is created.

A pre-existing generation whose segmented store exists without its manifest is preserved and returns HOLD for review; Phase B does not recursively delete or rebuild ambiguous partial state.

No `rmSync`, `renameSync`, or `unlinkSync` recovery path exists in production source.

## Durable evidence

The final evidence binds:

- accepted migration-plan SHA-256;
- current and predecessor pool identities;
- current and legacy primary-record journal and semantic SHA-256 values;
- legacy alias fingerprint;
- execution-attempt state fingerprint;
- legacy inventory-consumption ID/fingerprint/raw SHA-256;
- canonical JSONL row SHA-256 and length;
- generation, segment target, record ceiling and active-segment identity;
- manifest SHA-256;
- snapshot SHA-256;
- checkpoint SHA-256;
- materialized-authority SHA-256;
- materialized SHA-256;
- durable-root SHA-256;
- exact carrier-compatible record locator;
- deterministic evidence ID.

## Authority boundary

Phase B authorizes only the dedicated local history-storage publication.

It does **not** authorize:

```text
legacy_journal_mutation=false
payment_history_projection_mutation=false
carrier_page_publication=false
carrier_root_mutation=false
runtime_activation=false
public_activation=false
service_action=false
credential_content_read=false
wallet_or_signer_access=false
rpc_call=false
transaction_signing=false
transaction_broadcast=false
chain2050_write=false
inventory_mutation=false
treasury_or_liquidity_action=false
funds_movement=false
```

## Precision gate

Do not invoke the production apply wrapper on Precision merely because this source PR exists or merges.

After source acceptance, prepare a separately reviewed exact Precision script that:

- pins the accepted merged source generation;
- re-runs the read-only Phase-A observer immediately before apply;
- requires the exact migration-plan SHA above;
- requires the dedicated segmented-history namespace to be absent or an exact accepted replay;
- invokes exactly one Phase-B apply;
- rereads and prints only non-secret evidence;
- performs no service action, credential read, wallet/signer access, RPC, signing, broadcast, Chain-2050 write, inventory mutation, treasury/liquidity action, or funds movement.

After the Precision Phase-B receipt is accepted, an alias-aware bounded carrier integration is required before #1682 can attest the first production carrier root.

Refs #1653 #1682 #1692 #1683 #1706.
