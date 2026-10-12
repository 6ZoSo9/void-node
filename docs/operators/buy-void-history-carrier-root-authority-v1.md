# Buy VOID live payment-history carrier root authority v1

Marker: `VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1`

Issue: #1683

Status: source/proof only. This gate defines the durable server-owned current-root
authority required before the payment-keyed runtime can admit new payment
history. It does not mount that authority into the live Precision process and
does not enable runtime, apply, signing, broadcast, public activation, or funds
movement.

## Why this gate exists

The accepted dormant host configuration pins:

```text
VOID_BUY_VOID_HISTORY_CARRIER_ROOT_SHA256=
32649ce8d7edf089d4078d97fd72832d0b44da4736b5d58cdf3cde969a33ab1a
```

That value is valid as a dormant snapshot only while both payment-keyed child
flags remain zero. A live payment can create a successor carrier root, so a
long-lived runtime cannot depend on editing a systemd environment variable and
restarting the service after every successor.

This source gate replaces that future per-payment operational dependency with a
private durable authority whose current state is derived from immutable
generation records.

## Accepted production genesis

The production initializer accepts only the already-reviewed #1682 attestation:

```text
attestation_id=
voidbvhca1_0b7f99cbbf4dfbd8c3673d8915350b1d972bf1579d3798a52ab052eb3acb3465

pool_id=buy-void-presale-v1

genesis_carrier_root=
32649ce8d7edf089d4078d97fd72832d0b44da4736b5d58cdf3cde969a33ab1a

genesis_tx_intent=
f9e5a2fb8224fb110cbe384bfccbab59e1e9646f02c2c0b751a3d2a7d1a76e93

genesis_index_page=
07a59cfe2f0374d52e138787c80a1ec2c1d257303adea0ad8e5692800b59748e
```

An arbitrary caller-supplied genesis cannot acquire production mount authority.
The generic initializer exists only for deterministic proof fixtures and is
explicitly marked `proof_only`.

## Durable layout

The authority uses one private operator-owned directory:

```text
<authority-root>/
  authority.v1.json
  generations/
    0000000001.json
    0000000002.json
    ...
  roots/
    <carrier-root-sha256>.json
  pages/
    <page-sha256>.bin
  staging/
    <unlinked-generation-temporary-file>
```

Roots and pages are immutable content-addressed objects.

There is deliberately **no mutable `current.json` pointer**. The atomic
authority cutover is the create-only generation slot itself. Generation bytes
are written and fsync'd under the private staging directory first; only the
complete inode is then hard-linked create-only into `generations/` and the
generation directory is fsync'd. Readers therefore never treat a partially
written final generation filename as current authority. A generation record
contains, in one canonical object:

- carrier generation;
- current carrier-root SHA-256;
- predecessor carrier-root SHA-256;
- payment-index root SHA-256;
- previous generation-record ID;
- complete verified carrier transaction intent;
- exact page digest set; and
- a deterministic generation-record ID.

A reader derives current truth by boundedly validating the contiguous generation
chain. This removes a mutable pointer rewrite from the crash/concurrency
boundary.

## Page publication boundary

A generation cannot become a successful live successor until every page named by
its verified transaction intent is present under its exact SHA-256 and has been
re-read successfully.

The accepted production genesis page is intentionally **not fabricated from
repository metadata**. The source initializer can bind the accepted genesis
root while reporting:

```text
page_publication_complete=false
```

until the exact already-attested page bytes are separately obtained from the
designated host and published into the content-addressed page store.

No successor can be admitted while predecessor page publication remains
unresolved.

## Successor admission

`publishBuyVoidHistoryCarrierRootSuccessorV1` requires:

1. the current server-owned snapshot;
2. the operator/caller's expected predecessor root;
3. a fully verified `VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1` successor;
4. `verifyBuyVoidHistoryCarrierSuccessorV1`;
5. a fully verified `VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1`;
6. exact transaction-intent to carrier-root binding;
7. exact predecessor matching;
8. exact page digest/byte publication; and
9. create-only publication of the successor generation slot.

Rollback, same-generation alternate transitions, predecessor mismatch, malformed
or missing pages, foreign immutable-object replacement, and non-canonical
generation records fail closed.

## Duplicate and concurrent publication

An exact replay of an already-committed successor is deterministic and
idempotent:

```text
status=duplicate
mutation_performed=false
```

For competing successors from the same predecessor, only one create-only
generation slot can become authoritative. A stale competing transition observes
that current truth has moved and fails instead of silently replacing it.

Content-addressed pages or root objects written before a losing/crashed cutover
may remain as harmless immutable orphans; they do not become current authority
without a valid contiguous generation slot.

## Crash/restart recovery

Restart recovery scans only the bounded generation namespace and revalidates:

- canonical authority metadata;
- contiguous generation numbering;
- generation-record hash chain;
- every referenced carrier root;
- every carrier predecessor transition;
- every transaction-intent binding;
- every referenced content-addressed page; and
- current page-publication completeness.

No timestamp, process lifetime, service restart, or mutable pointer decides the
winner.

## Terminal-history projection boundary

The module exposes
`projectBuyVoidPaymentHistoryTerminalFromCarrierAuthorityV1`.

That adapter obtains the carrier root and trusted root digest from the durable
**production** authority itself and then calls the accepted #1669 terminal
projection. It does not accept a caller-selected trusted root.

A `proof_only` authority is rejected from this adapter.

This source helper is not mounted by this PR.

## Authority boundary

This gate may perform only local durable carrier-root/page custody when an
operator later invokes it through a separately reviewed mount or host script.

It does not authorize:

- payment-keyed runtime enablement;
- payment-keyed apply enablement;
- public Buy VOID activation;
- systemd environment mutation per successor;
- service restart per successor;
- credential-content reads;
- wallet or signer access;
- RPC calls;
- transaction signing;
- transaction broadcast;
- Chain-2050 writes;
- inventory mutation;
- treasury/liquidity action; or
- funds movement.

## Next gate

After repository/CI acceptance, the next designated-host gate is **not runtime
activation**.

Precision must first, with both payment-keyed child flags still zero:

1. align to the exact accepted source generation;
2. locate and verify the exact accepted genesis index page bytes;
3. initialize the production carrier-root authority from the accepted #1682
   root/intent/page;
4. re-read the authority after a restart-independent recovery cycle;
5. prove the bounded snapshot equals the dormant root pin; and
6. prove the #1669 adapter can consume only that server-owned snapshot.

Only after that host custody proof is GREEN should a separate runtime-enable
authorization be considered.
