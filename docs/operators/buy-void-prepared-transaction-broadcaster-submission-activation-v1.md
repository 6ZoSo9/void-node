# Buy VOID prepared-transaction broadcaster submission activation v1

Marker:

`VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_V1`

Decision:

`SOURCE_ONLY_EXPLICITLY_CONFIRMED_PRIVATE_BROADCASTER_SUBMISSION_CAPABILITY`

## Purpose

Add the separately reviewed source boundary that can construct and explicitly
start the existing private prepared-transaction broadcaster with its existing
instance-level submission gate enabled.

This lane does not create another broadcaster implementation. It reuses:

- the existing private broadcaster Unix-socket service;
- the existing chain-2050 prepared-transaction transport;
- the existing durable submission-intent and monotonic outcome logic; and
- the existing opaque prepared-transaction custody record.

The source lane is the counterpart to the already merged inspection-only
activation. Inspection activation always sets `submission_enabled: false`; this
module sets `submission_enabled: true` only for the explicitly constructed
service instance.

## Three separate authority gates

### 1. Source merge

Merging this source does not start a service, choose a production RPC endpoint,
read a production credential, sign a transaction, submit a transaction, or move
funds.

The module is not a CLI, startup hook, background loop, or application route.

### 2. Service activation

Starting the submission-capable private service requires an explicit caller to
invoke this module with:

```text
apply=true
confirmation=buyVoidStartPreparedTransactionBroadcasterSubmissionV1
```

The caller must also provide server-controlled absolute private paths, the
expected signer fingerprint, and a loopback chain-2050 RPC policy.

A wrong activation confirmation is rejected before the chain transport factory
is invoked.

Activation can create/start the private Unix-socket service and its private
state directories, but activation itself performs no `submit_once` call.

### 3. Transaction submission

A started service can accept the existing private IPC `submit_once` method.
That method can invoke the injected chain-2050 transport and therefore can
perform `eth_sendRawTransaction` and move native value if the separately
prepared signed transaction is valid and the RPC endpoint is real.

That transaction submission remains a separate action from source merge and
service activation.

## Exactly-once / ambiguity boundary

The reused broadcaster service retains the existing write-ahead contract:

1. validate the public submission request;
2. load and fully revalidate the private custody record;
3. persist the deterministic submission intent durably;
4. only then invoke the private submit transport; and
5. persist the normalized monotonic outcome.

A second `submit_once` for an existing intent is not automatically resubmitted.
It is held with:

`prepared_broadcaster_submit_reentry_requires_inspection`

The caller must use `inspect_submission` to reconcile the durable intent.

This preserves the existing rule that ambiguous submit outcomes are never
blindly retried.

## Private-material boundary

The application IPC request contains only the public prepared-transaction
submission identity fields. It does not contain the custody handle or raw signed
transaction.

The private broadcaster reads the raw signed transaction from its private
custody store and passes it only to the injected private chain transport. The
raw signed transaction is not returned through application IPC.

This activation module does not read wallet credentials and does not sign.
Signing remains owned by the separately merged private custodian credential
composition.

## Synthetic proof

The focused proof uses only temporary private directories and a generated test
wallet. It injects a synthetic chain transport and starts a real instance of the
existing broadcaster service through this activation module.

It proves:

- dry run starts no service and submits nothing;
- wrong activation confirmation reaches neither chain factory nor submit path;
- applied synthetic activation starts the service with submission enabled;
- activation itself performs zero submit calls;
- the durable submission intent exists before the synthetic submit transport is
  called;
- the raw signed transaction reaches only the private synthetic transport;
- one synthetic `submit_once` invokes that transport exactly once;
- duplicate `submit_once` performs no second submission;
- duplicate submission requires `inspect_submission`;
- inspection performs one synthetic inspection call and no resubmission;
- intent/outcome records remain private; and
- IPC responses contain no raw signed transaction.

The proof performs no production credential access, no production signing, no
real RPC call, no real transaction broadcast, and no money movement.

## Relationship to the Buy VOID pipeline

Merged source now separately covers:

- crash-consistent saga observation/reservation;
- prepared transaction planning and private custody;
- fixed credential-backed private signing composition;
- chain-2050 broadcaster transport/composition;
- inspection-only broadcaster activation;
- execute-prepared-transaction runtime mounting;
- broadcast reconciliation; and
- terminal closeout runtime mounting.

This lane supplies the missing source-only service activation boundary for a
submission-capable private broadcaster. A later full synthetic end-to-end
fulfillment rehearsal should compose all of those already reviewed pieces in
one temporary fixture before any production canary is considered.

## Authority boundary

Source, proof, documentation, CI, ordinary branch publication, and draft PR
only.

No production service activation, production credential/signer access,
production RPC configuration or call, real transaction submission/broadcast,
deployment/restart, inventory decrement, live fulfilled closeout, Work
Credit/validator mutation, or fund movement is authorized or performed by this
lane.

Ready-for-review, merge, production broadcaster activation, production RPC
binding, actual `submit_once`, and any live purchase canary remain separate
authorization gates.
