# Buy VOID prepared-transaction custodian credential activation v1

Marker:

`VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_V1`

Decision:

`SOURCE_ONLY_EXPLICIT_CUSTODIAN_CREDENTIAL_SERVICE_START_BOUNDARY`

## Purpose

Add the missing activation boundary above the merged credential-backed
prepared-transaction custodian composition.

The merged composition constructs the fixed systemd-credential-backed signer
and the private Unix-socket custodian service but deliberately returns that
service unstarted. This lane adds one explicit start operation without changing
the signer, custody, transaction, broadcast, or terminal-closeout semantics.

## Exact confirmation

An applied start requires:

`buyVoidStartPreparedTransactionCustodianCredentialServiceV1`

A wrong confirmation fails before composition and before service start.

Dry run remains the default.

## Activation boundary

Dry run:

- constructs the existing source-only composition;
- does not start the service;
- does not read a credential;
- does not sign;
- does not call RPC;
- does not broadcast;
- does not move funds.

Explicit apply:

- requires the exact activation confirmation;
- reuses the existing credential-backed custodian composition;
- starts only the private custodian Unix-socket service;
- creates the service socket/private service state as required by the existing
  service implementation;
- still performs no credential read or signing during activation.

Starting the service is security-sensitive because it makes the existing
private `prepare_once(...)` signing capability reachable over the custodian
IPC. Actual credential access and signing remain deferred until a later
`prepare_once(...)` request reaches the existing credential signer.

## Credential boundary

The fixed systemd credential remains:

`buy-void-native-fulfillment-wallet-v1`

The credential signer factory is not invoked during composition or activation.
It is invoked only inside the existing idempotent `prepare_once(...)` path.

Therefore this lane does not authorize or prove a production credential read.
It proves only that the private service can be started without touching the
credential.

## Existing custody guarantees retained

This lane does not alter:

- deterministic preparation idempotency;
- durable intent-before-signer ordering;
- private 0700 custody state;
- private 0600 custody records;
- exact signer fingerprint binding;
- signed transaction plan/sender validation;
- raw signed transaction private-store-only handling;
- raw signed transaction IPC-output prohibition;
- read-only `inspect_prepared`;
- absence of any transaction-broadcast interface in the custodian service.

## Source and runtime state

This is source only.

There is:

- no direct CLI activation;
- no runtime route mount;
- no startup execution;
- no background loop;
- no automatic start;
- no environment-variable activation;
- no deployment or service restart.

Merging the source cannot start the production custodian.

A future production start remains a separate explicit operator authorization.

## Verification

The focused proof must establish:

- dry run never starts the service;
- wrong confirmation fails before composition;
- exact confirmation can start a synthetic source service;
- the real merged composition plus real custodian service can start on
  synthetic private paths;
- no credential-signer factory invocation occurs during dry run or start;
- signer idempotency state is not created merely by service start;
- no signing, RPC, broadcast, or money movement occurs;
- the private signing capability is truthfully reported as reachable only
  after service start and a later prepare request.

The workflow also preserves the merged credential-composition, credential
signer, custodian IPC, saga prepared-custody, and crash-consistent runtime
proofs.

## Authority boundary

This lane may make the existing private preparation/signing interface reachable
if an operator separately runs the activation with exact confirmation.

It does **not** itself:

- read a production credential;
- sign a transaction;
- start the production service during source publication or merge;
- mount a public/runtime route;
- call production RPC;
- start the broadcaster service;
- enable broadcaster submission;
- broadcast or rebroadcast a transaction;
- decrement inventory;
- emit a fulfilled closeout;
- deploy or restart a production service;
- mutate Work Credits or validators; or
- move funds.

Production service activation, production preparation/signing, broadcaster
submission activation, real transaction broadcast, receipt acceptance, and
terminal fulfilled closeout remain separate authorization gates.
