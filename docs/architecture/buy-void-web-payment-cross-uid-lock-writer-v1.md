# Buy VOID verified-payment allocation cross-UID lock candidate V1

## Purpose

Custody V2 already participates in the reviewed cross-UID kernel capacity lock,
but the web payment path does not. It therefore correctly holds at
`allocation_custody_service_web_payment_writer_cross_uid_lock_not_bound`.

This source-only Draft adds the web-side composition candidate. It places
`withBuyVoidCrossUidCapacityExclusiveLockV1` outside the existing
allocation-required verified-payment dispatch. It adds no public route,
service, deployment, payment acceptance, presale activation, wallet/signing
access, transaction broadcast, or funds movement.

The implementation is split into auditable layers:

- `buy_void_web_payment_cross_uid_lock_writer_v1.mjs`: stable facade;
- `buy_void_web_payment_cross_uid_lock_validation_v1.mjs`: trusted config,
  canonical planning, immutable dispatch snapshot, and exact allocation roots;
- `buy_void_web_payment_cross_uid_lock_writer_impl_v1.mjs`: outer lock,
  allocation-required dispatch, receipt checks, and truthful source receipt.

It reuses merged `main`:

- `planBuyVoidOperatorAllocationDispatchV1`;
- `dispatchBuyVoidOperatorEventWithAllocationRequiredV1`;
- the canonical allocation-ledger and high-water roots; and
- `withBuyVoidCrossUidCapacityExclusiveLockV1`.

It intentionally never calls `writeBuyVoidOperatorEventWithCapacityAdmissionV1`.
Merged `main` requires `payment_verified` to use the allocation handoff and
forbids the legacy payment-only writer for that status.

## Admission before the lock wait

The wrapper accepts only exact own-data containers. Extra keys, accessors,
Proxies, malformed paths, unsafe UID/GID values, identical web/custody UIDs,
and unqualified polling settings fail before lock acquisition. The process
must be Linux and its real UID must equal the configured web UID. The kernel
lock separately verifies group membership, shared-directory identity and
mode, claim ownership, and process incarnation.

Callers cannot select or override these server roots:

```text
/var/lib/void-allocation-ledger-v1
/var/lib/void-allocation-custody-v1
```

Before the first awaited operation, validation calls the merged canonical
planner. That planner validates the event/request pair, creates bounded frozen
JSON snapshots, requires matching request identity, and returns
`verified_payment_allocation_handoff` only for the required path. Every other
plan kind is rejected.

Only the planner's detached snapshots, exact roots, request directory, and
server callbacks survive into the lock wait. Their admitted JSON bytes are
checked again after acquisition and before dispatch. Mutating caller-owned
status, IDs, quote, verifier/receipt data, launch generation, buyer, or payment
instructions during a contended wait cannot redirect the operation.

## Lock order and failure rule

```text
web-principal cross-UID kernel capacity lock
  → existing payment-capacity bakery lock
  → launch-generation and request lock
  → durable payment_verified append
  → allocation reservation or idempotent recovery
  → sidecar and post-state checks
  → cross-UID lock release and directory fsync
```

Only `dispatchBuyVoidOperatorEventWithAllocationRequiredV1` runs in the outer
critical section. For `payment_verified`, it selects
`writeBuyVoidVerifiedPaymentAllocationHandoffV1` and retains the existing
source-ledger, duplicate/capacity, launch-generation, event-byte,
allocation-root, high-water, and recovery checks.

The wrapper never converts an uncertain callback exception into a benign
HOLD. The lock primitive retains its claim when the callback throws. That is
fail-closed, but production still needs a reviewed phase receipt or durable
reconciliation rule: a deeper handoff may fail before mutation, or a crash may
occur after partial durable mutation. This Draft does not establish when a
retained claim is safe to release or replace.

## Focused proof

The proof evaluates the actual validation and implementation modules with inert
in-memory imports. It never executes the production dispatch, ledger writer,
custody service, RPC, wallet, signer, or transaction path.

It requires:

- canonical planning before lock acquisition;
- allocation-required dispatch only while the outer lock is held;
- exact server-controlled allocation roots;
- no legacy payment-only writer reference;
- release only after callback success and retained claim after callback error;
- pre-lock rejection of invalid identity/status, extra fields, wrong web UID,
  callback Proxy, nested Proxy, accessor, and cycle; and
- rejection of a fabricated custody-role completion receipt.

The race case pauses after planner admission but before the dispatch callback,
mutates all material caller-owned fields, then proves the dispatch receives the
original frozen snapshots and roots.

Exact-head CI typechecks and builds the repository, syntax-checks all candidate
and proof modules, runs on Node 22/24/26, and requires byte-identical receipts.
Those are source tests, not host-installation or live-payment evidence.

## Remaining HOLD

Source invocation can prove the outer-lock composition, canonical dispatch,
exact roots, immutable pre-wait plan, and absence of the legacy writer. These
remain false:

```text
production_web_writer_cross_uid_participation_verified=false
payment_capacity_lock_verified=false
custody_service_joint_handoff_proven=false
allocation_handoff_atomicity_proven=false
custody_reserve_recover_enabled=false
deployed_artifact_generation_verified=false
runtime_integration=false
payment_acceptance=false
presale_activation=false
funds_movement=false
```

The live handoff must still prove crash recovery between `payment_verified`
and `allocation_reserved`, no second capacity obligation, exclusive terminal
recovery, first-original buyer history, protected high-water and Nimo witness,
deployed web/custody UID/GID and artifact identity, operator authentication,
and native-USDC source finality.

No Ready/merge/deployment, host mutation, credential/wallet/signer access,
real customer ledger, transaction, Chain-2050/WC, inventory/treasury/liquidity,
presale/market activation, or funds movement.

**PROTECT THE CORE.**
