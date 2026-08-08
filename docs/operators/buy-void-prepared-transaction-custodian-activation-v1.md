# Buy VOID prepared-transaction custodian activation v1

Marker:

`VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_V1`

Decision:

`SOURCE_ONLY_EXACT_CONFIRMATION_PRIVATE_CUSTODIAN_SERVICE_START_BOUNDARY`

## Purpose

Add the missing activation boundary between the merged credential-backed private
prepared-transaction custodian composition and any later private
`prepare_once(...)` request.

The existing credential composition creates the real private custodian service
and the fixed systemd-credential-backed signer, but intentionally returns the
service unstarted.

This lane reuses that exact composition. It does not create a second custodian
or signer.

## Three separate gates

1. **Source merge** — starts nothing and reads/signs nothing.
2. **Custodian service activation** — requires `apply=true` plus exact
   confirmation `buyVoidStartPreparedTransactionCustodianV1`.
3. **Transaction preparation** — a later private IPC `prepare_once(...)`
   request may read the fixed credential and sign the exact prepared
   transaction.

Service activation does not imply transaction preparation.

## Dry-run boundary

Dry run composes the existing credential-backed custodian and returns:

- the public signer fingerprint;
- the exact later activation confirmation; and
- explicit no-read/no-sign/no-broadcast truth.

Dry run does not call `service.start()` and creates no Unix socket.

The signer factory is specifically designed so credential access occurs only
inside a later `prepare_once(...)` operation, not during composition.

## Apply boundary

Apply requires the exact confirmation:

`buyVoidStartPreparedTransactionCustodianV1`

Only then may the wrapper call the existing custodian service `start()` method.

Starting the service may create private filesystem state:

- private Unix-socket parent/state directories;
- private custody store directories;
- the private Unix socket.

The underlying service enforces private ownership/mode and direct-path
requirements. Starting it does not issue a prepare request and does not invoke
the signer.

If service start fails, the wrapper attempts best-effort service cleanup and
returns held truth. It does not retry automatically.

## Separation from broadcaster and submission

This lane does not:

- start the submission-capable broadcaster;
- configure or call RPC;
- invoke `submit_once`;
- inspect a submission;
- broadcast a transaction;
- decrement inventory;
- emit a live fulfilled closeout; or
- move funds.

The separately merged broadcaster submission-activation boundary remains a
later independent gate.

## Proof boundary

The focused proof uses temporary private directories and **no credential file**.

It proves:

- wrong activation confirmation is rejected before composition;
- dry run composes successfully with no service start;
- exact apply starts the real private Unix-socket custodian service;
- the socket is private;
- the credential directory remains empty;
- no signer idempotency state is created;
- no custodian intent/prepared records are created;
- no credential is read;
- no signing occurs;
- no `prepare_once` request occurs;
- no RPC call, submission, broadcast, or money movement occurs; and
- stopping the returned service removes the synthetic socket.

## Authority boundary

Source, proof, documentation, and workflow only.

No production service activation, production credential access, production
signing, runtime environment enablement, production RPC configuration/call,
transaction preparation, submission/broadcast, deployment/restart, inventory
decrement, live fulfilled closeout, Work Credit/validator mutation, or fund
movement is authorized by this source lane.

Ready-for-review, merge, production custodian activation, production broadcaster
activation, actual `prepare_once`, actual `submit_once`, and a live purchase
canary remain separate authorization gates.
