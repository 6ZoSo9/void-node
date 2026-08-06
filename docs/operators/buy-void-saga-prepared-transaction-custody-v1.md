# Buy VOID saga prepared transaction custody v1

Markers:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1
VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_V1
VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_COORDINATOR_V1
```

Decision:

```text
SOURCE_ONLY_PREPARED_TRANSACTION_CUSTODY_READY_FOR_REVIEW_BROADCAST_REMAINS_UNMOUNTED
```

## Problem

The mounted crash-consistent saga stops at `attempt_reserved`. The next saga action is `prepare_transaction`.

A final Ethereum transaction hash exists only after signing. The existing native execution worker signs in memory, records the hash, and immediately enters the broadcast adapter. It intentionally persists and returns no raw signed transaction.

Splitting preparation from broadcast without another custody boundary would therefore be unsafe:

- a crash after the prepared hash is journaled could lose the only signed payload capable of producing that hash;
- signing again is not an adequate idempotency contract unless the signer guarantees the exact same signed bytes;
- two concurrent attempts can observe the same pending wallet nonce before either broadcasts; and
- persisting raw signed bytes in the ordinary application data tree would create a reusable fund-moving bearer artifact.

This lane adds a source-only preparation boundary that solves those problems without mounting or invoking broadcast.

## Stacked source boundary

This branch is stacked on exact PR #1012 head:

```text
eea521d298ffb299ca8839d9171a1151f206d7c9
```

It assumes the exact-green server-policy, identity-conflict, lease, fencing, and restart-reconciliation contracts from PR #1012. It does not alter or promote that pull request.

## Durable nonce and plan reservation

`buy_void_prepared_transaction_plan_reservation_v1.ts` creates an immutable local plan reservation containing:

- saga ID;
- execution-attempt ID;
- chain ID `2050`;
- fulfillment-wallet identity;
- delivery address and native value;
- gas limit and fee envelope;
- economic-policy fingerprint;
- preparation-policy fingerprint;
- observed pending nonce as a lower bound;
- locally allocated nonce;
- transaction-template fingerprint; and
- final transaction-plan fingerprint.

The allocator serializes the complete per-wallet nonce-allocation critical section with the repository's wallet-scoped filesystem bakery lock. Each contender publishes a unique choosing claim and monotonically ordered ticket. Dead-process claims are reclaimed, while one live process never removes another live process's claim.

Inside that lock, the allocator still publishes one immutable file per wallet nonce with an atomic hard-link create.

For one wallet:

1. the planner's pending nonce is a floor, not an exclusive assignment;
2. allocation and same-attempt recovery execute under one wallet-scoped lock;
3. the allocator scans existing immutable local claims;
4. it attempts the first available nonce at or above both the pending floor and the highest local reservation;
5. the same attempt and same template recover idempotently;
6. if a prior reservation is below a caller's newer observed pending floor, that caller fails closed instead of accepting a stale nonce;
7. an atomic nonce collision remains a defensive fallback; and
8. the same attempt with a changed template fails closed.

A separate attempt index is published after the nonce claim. If the process terminates after the nonce file but before the attempt index, retry scans the nonce records, finds the unique attempt, validates the exact template, and repairs the missing index. A process that dies while holding an allocation ticket cannot permanently block the wallet because its dead ticket is reclaimed.

Nonce release is intentionally absent. Releasing or reassigning a nonce requires later chain reconciliation and is a separate gate.

## Opaque signed-payload custody

`buy_void_prepared_transaction_custody_v1.ts` defines an injected custodian contract:

```text
prepare_once(...)
inspect_prepared(...)
```

`prepare_once` is bound to a deterministic idempotency key containing the saga, attempt, local plan reservation, and plan fingerprint.

The custodian returns only:

- an opaque custody handle;
- the final signed transaction hash;
- wallet identity;
- signer fingerprint; and
- exact plan fingerprint.

The application never receives raw signed transaction bytes. The custodian contract rejects results containing private keys, mnemonics, seeds, keystores, raw transactions, signed transactions, or signed payload fields.

The local private custody record is mode `0600` under a mode `0700` directory. It stores the opaque handle because a later separately authorized broadcast component must identify the exact externally held payload. Public return values omit the handle and expose only its SHA-256 fingerprint.

If the custodian prepares externally and the connection fails before the local record is written, retry calls the same `prepare_once` idempotency key. The custodian must return the exact prior preparation. Once the local record exists, retry uses `inspect_prepared` and rejects any handle, hash, signer, wallet, or plan drift.

No broadcast method is part of this lane's custodian interface.

## Coordinator sequence

`buy_void_saga_prepared_transaction_coordinator_v1.ts` is source-only and unmounted. It reconstructs one attempt from canonical server journals and requires:

- exactly one matching claim;
- exactly one matching inventory reservation;
- exactly one clean execution attempt;
- a saga in `attempt_reserved` or already `transaction_prepared`;
- the exact stable economic policy fingerprint from PR #1012;
- one server-controlled fulfillment wallet;
- a server-controlled loopback RPC and fee policy; and
- exact confirmations for the coordinator, saga action, custody action, and execution-journal preparation.

Apply performs:

1. read-only chain ID, pending nonce, gas-price, and wallet-balance planning;
2. durable local nonce and full transaction-plan reservation;
3. idempotent external custody preparation with no raw payload returned;
4. private local custody metadata persistence;
5. existing execution-attempt `prepare_execution` journal write using the custodian's signed hash;
6. exact reread and binding validation; and
7. saga `transaction_prepared` append under the saga lease and fencing-token contract.

The saga event binds:

- attempt ID;
- signed transaction hash;
- locally reserved nonce;
- fulfillment-wallet fingerprint;
- gas limit;
- maximum fee; and
- priority fee.

A retry after any completed boundary reuses the exact plan, custody identity, prepared attempt, and saga event. Automatic retry remains false; every invocation is explicit and exactly confirmed.

## Server preparation policy

The source reads:

```text
VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL
VOID_BUY_VOID_NATIVE_EXECUTION_GAS_LIMIT
VOID_BUY_VOID_NATIVE_DELIVERY_MAX_GAS_LIMIT
VOID_BUY_VOID_NATIVE_DELIVERY_MAX_FEE_PER_GAS_WEI
VOID_BUY_VOID_NATIVE_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI
VOID_BUY_VOID_NATIVE_EXECUTION_FEE_MULTIPLIER_BPS
```

The RPC URL must be loopback HTTP. The public preparation-policy identity contains only the RPC URL fingerprint and bounded gas/fee values. The economic fulfillment-wallet identity comes from the server policy introduced in PR #1012.

The preparation-policy fingerprint is immutable in the local plan reservation and custody binding. A changed RPC identity, gas bound, fee cap, priority fee, or multiplier cannot reuse the same attempt plan.

## Crash and adversarial proof

The focused real-filesystem proof uses the real execution-attempt journal and real saga store. It injects interruption after:

1. local nonce/plan reservation;
2. external custody has prepared but before the local custody record exists;
3. local custody record persistence; and
4. execution-attempt preparation before the saga append.

A final invocation completes exactly one saga transition to `transaction_prepared`.

The proof establishes:

- one local nonce reservation for the first attempt;
- recovery of a deliberately removed attempt index;
- one unique external custody preparation despite two `prepare_once` calls;
- one execution-attempt preparation write;
- one saga `transaction_prepared` event;
- exact transaction-hash and nonce agreement across custody, execution journal, and saga;
- a second attempt observing pending nonce 7 receives local nonce 8;
- two simultaneous processes for the same attempt and pending floors 7 and 8 leave exactly one nonce reservation;
- a higher observed pending floor fails closed when a lower reservation won first;
- a dead allocation ticket is reclaimed before the next attempt reserves a nonce;
- changed-plan reuse of the first attempt is rejected without another nonce;
- the custody file is private;
- the public result contains no opaque handle;
- no raw signed transaction enters the application data or result surface; and
- transaction broadcast and money movement remain false.

Expected marker:

```text
VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_COORDINATOR_V1_PROOF_GREEN
```

## Deliberately absent authority

This lane does not:

- mount an HTTP or startup runtime;
- deploy or restart a service;
- access a real credential, wallet, private key, mnemonic, or signer;
- perform real signing in CI or during this source change;
- persist or output raw signed transaction bytes;
- broadcast or rebroadcast;
- wait for or accept a receipt;
- release a nonce reservation;
- decrement inventory;
- mark a public request fulfilled;
- write or settle Work Credits;
- mutate validators; or
- move funds.

A future broadcast lane must use the exact opaque custody handle under a separate explicit authority and must preserve the saga's write-ahead broadcast intent and mandatory possible-broadcast reconciliation rules.
