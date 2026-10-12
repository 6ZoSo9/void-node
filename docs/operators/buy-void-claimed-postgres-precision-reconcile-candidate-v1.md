# Buy VOID claimed PostgreSQL Precision reconcile candidate v1

Status: source-only designated-host reconciliation candidate. This lane exists
because the actual Precision host already has the Buy VOID parent and
payment-keyed full runtime enabled for non-money operation while the full-runtime
apply gate remains disabled.

The candidate therefore preserves the measured safe runtime posture instead of
blindly installing the generic all-zero dormant overlay.

## Observed safe baseline

The read-only host census established this effective state:

```text
VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=1
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=1
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=<unset>
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED=<unset>
```

It also established:

- clean `main` worktree;
- local PostgreSQL 16.15 present;
- loopback port 5432 accepting connections;
- PostgreSQL system service active/enabled; and
- neither dispatcher PostgreSQL credential ID currently bound.

The census performed no Git fetch, service action, credential-content read,
database login, wallet/RPC/broadcast, or funds action.

## Reconciled target

The target runtime state is:

```text
VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=1
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=1
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED=0
```

The new `94` source example intentionally does **not** write the first three
keys. It only supplies the two new disabled dispatcher selectors and the bounded
loopback PostgreSQL connection configuration:

```text
VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST=127.0.0.1
VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT=5432
VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX=4
VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS=5000
VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS=5000
```

This avoids changing already-qualified non-money runtime behavior while still
making the new dispatcher configuration explicit.

## Credential boundary

The `94` overlay contains no credential directives.

The existing reviewed `92` source example remains the sole owner of:

```text
LoadCredential=buy-void-dispatcher-postgres-password-v1:...
LoadCredential=buy-void-dispatcher-postgres-ca-v1:...
```

The credential source paths and contents remain operator-private and outside the
repository. `CREDENTIALS_DIRECTORY` remains systemd-derived.

## Fixed database identity

The production configuration verifier continues to require exactly:

```text
database          void_buy_void_dispatcher_v1
database user     void_buy_void_dispatcher_v1
application name  void-node-buy-void-dispatcher-v1
schema contract   buy-void-payment-keyed-dispatcher-postgres-v1
SSL mode          verify-full
TLS server name   localhost
password cred     buy-void-dispatcher-postgres-password-v1
CA cred           buy-void-dispatcher-postgres-ca-v1
```

The reconcile proof composes `94` with the accepted fixed identity and the
systemd-derived credential-directory contract and requires
`candidate_verified`.

## Source alignment remains first

The census also proved the live Precision checkout was behind current `main`.
The service executes from `~/dev/void-node`, so the source update strategy must
not silently rewrite files underneath the running process before process/source
coupling is understood and controlled.

The repository already contains the reviewed fleet source-convergence controller,
which can fetch and fast-forward source without restarting the service. Whether
that is appropriate for this live process is a separate host observation gate.

## Authority boundary

This PR performs no host mutation. It does not:

- fetch or fast-forward Precision;
- install the `92` or `94` drop-ins;
- daemon-reload or restart a service;
- read credential contents;
- log into PostgreSQL;
- create/alter database roles or schema;
- enable the claimed/admitted runtime;
- enable full-runtime apply;
- access a wallet;
- call Chain-2050;
- sign/broadcast;
- mutate inventory/WC; or
- move funds.

## Next host gates

Before any apply step:

1. inspect exact live process/source coupling;
2. stage or align current source without mixed-generation execution;
3. read-only inspect PostgreSQL TLS/database/role/schema state;
4. determine exact private credential-source creation/binding needs;
5. build a no-restart systemd install plan for `92` + `94`;
6. prove the composed effective environment keeps apply/claimed/admitted gates
   disabled; and only then
7. separately authorize any service restart or activation transition.
