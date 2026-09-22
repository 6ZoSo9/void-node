# Buy VOID legacy-alias genesis carrier v1

Marker: `VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1`

Status: source/proof + read-only designated-host observer for #1712 / #1682.

## Production basis

Accepted Phase-B Precision evidence:

```text
migration_plan_sha256=de939c9fcbdb9f5f39440c689912d3f637ec571913b5f4dd49c2f6d125061be6
migration_evidence_id=ac7989d8200282092fdbcae7fab2fbb439b6aadfc37938eb3afa18b512b080a1
segmented_durable_root_sha256=eca28c154b89f2c93e2f56b3cb6d74e1305fb23122e0f2f73daeffee681685ac
current_pointer_id=9729716b11e23e87a804ba07fb1b70bdc4f0d917b6b00f99dbb538e31a622167
canonical_record_sha256=5bef498d6e14b1c716e14e5472e668ae4d4308d2595d5148e22cf11563131338
lineage_mode=legacy_pool_consumed_current_pool_alias
```

The current canonical pool is `buy-void-presale-v1`. The predecessor consumed pool is `void-presale-mainnet0-v1`.

## Why the generic carrier planner is not sufficient

The generic #1653 mount-eligible planner calls the current-pool payment-history projection directly.

For the migrated production record, that current-pool projection is intentionally:

```text
confirmed_pending_closeout
```

because the immutable inventory-consumption record remains scoped to the predecessor pool.

Phase B proves that the current-pool reservation is the canonical migrated alias of the already-consumed predecessor reservation. The genesis carrier must therefore authenticate an effective consumed lifecycle without rewriting either journal family or changing global projection semantics.

## Effective projection

The alias-aware planner rereads both bounded projections.

It requires:

- one current-pool reservation;
- one confirmed attempt;
- current-pool lifecycle exactly `confirmed_pending_closeout`;
- no current-pool closeout;
- predecessor-pool lifecycle exactly `inventory_consumed`;
- exact predecessor consumption;
- identical attempt projection arrays;
- the exact accepted Phase-A migration plan;
- the exact Phase-B current pointer and evidence.

The effective carrier fingerprint is the normal payment-history projection-core hash with:

- current-pool primary reservation and identities;
- current attempt projection;
- predecessor closeout projection;
- lifecycle state `inventory_consumed`.

This is a read-only composition. It does not modify `projectBuyVoidPaymentHistoryV1`.

## Durable row verification

The planner independently:

1. reads the accepted Phase-B current pointer and evidence;
2. recomputes Phase A;
3. rereads current and predecessor projections;
4. reads the exact segmented manifest;
5. re-derives materialized authority;
6. reads the durable root;
7. verifies the durable root against the accepted Phase-B evidence;
8. reads the canonical row through `verifySegmentedJsonlDurableRootMaterializedAtUseV1`;
9. requires that row to equal the current canonical reservation.

## Carrier genesis

The planner uses:

```text
previous_carrier_root = null
current_index_root = exact empty #1653 payment index root
```

and invokes only:

`planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1`

with the durable current reservation row and the effective alias-aware payment-history fingerprint.

The output records:

- carrier generation 1;
- payment-index root;
- carrier root;
- carrier transaction intent;
- exact new page digest/byte-length set;
- deterministic page-set SHA-256;
- deterministic attestation-plan SHA-256.

No carrier pages or carrier root are published by this gate.

## Precision observer

`scripts/observe_buy_void_legacy_alias_carrier_genesis_precision_v1.ts`:

- accepts no arguments;
- requires clean local `main`;
- pins Git directory/work-tree;
- disables fsmonitor;
- executes the plan twice;
- requires exact replay equality;
- revalidates Git state afterward;
- prints only the non-secret plan and authority receipt.

Do not run the observer on Precision until the source/proof PR is accepted.

## Authority boundary

```text
filesystem_write=false
page_publication=false
carrier_root_publication=false
global_payment_history_projection_mutation=false
runtime_activation=false
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

After the designated-host observer is accepted, import a non-secret attestation under `ops/mainnet0/` for #1682. Actual live carrier-page/root custody remains separately ordered behind #1683.

Refs #1653 #1682 #1692 #1706 #1709 #1712.
