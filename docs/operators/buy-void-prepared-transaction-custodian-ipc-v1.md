# Buy VOID prepared-transaction custodian IPC v1

Marker:

`VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1`

Decision:

`SOURCE_ONLY_OPAQUE_CUSTODIAN_TRANSPORT_READY_RUNTIME_MOUNT_NOT_AUTHORIZED`

## Purpose

PR #1014 defines the crash-consistent `prepare_once(...)` / `inspect_prepared(...)`
custodian contract but intentionally leaves the custodian implementation and
runtime mount outside the application.

This lane supplies a source-only Unix-domain-socket transport plus a private
custodian record store. It does not mount transaction preparation into the Buy
VOID runtime and it does not provide or activate a production signer.

## Application-side boundary

`src/economic/buy_void_prepared_transaction_custodian_ipc_v1.ts` implements the
exact PR #1014 custodian interface over one server-controlled Unix-domain socket.

The application sends only the reviewed preparation fields: idempotency key,
saga/attempt/reservation identities, transaction-plan fingerprint, chain ID
`2050`, fulfillment-wallet identity, nonce, delivery address/native value, and
bounded gas/fee fields.

The adapter rejects non-absolute or symlink-ancestor socket paths, non-socket or
symlink socket endpoints, non-private socket parents/endpoints, cross-UID socket
ownership when UID metadata is available, oversized requests/responses,
timeouts, multiple responses, response-binding/schema drift, forbidden secret-named fields, non-code held
reasons, deterministic #1014 idempotency-key drift, unexpected signer fingerprints,
and opaque handles that are not exactly derived from the request idempotency
key. After one valid response it destroys the connection rather than accepting
later trailing data.

Successful application responses remain limited to the #1014 public contract:
opaque custody handle, signed transaction hash, wallet identity, signer
fingerprint, and transaction-plan fingerprint. Raw signed bytes are not returned
through this adapter.

## Custodian service boundary

`tools/buy-void-prepared-transaction-custodian-service-v1.mjs` is a source-only
library. Direct CLI activation is intentionally disabled. Its public service
object exposes only `start`, `stop`, and authority metadata; preparation is
reachable only through the Unix socket. It has no broadcaster dependency and
exposes no broadcast method.

A future separately authorized production composition must inject a signer with
an **idempotent `prepare_once(...)` contract** and separately configure the
expected public signer fingerprint. Repeating that signer call with the same
idempotency key must recover the identical signed bytes rather than perform an
independent re-sign with potentially different bytes. A signer result carrying
a different fingerprint is rejected before custody publication.

The custodian service performs the following durable sequence:

1. validate the exact closed preparation request and independently recompute the #1014 deterministic idempotency key from the custody domain, saga ID, attempt ID, plan-reservation ID, and transaction-plan fingerprint;
2. return an existing complete custody record if present;
3. atomically publish a private `0600` write-ahead intent before invoking the
   signer;
4. invoke the signer's idempotent `prepare_once(...)` with the same deterministic
   key on every recovery;
5. validate the signer's exact closed result;
6. independently decode the signed type-2 transaction and prove the recovered
   sender, chain ID `2050`, nonce, destination, native value, gas limit, fee
   fields, empty calldata/access list, and transaction hash exactly match the
   reserved preparation request;
7. require the signer fingerprint to equal the server-controlled expected
   fingerprint and derive the opaque custody handle exactly from the idempotency
   key;
8. atomically publish and fsync the private `0600` custody record; and only then
9. return the public opaque custody projection.

Both intent and record directories are private and reject symlink ancestors.
Raw signed bytes remain inside the custodian's private store and are never
included in an IPC response. Atomic publication may transiently use a private
`0600` temporary file in that same store; only the canonical record/opaque handle
is authoritative for later broadcast custody.

`inspect_prepared(...)` is read-only and never invokes the signer.

## Crash semantics

The write-ahead intent closes the unsafe re-sign window that would exist if the
signer were invoked before any durable idempotency evidence existed.

### Loss after intent, before signer

The durable intent already binds the exact request. Restart invokes the same
signer `prepare_once(...)` key. In the proof fixture this produces exactly one
signing event.

### Loss after signer result, before custody-record publication

Restart finds the durable intent and invokes the same signer `prepare_once(...)`
key. The signer must return its exact prior signed bytes as a duplicate. The
custodian then publishes the missing custody record. The proof verifies two
signer `prepare_once` invocations but exactly one synthetic signing event.

### Loss after custody record, before application reply

Restart returns the complete custody record as `duplicate` without invoking the
signer again.

Concurrent application calls for one idempotency key must resolve to the same
opaque handle and transaction hash, with one underlying signing event under the
required signer idempotency contract.

## Privilege-separation note

This v1 source lane proves a private same-UID Unix-socket/process boundary and
private filesystem modes; it does **not** claim a separate Unix-account or HSM
privilege boundary. A production separate-UID/group socket activation design,
production signer binding, and custody-root placement are separate review and
activation gates. The application code in this lane never opens or parses the
custodian raw-signed-transaction store.

## Adversarial proof

`scripts/prove_buy_void_prepared_transaction_custodian_ipc_v1.ts` uses only a
hard-coded synthetic test key inside an isolated fixture signer. It performs
local deterministic test signing so the custodian can independently decode and
verify a real type-2 transaction shape; it never accesses a production wallet,
production signer, credential, RPC endpoint, or fund-bearing key.

The proof covers private socket/store/intent/record permissions; normal prepare,
duplicate prepare and read-only inspection; write-ahead intent before signer;
loss before signer; loss after signer but before custody persistence; loss after
custody persistence but before reply; recovery without a second signing event;
concurrent duplicate preparation; idempotency conflict; alternate valid-looking idempotency-key rejection before signer invocation on both adapter and raw-service paths; signed-transaction
value/fee/nonce/chain/destination binding; recovered-sender binding; persisted
record revalidation; server-controlled signer-fingerprint binding; exact opaque
handle/idempotency binding; secret-named signer-result and IPC-response field
rejection; 64-hex secret-bearing held-reason rejection; oversized response rejection;
widened socket-mode rejection; and symlinked socket-ancestor rejection.

Expected marker:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1_PROOF_GREEN
```

## Authority boundary

This lane is source, proof, documentation, and CI only. It does **not** mount the
custodian into `buy_void_runtime_integration_v1`; start a production socket;
access a production private key, wallet, mnemonic, keystore, signer, or HSM;
perform real signing; call live RPC; broadcast; decrement/release inventory;
mark fulfillment; mutate Work Credits or validators; deploy/restart a service;
or move funds.

Runtime composition, production idempotent-signer binding, OS privilege
separation, service activation, transaction-preparation apply, broadcast custody
reconciliation, receipt acceptance, terminal closeout, deployment, and money
movement remain separate explicit gates.
