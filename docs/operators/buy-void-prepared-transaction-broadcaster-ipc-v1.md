# Buy VOID prepared-transaction broadcaster IPC v1

Markers:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1
VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_V1
```

Decision:

`SOURCE_ONLY_OPAQUE_BROADCASTER_IPC_AND_PRIVATE_CUSTODY_SIDE_SERVICE_BROADCAST_RUNTIME_UNMOUNTED`

## Purpose

The crash-consistent broadcast/reconciliation coordinator already depends on an
abstract broadcaster with exactly two operations:

```text
submit_once(...)
inspect_submission(...)
```

The application-side broadcaster request contains only content-addressed
metadata. It intentionally does not contain the private custody handle or the
raw signed transaction.

This lane supplies the missing concrete Unix-socket transport while preserving
that boundary.

## Split authority

The application-side IPC client:

- accepts only the existing metadata-only broadcaster request;
- connects only to a same-user private Unix socket;
- never reads the private custody store;
- never receives a custody handle;
- never receives raw signed transaction bytes; and
- validates exact bounded response schemas.

The private broadcaster service:

- reads the existing prepared-transaction custodian service store read-only;
- requires the record directory and record to be direct, private, and same-UID;
- independently binds saga, attempt, custody idempotency, custody-handle
  fingerprint, transaction-plan fingerprint, signer fingerprint, and final
  signed transaction hash;
- independently parses the private raw signed transaction and verifies its
  chain/hash;
- passes raw signed bytes only to an injected private submission transport;
- returns only the existing public broadcaster decision contract over IPC.

The existing custodian service is not modified and retains
`transaction_broadcast_interface:false`.

## Crash boundary

Before the first external submission call, the private service durably creates
a submission intent keyed by the deterministic submission idempotency key.

If the same `submit_once` request reaches the service again after that intent
exists, the service does not call submit again. It returns a hold requiring the
caller to enter the existing reconciliation/inspection path.

`inspect_submission` never invokes `submit_once`.

If inspection occurs before the broadcaster service ever created a submission
intent, the result is definitive `not_submitted` without calling the external
transport.

If a process terminates after the external transport call but before the local
outcome is durable, restart uses inspection only.

Terminal confirmed/reverted outcomes are reused from the private broadcaster
state without another external inspection.

## Private state

The broadcaster service state directory is mode `0700`; intent/outcome records
are mode `0600`.

The broadcaster state stores only metadata and public submission/receipt
evidence. It does not persist raw signed transaction bytes, a custody handle,
private keys, mnemonics, seeds, or keystores.

Raw signed bytes remain in the existing custody-side private store and are
read only when the first private submission transport call is authorized.

## Activation boundary

The private service is a source-only library. Direct CLI activation is
intentionally disabled. No default production submission transport is supplied.

This lane does not mount the broadcaster into the Buy VOID runtime or into the
broadcast/reconciliation coordinator.

A later runtime composition must separately provide:

- a server-controlled broadcaster IPC socket;
- explicit broadcast enablement;
- exact confirmation/policy binding;
- current-call broadcast/money-movement truth propagation; and
- the existing crash-consistent reconciliation path.

## Focused proof

Expected marker:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1_PROOF_GREEN
```

The proof uses synthetic test signing and an injected fake transport only. It
proves:

- raw signed bytes cross only the private service-to-transport boundary;
- raw signed bytes never cross application IPC;
- durable intent exists before the first transport submit;
- duplicate `submit_once` does not call transport again;
- inspection before any service submit is definitive not-submitted;
- pre-submit crash recovery performs no submission;
- post-submit/pre-outcome crash recovery uses inspection without resubmission;
- terminal inspection reuses durable private outcome;
- secret-bearing transport results are rejected before IPC; and
- runtime mount, production transport use, and real transaction broadcast are
  all false.

## Authority boundary

Source, proof, documentation, and CI only.

No runtime route mount, background loop, production transport, live RPC,
credential/private-key access by the application, production signing,
transaction broadcast, deployment, service start, service restart, inventory
decrement, public fulfilled closeout, Work Credit mutation, validator mutation,
or fund movement is performed by this lane.
