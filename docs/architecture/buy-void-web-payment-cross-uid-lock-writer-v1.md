# Buy VOID web payment writer → cross-UID kernel lock candidate V1

## Purpose and priority

The merged cross-UID kernel capacity lock and the merged custody V2 service
now share the same reviewed locking primitive, but the **web payment writer**
remains outside that domain. Custody V2 therefore correctly holds at
`allocation_custody_service_web_payment_writer_cross_uid_lock_not_bound`
without reserving or recovering any allocation. This source-only candidate
proposes the web side's **outermost** lock composition: hold the same
cross-UID lock for the *entire existing canonical payment writer*, including
its original bakery capacity admission, request lock, launch authority,
durable payment_verified fsync, allocation transition and sidecar recovery.

The new module
`src/economic/buy_void_web_payment_cross_uid_lock_writer_v1.mjs`
imports the actual merged
`withBuyVoidCrossUidCapacityExclusiveLockV1` primitive and the actual
compiled `writeBuyVoidOperatorEventWithCapacityAdmissionV1` writer.
Its exported wrapper has **no installed route/import or service lifecycle**.
No existing index.ts route, old writer or custody V2 service is modified.

This staging code could perform a durable payment append **if someone later
invoked it on a host with authorized ledger inputs and an installed lock**.
It MUST NOT be mounted or executed for real payments merely because this PR
has passing source tests. Runtime activation remains a separate explicit
review and host qualification.

## Caller and ordering constraints

Only an exact trusted server-startup lock config and exact canonical writer
arguments are admitted. Top-level objects and config are copied from own
data descriptors, rejecting Proxies, accessors, arbitrary extra keys and
inherited mutable object properties. The process must be nonroot Linux and
match the configured **web** UID; the underlying kernel primitive separately
validates shared group membership, custody/web identity, kernel inode ownership
and the shared 03770 sticky+setgid directory.

Only a `payment_verified` event with exact own `request_id` matching the
request's own `request_id` can enter the lock. All reviewed source-ledger
identity, duplicate/capacity, launch generation and canonical event-byte checks
remain the responsibility of the *unchanged* canonical writer.

Lock ordering is:
```text
web principal cross-UID kernel capacity lock
  → existing payment capacity bakery lock
  → current launch-generation and request lock
  → canonical payment_verified ledger fsync
  → current allocation publisher / recovery attempts
  → sidecar and post-state checks
  → cross-UID lock release + directory fsync
```

The wrapper never catches and converts an uncertain writer exception into
a benign return. The lock primitive deliberately retains the lock claim on
callback failure. Recovering an ambiguous payment/allocator crash requires
a separate **proven recovery-before-new-admission protocol**. Lock ordering
must also be reviewed against every existing web and custody route, so no
inverted locks or nested callback effects can bypass admission.

## Narrow proof — synthetic only

`scripts/prove_buy_void_web_payment_cross_uid_lock_writer_v1.mjs`
parses the actual new JS module and evaluates the same production wrapper with
**inert in-memory substitutes** for its imports. The real canonical payment
writer is never imported or called. It tests writer call order strictly
inside the cross-UID critical section, release only after success, retained
claim on synthetic callback failure, wrong/missing request identity,
non-verified status, forged web UID, malformed path and extra/accessor fields
rejected before acquiring the lock, and refusal of a forged custody-role lock
completion receipt.

The exact-head Node 22/24/26 workflow typechecks and builds the actual
source/compiled tree, then runs that synthetic boundary proof in all three
Node environments and requires byte-identical receipts. It does **not**
provision a production lock, execute a payment, access private buyer records,
or test host UID/GID installation. The preexisting custody V2 proof separately
tested real synthetic Linux cross-UID contention; it does not by itself prove
a live payment write under the lock.

## Truthful remaining HOLD

`web_writer_cross_uid_lock_source_bound=true` is only a **candidate source
composition result from explicit invocation**; it does not mean the deployed
web route uses this wrapper. These remain FALSE:

```text
production_web_writer_cross_uid_participation_verified=false
payment_capacity_lock_verified=false
custody_service_joint_handoff_proven=false
allocation_handoff_atomicity_proven=false
custody_reserve_recover_enabled=false
runtime_integration=false
deployed_artifact_generation_verified=false
payment_acceptance=false
presale_activation=false
funds_movement=false
```

The live payment→allocation handoff must still survive a crash after durable
`payment_verified` but before durable `allocation_reserved`, never create a
second capacity obligation, establish exclusive terminal recovery, and bind
first-original buyer history, protected high-water, Nimo witness and deployed
web/custody UID/GID/runtime identities. Operator principal authentication and
native-USDC source finality are separate requirements.

No Ready/merge/deployment, host service, credential/wallet/signer, real
customer ledger, transaction, Chain-2050/WC, inventory/treasury/liquidity,
presale/market activation or funds movement.

**PROTECT THE CORE.**
