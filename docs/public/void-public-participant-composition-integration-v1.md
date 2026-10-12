# VOID public participant composition integration v1

Marker: `VOID_PUBLIC_PARTICIPANT_COMPOSITION_INTEGRATION_V1`

## Purpose

Integrate the already-merged participant session HTTP contract and authenticated
account-read HTTP edge into the existing public app composition gateway without
activating them by default.

This is a source/runtime-composition contract only. The checked-in default
remains disabled.

## Activation hold

The routes are intercepted only when:

`VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE=1`

The default is false. If the flag is absent, the gateway preserves its existing
routing behavior for these paths.

Enabled composition also requires:

`VOID_PUBLIC_PARTICIPANT_BINDING_REGISTRY_FILE=/absolute/private/path`

The existing session primitive enforces the registry's private ownership and
mode contract.

## Shared session invariant

Exactly one `VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1` instance is created by
the composition gateway.

That same object is:

1. used directly for challenge/login/logout/session status; and
2. passed into
   `VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1`.

Therefore a login session issued by the session route is the same session state
authorized by Wallet/Earn reads. No second session store or reconstructed
authority is introduced.

## Exact routed namespaces

Session:

- `/__void/participant/session/v1/status.json`
- `/__void/participant/session/v1/challenge`
- `/__void/participant/session/v1/login`
- `/__void/participant/session/v1/logout`

Authenticated account reads:

- `/__void/participant/account-read/v1/status.json`
- `/__void/participant/account-read/v1/wallet.json`
- `/__void/participant/account-read/v1/earn.json`

No prefix proxy is introduced.

Raw Wave-3/4, Wallet, Work Credit, jobs, receipts, RPC, admin, validator, and
other existing blocked routes remain governed by the gateway's existing
fail-closed policy.

## Request adapter

The gateway converts one incoming request into the already-reviewed handler
shape.

Participant request bodies are capped at 8192 bytes before handler dispatch.
Handler-produced `set-cookie` and `content-length` values are not trusted;
the gateway writes its own bounded response framing.

## Authority boundary

This integration does not grant:

- Wallet passphrase/private-key access;
- Wallet unlock/export/send;
- transaction signing or broadcast;
- Work Credit mutation or settlement;
- validator/operator mutation;
- generic RPC;
- Chain-2050 writes;
- money movement; or
- automatic production activation.

## Production boundary

Merging this source must not activate the routes.

A later explicit lifecycle gate must separately establish:

- the production binding-registry path;
- the Chain-2050 role-authority/revalidation decision;
- runtime configuration;
- designated-host verification;
- service restart/rollback evidence; and
- public reachability.

## Proof

`scripts/prove_void_public_participant_composition_integration_v1.mjs` runs
the real composition gateway against disposable local fixtures and proves:

- activation defaults false;
- disabled mode preserves preexisting fallback routing;
- enabled mode composes one shared session instance;
- Ed25519 challenge/login succeeds;
- the resulting bearer session authorizes exact-account Wallet/Earn reads;
- wrong-account reads fail;
- raw Wave-3 remains blocked;
- oversized participant bodies fail before handler parsing; and
- no deployment or service mutation is performed by the proof.

Hosted proof targets Node 22, 24, and 26.
