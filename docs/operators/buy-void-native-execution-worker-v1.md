# Buy VOID Native Execution Worker V1

## Purpose

This worker is the first bounded component that can turn a committed Buy VOID
inventory reservation and execution-attempt reservation into a native chain
2050 signing and broadcast attempt.

It is source-only and not mounted or started by this lane.

## Required inputs

The caller supplies server-controlled objects and policy:

- the claimed fulfillment intent;
- the committed bounded execution plan;
- the exact execution-attempt and inventory journals under one root;
- a fixed native VOID transaction plan;
- an injected fulfillment signer;
- an injected chain-2050 broadcaster;
- a 64-character submission idempotency key.

The buyer cannot supply a private key, mnemonic, RPC URL, raw signed
transaction, wallet policy, journal root, or broadcaster configuration through
this module.

## Deterministic transaction-plan fingerprint

The native sign/broadcast adapter content-addresses the normalized transaction
plan before the durable submission claim. Fingerprint object keys are ordered by
explicit ECMAScript UTF-16 code-unit comparison using `<` and `>`.

Locale-aware ordering is forbidden. The deterministic proof statically rejects
both `localeCompare` and `Intl.Collator`, and independently recomputes the exact
fingerprint from the normalized plan.

## Attempt-level durable idempotency

The delivery submission guard now binds the first accepted submission identity
immutably to the pair:

```text
(adapter_marker, execution_attempt_id)
```

That immutable binding includes:

- the submission idempotency key;
- the expected transaction hash; and
- the transaction-plan fingerprint.

A different idempotency key cannot reopen the same adapter and execution
attempt, including after a broadcast outcome is unknown. A released claim may
be reclaimed only with the exact original complete binding. Reusing one
idempotency key for a different attempt also remains forbidden.

The append-only journal validates this attempt-level invariant while reading.
A hash-chain-valid journal containing a second binding for the same adapter and
attempt fails closed.

## Release disposition and retry safety

Exact binding equality is necessary but not sufficient for reclaim. The latest
durable release reason must also be one of the closed reasons that proves the
adapter did not submit the transaction:

- `signer_address_read_failed`;
- `signer_address_mismatch`;
- `transaction_signing_failed`;
- `invalid_raw_signed_transaction_from_signer`;
- `signed_transaction_parse_failed`;
- `signed_transaction_hash_mismatch`;
- `signed_transaction_binding_mismatch`;
- `invalid_provider_submission_id`; or
- `broadcast_definitively_not_submitted`.

Any other normalized release reason is terminal for reclaim. This includes
manual-reconciliation and operator dispositions that do not prove the absence
of a broadcast. The runtime claim path returns
`submission_release_not_retry_safe` without appending, and journal replay
rejects a forged claim placed after a terminal release even when the forged
entry has a valid sequence and hash-chain link.

An equivalent repeated release reason remains idempotent without another
journal entry. A conflicting reason is rejected and leaves the journal
byte-for-byte unchanged.

## Dry run

Dry run is the default. It verifies all bindings and returns the native
transaction preview without calling the signer, broadcaster, or journals.

## Apply wall

Apply requires the exact confirmation:

`buyVoidNativeExecuteReservedPlan`

Apply performs, in order:

1. validates the inventory reservation, bounded plan, fulfillment intent, and
   reserved execution attempt;
2. reads and verifies the injected signer address;
3. signs one native type-2 chain-2050 transaction in memory;
4. validates the signed transaction against every bound field;
5. prepares the existing execution-attempt journal with the derived hash;
6. claims the durable submission guard;
7. calls the existing native sign/broadcast adapter using an in-memory replay
   signer so the underlying credential signs only once;
8. records accepted, unknown, or definitive-not-broadcast outcomes through the
   existing pipeline coordinator;
9. clears the in-memory raw signed transaction reference.

## Adversarial verification

The focused proofs require:

- exact code-unit transaction-plan fingerprinting;
- static rejection of locale-aware comparators;
- rejection of an alternate idempotency key after an unknown broadcast;
- rejection of changed hashes or fingerprints for an existing attempt;
- rejection of idempotency-key reuse across attempts;
- exact same-binding retry only after a retry-safe definitive-not-broadcast
  release;
- rejection without mutation after a terminal/manual-reconciliation release;
- replay rejection of a correctly rehashed claim after a terminal release;
- append-only journal hash-chain verification; and
- rejection of a forged but rehashed alternate binding for one attempt.

The native execution workflow now triggers when either hardened source file or
proof changes and runs both proofs before the full build.

## Safety boundary

- one request per invocation;
- disabled by policy default;
- no automatic retry;
- no receipt wait;
- no raw signed transaction persistence or output;
- no public request-journal write;
- no inventory decrement or release;
- no runtime route added by this lane;
- no background loop or startup execution;
- no service, Tailscale, remote-machine, or Nimo changes.

When fully applied with real injected dependencies, this worker has wallet,
signing, transaction-broadcast, and money-movement authority for exactly one
validated reservation and transaction plan. This hardening lane does not mount,
configure, or invoke that authority.

## Remaining path to paid fulfillment

After this source hardening is merged, the remaining work is:

1. separately authorize and mount the `execute_reserved_plan` orchestrator
   stage under a server-controlled one-request policy;
2. bind server-controlled fee/nonce planning to the live chain-2050 RPC;
3. connect the existing systemd credential signer and loopback broadcaster;
4. add receipt reconciliation and confirmation processing;
5. decrement committed inventory only after confirmed delivery;
6. update the public request journal and buyer-visible status;
7. deploy disabled and execute one bounded live purchase canary;
8. activate the one-request worker under strict operational caps.

Every deployment, credential use, live RPC call, signing operation, transaction
broadcast, inventory mutation, and fund-moving action remains a separate
explicit gate.
