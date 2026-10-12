# Buy VOID production activation plan v1

Marker:

`VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1`

Decision:

`PURE_SOURCE_ONLY_CROSS_COMPONENT_PRODUCTION_BINDING_PLAN`

## Purpose

Bind the already-merged Buy VOID custodian and broadcaster activation policies
into one deterministic, fail-closed production plan **without activating either
service**.

The plan exists to prevent an operator from independently configuring valid
components that do not actually belong to the same fulfillment authority. In
particular, it prevents a submission-capable broadcaster from being started
against a different private custody store or a signer fingerprint that does not
match the exact expected fulfillment wallet.

## Inputs

The plan consumes only explicit policy values already required by the merged
activation modules:

### Custodian

- private Unix socket path;
- private custody store directory;
- systemd credentials directory; and
- expected fulfillment wallet address.

### Broadcaster

- private Unix socket path;
- the same private custody store directory;
- private broadcaster state directory;
- expected signer fingerprint; and
- chain-2050 loopback RPC policy.

No credential file is opened and no service object is constructed.

## Cross-component bindings

A plan is ready only when:

1. custodian and broadcaster use the **exact same** custody-store path;
2. custodian socket, broadcaster socket, custody store, broadcaster state, and
   credentials directory are distinct absolute non-root paths;
3. the expected wallet is a canonical EVM address;
4. the broadcaster signer fingerprint exactly equals the deterministic
   `buyVoidPreparedTransactionCredentialSignerFingerprintV1(...)` value derived
   from that wallet;
5. the broadcaster expected chain ID is exactly `2050`; and
6. the RPC URL is explicit loopback HTTP (`127.0.0.1` or `::1`) with an explicit
   valid port and no URL credentials, query, or fragment.

This validation is synchronous and performs no filesystem or network I/O.

## Content-addressed plan

A ready decision emits a deterministic `plan_id_sha256` over:

- chain ID;
- normalized expected wallet;
- derived signer fingerprint;
- custody store;
- custodian socket;
- broadcaster socket;
- broadcaster state directory;
- credentials directory; and
- normalized loopback RPC URL.

Changing any of those bindings changes the plan ID.

The plan also emits an SHA-256 fingerprint of the normalized RPC URL. It does
not contact that URL.

## Separate authority gates

The plan deliberately does not collapse operational authorities.

It returns the existing exact confirmation required to start the private
credential-backed custodian:

`buyVoidStartPreparedTransactionCustodianCredentialServiceV1`

It separately returns the exact confirmation required to start the
submission-capable private broadcaster:

`buyVoidStartPreparedTransactionBroadcasterSubmissionV1`

It separately returns the existing exact transaction-submission confirmation:

`buyVoidSubmitPreparedTransactionFromOpaqueCustodyV1`

A ready plan therefore does not authorize any of those actions. It only binds
the configuration that a later separately authorized operator step may use.

## RPC boundary

This source validates only the static RPC policy shape.

It does not:

- open a TCP connection;
- call `eth_chainId`;
- call any read method;
- call `eth_sendRawTransaction`; or
- claim the production RPC endpoint is healthy.

The merged chain-2050 transport remains authoritative for the later live
read-only chain check and submission semantics.

## Relationship to merged Buy VOID stack

Current main already contains:

- credential-backed prepared-transaction custodian composition;
- explicit custodian credential service activation;
- chain-2050 broadcaster transport/composition;
- inspection-only broadcaster activation;
- explicit submission-capable broadcaster activation;
- execute-prepared-transaction runtime;
- broadcast reconciliation runtime;
- terminal closeout runtime; and
- synthetic end-to-end fulfillment rehearsal.

This lane adds only the missing cross-component production configuration
binding before any production service is started.

## Authority boundary

Source, proof, documentation, CI, and PR review only.

This lane performs no:

- service construction or start;
- production credential access;
- signing;
- RPC call;
- transaction submission or broadcast;
- production inventory mutation;
- public fulfilled projection;
- deployment or service restart;
- Work Credit or validator mutation; or
- money movement.

Production RPC health verification, production service activation, production
preparation/signing, real transaction submission, receipt acceptance, and a
live purchase canary remain separate explicit operational gates.
