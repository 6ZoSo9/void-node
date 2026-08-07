# Buy VOID prepared-transaction broadcaster chain-2050 composition v1

Marker:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_V1
```

Decision:

`SOURCE_ONLY_PRIVATE_BROADCASTER_SERVICE_PLUS_CHAIN2050_TRANSPORT_COMPOSITION_RUNTIME_UNMOUNTED`

## Purpose

This composition closes the source-level gap between two separately bounded
components:

1. the private prepared-transaction broadcaster Unix-socket service; and
2. the private chain-2050 submit/inspect transport.

The composition creates both under one server-controlled policy and injects the
chain-2050 transport into the private broadcaster service.

It does not start the service.

## Composition policy

The caller must provide server-controlled values for:

- Unix socket path;
- private prepared-custody store directory;
- private broadcaster state directory;
- expected signer fingerprint;
- loopback chain-2050 RPC URL;
- RPC timeout and response-size bounds.

Paths must be absolute, non-root, and distinct.

The signer fingerprint must be a canonical SHA-256 value.

## Creation semantics

Composition creation:

1. validates the server policy shape;
2. creates the chain-2050 transport;
3. therefore performs only the chain transport's read-only chain-identity
   readiness probe when the composition factory is actually invoked;
4. loads the existing private broadcaster service module;
5. injects the chain transport into that service; and
6. returns the unstarted service.

Creation does not call `service.start()` and cannot submit a transaction.

## End-to-end private boundary

When a separately authorized caller later starts the returned service:

```text
application
  -> metadata-only private Unix-socket IPC
  -> private broadcaster service
  -> private custody record read
  -> private chain-2050 transport
  -> existing hardened chain-2050 broadcaster
  -> eth_sendRawTransaction
```

The application never receives the private custody handle or raw signed
transaction bytes.

The composition layer itself never receives raw signed bytes either; they flow
inside the private broadcaster service directly into its injected transport.

## Crash/retry boundary

The private service remains authoritative for durable pre-submit intent and
duplicate-submit suppression.

The chain-2050 transport remains authoritative for translating definite
pre-submit failure to `not_submitted` and ambiguous post-send failure to
`unknown`.

The saga broadcast/reconciliation coordinator remains authoritative for
write-ahead saga intent, inspection-only reconciliation, attempt-specific
recipient/amount receipt binding, evidence persistence, and terminal
projection ordering.

No layer adds automatic resubmission.

## Activation boundary

This is source-only composition.

No runtime route is mounted.
No background loop or startup execution is added.
No CLI/service unit is added.
No production service is started.
No production RPC policy is installed.
No live transaction is submitted by this lane.

A later runtime/service activation lane must separately gate service start and
application-side broadcast/reconciliation runtime mounting.

## Focused proof

Expected marker:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_CHAIN2050_COMPOSITION_V1_PROOF_GREEN
```

The proof uses a synthetic signed chain-2050 transaction and injected fake RPC
transports. It locally starts only the synthetic private Unix-socket service,
then proves the full metadata-only application IPC -> private custody ->
chain-2050 transport path, exactly one synthetic submit call, duplicate-submit
suppression, and synthetic terminal receipt inspection.

It performs no real RPC and no real transaction broadcast.

## Authority boundary

Source, proof, documentation, and CI only.

No branch publication from this preflight, no runtime route mount, no
production private service activation, no production RPC, no production signer
use, no credential/private-key access by the application, no real transaction
broadcast, no deployment/restart, no inventory decrement, no public fulfilled
closeout, no Work Credit/validator mutation, and no money movement.
