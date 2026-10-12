# Buy VOID legacy history migration plan v1

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1`

Status: source/read-only migration planning gate for #1692.

## Why this gate exists

The accepted production-history census on Precision reported:

```text
history_state=materialization_required
carrier_root_sha256=null
total_history_entries=4
PAYMENTS=1
RESERVATIONS=1
OBLIGATIONS=0
EXECUTION_ATTEMPTS=1
INVENTORY_CONSUMPTIONS=1
TERMINAL_CLOSEOUT_PLANS=0
FULFILLMENT_SAGAS=0
```

The merged #1653 history carrier cannot admit the legacy reservation directly
from the old journals. Its mount-eligible planner requires an exact record
locator into an accepted segmented JSONL durable root.

No production Buy VOID segmented-history store is currently mounted. Therefore
the first step is a deterministic read-only migration plan.

## Canonical production scope

The production wrapper fixes the same values accepted by the census:

```text
runtime root  /home/zoso/dev/void-node/data_a/buy_void_v1/runtime-integration-v1
pool          buy-void-presale-v1
```

The explicit-root helper exists only for deterministic source proofs and fixture
composition.

## Exact production shape

Before reading the payment lifecycle, the planner reruns the accepted census and
requires exactly:

```text
payments                  1
reservations              1
paid obligations          0
execution attempts        1
inventory consumptions    1
terminal closeout plans   0
fulfillment sagas         0
```

Any additional/missing artifact holds the migration plan.

The sole payment key is discovered only from the canonical 64-hex payment
filename. The file must be a direct, private, single-link regular file.

## Bounded lifecycle read

The planner then calls the merged bounded
`projectBuyVoidPaymentHistoryV1` implementation.

It requires:

- one reservation primary record;
- lifecycle state `inventory_consumed`;
- exactly one execution attempt;
- the attempt is `confirmed`;
- the attempt ID matches the inventory-consumption record;
- the confirmed transaction hash matches the closeout transaction;
- consumed VOID units equal the projected payment amount.

The planner does not introduce a second journal parser.

## Canonical segmented row intent

The exact reservation object returned by the bounded projection is encoded using
the same recursively key-sorted canonical JSON rule used by the accepted
history-carrier semantic fingerprint.

The migration row is:

```text
<canonical JSON payload> + "\n"
```

The segmented-store 1 MiB record ceiling applies to the payload bytes excluding
the trailing delimiter.

Phase A records only commitments:

- journal record SHA-256;
- canonical semantic SHA-256;
- payment-history lifecycle fingerprint;
- canonical JSONL payload length;
- canonical JSONL row length;
- canonical JSONL row SHA-256;
- proposed active-segment SHA-256;
- proposed record offset/length/SHA-256;
- deterministic migration-plan SHA-256.

The reservation body is not emitted separately as an evidence artifact.

## Proposed genesis segmented policy

The plan binds:

```text
store generation        1
segment target bytes    8388608
max record bytes        1048576
active segment id       4294967295
record offset           0
```

For the observed one-row genesis store, the proposed active-segment SHA-256 is
the same as the canonical JSONL row SHA-256.

These are **inputs to the later apply gate**, not claims that a segmented store
already exists.

## Identities deliberately not claimed in Phase A

Phase A returns:

```text
segmented_durable_root_sha256=null
carrier_root_sha256=null
```

It does not claim:

- materialized-authority SHA-256;
- snapshot SHA-256;
- checkpoint SHA-256;
- durable-root SHA-256;
- a final durable-root-bound locator;
- a payment-history carrier root.

Those identities are earned only after the separately reviewed Phase-B apply
feeds the exact accepted row through the existing file-backed segmented builder,
reconstruction/materialized-authority code and durable-root publisher.

## Precision observer

The exact no-argument observer is:

```text
scripts/observe_buy_void_legacy_history_migration_plan_precision_v1.ts
```

It requires:

- working directory exactly `/home/zoso/dev/void-node`;
- current branch `main`;
- `HEAD == local main`;
- clean tracked and untracked worktree;
- direct owned `.git` directory;
- exact Git directory/work-tree arguments;
- fsmonitor disabled;
- inherited Git-config authority removed.

It executes the migration plan twice and requires byte-equivalent output, then
revalidates the full Git snapshot.

The observer does not fetch.

## Authority boundary

Phase A performs bounded filesystem content reads because it must validate the
existing payment lifecycle.

It does not perform:

```text
filesystem_write=false
segmented_store_write=false
legacy_journal_mutation=false
segmented_durable_root_claimed=false
carrier_root_claimed=false
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

## Phase B

Phase B is a separately reviewed apply gate.

It may create only the dedicated production segmented-history store from the
exact accepted Phase-A plan. It must:

1. re-read the lifecycle and reproduce the same migration-plan SHA-256;
2. refuse if the source lifecycle changed;
3. refuse any pre-existing foreign segmented-history state;
4. feed the canonical row through the accepted file-backed segmented JSONL
   builder;
5. reconstruct and verify the materialized generation;
6. derive snapshot/checkpoint/materialized authority through accepted code;
7. atomically publish and re-read the durable root;
8. prove the durable root contains exactly one record with the expected row
   digest and locator;
9. leave all legacy journals unchanged;
10. keep runtime/apply/public activation disabled.

Only after Phase B is accepted may #1682 invoke
`planBuyVoidHistoryCarrierCommitV1` against the actual durable record and
attest the first production payment-history carrier root.

Refs #1653 #1682 #1692 #1683.
