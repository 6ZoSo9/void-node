# Buy VOID prepared-transaction broadcaster inspection activation v1

Marker:

`VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_INSPECTION_ACTIVATION_V1`

Decision:

`SOURCE_ONLY_INSPECTION_CAPABLE_PRIVATE_SERVICE_START_WITH_SUBMISSION_HARD_DISABLED`

## Purpose

Introduce the next bounded Buy VOID runtime boundary after the
`execute_prepared_transaction` source mount.

This lane makes the existing private prepared-transaction broadcaster service
startable by an explicit caller only in inspection-only mode. It does not add
a CLI, systemd unit, startup hook, environment reader, runtime route, or
production configuration.

## Service-level submission gate

The existing private broadcaster service gains an optional
`submission_enabled` boolean.

Compatibility rule:

- omitted => existing behavior remains enabled;
- `true` => existing behavior remains enabled;
- `false` => IPC `submit_once` is rejected before custody lookup and before
  durable submission-intent creation.

The rejection is:

`prepared_broadcaster_service_submission_disabled`

Blocking only the injected chain transport would be too late because the
service persists its durable submission intent before transport invocation.

## Inspection activation

The new source module reuses the existing chain-2050 private transport factory
and the existing private broadcaster service.

It always constructs the service with:

`submission_enabled: false`

Dry run creates no socket and starts no service.

Apply requires the exact confirmation:

`buyVoidStartPreparedTransactionBroadcasterInspectionOnlyV1`

An applied call may start the private Unix-socket service and therefore may
create its private socket/state directories. The service remains unable to
execute `submit_once`.

Inspection can use the existing read-only chain-2050 methods through the
injected transport when valid durable request/custody state exists.

## Separation from later gates

This lane does not choose or source a production RPC endpoint. The caller must
provide the RPC policy separately.

It does not activate a signer or custodian, create a systemd unit, mount the
service into application startup, or enable the execute runtime.

It does not authorize a transaction submission.

A later submission-capable service activation must be a separate reviewed lane
that explicitly changes the instance-level service gate from disabled to
enabled and re-proves durable exactly-once/reconciliation behavior.

## Proof boundary

The proof verifies:

- dry run does not start the service;
- wrong activation confirmation does not construct the chain transport;
- applied synthetic activation passes `submission_enabled: false`;
- a real Unix-socket service instance configured with submission disabled
  rejects `submit_once`;
- that rejection occurs before custody lookup;
- no submission intent is created;
- the submit transport is never called;
- existing default broadcaster IPC proof remains green;
- existing chain-2050 and broadcaster-composition proofs remain green;
- execute-runtime and parent-dispatch proofs remain green.

The proof makes no production RPC call, starts no production service, submits
no real transaction, and moves no funds.

## Authority boundary

Source/proof/documentation/workflow only.

No service activation on a deployed machine, production RPC configuration or
call, credential/signer access, real transaction broadcast, deployment,
restart, inventory decrement, fulfilled closeout, Work Credit/validator
mutation, or money movement is authorized by this source lane.
