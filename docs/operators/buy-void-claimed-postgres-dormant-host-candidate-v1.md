# Buy VOID claimed PostgreSQL dormant host candidate v1

Marker: `VOID_BUY_VOID_CLAIMED_POSTGRES_DORMANT_HOST_CANDIDATE_V1`

Status: source-only host candidate. It defines the exact dormant overlay needed
to prepare the designated VOID host for the claimed PostgreSQL dispatcher
without enabling any runtime or apply authority.

## Composition

This candidate deliberately does not replace the accepted payment-keyed
production candidate. It composes three reviewed systemd source examples:

1. `91-buy-void-payment-keyed-production-dormant-v1.conf.example`
   supplies the existing payment-keyed policy with full runtime and apply both
   disabled.
2. `92-buy-void-dispatcher-postgres-credentials-v1.conf.example`
   supplies only the two fixed PostgreSQL `LoadCredential=` bindings.
3. `93-buy-void-claimed-postgres-dormant-v1.conf.example`
   supplies the newly required claimed/admitted selectors and variable
   PostgreSQL connection settings.

The machine-readable overlay candidate is:

`ops/mainnet0/buy-void-claimed-postgres-dormant-host-candidate-v1.json`

## Dormant overlay

The exact overlay environment is:

```text
VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED=0

VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST=127.0.0.1
VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT=5432
VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX=4
VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS=5000
VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS=5000
```

The accepted base policy continues to provide:

```text
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0
```

Therefore all five relevant runtime/activation switches are zero in the composed
candidate.

## Fixed PostgreSQL identity

The source verifier continues to fix, rather than accept from the operator
request:

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

Only literal loopback PostgreSQL is accepted by this generation.

## Credential boundary

The overlay does not contain `LoadCredential=` because those bindings remain
owned by source example `92`.

It does not set `CREDENTIALS_DIRECTORY`. systemd supplies that dynamically
when credentials are materialized.

No password, CA bytes, wallet material, DSN, `DATABASE_URL`, `PGPASSWORD`,
or private key is present in this candidate.

## Service boundary

The overlay contains no:

- `ExecStart=`, `ExecStartPre=`, or `ExecStartPost=`;
- service restart/reload instruction;
- database provisioning command;
- wallet/signer access;
- Chain-2050 RPC action;
- transaction broadcast; or
- funds action.

Source acceptance does not authorize installation on Precision.

## Proof

The focused proof requires:

- exact machine-readable overlay contents;
- exact source-main binding at candidate creation;
- no environment-key overlap between `91` and `93`;
- exact two fixed `LoadCredential=` bindings in `92`;
- all five execution/activation switches equal `0`;
- exact fixed PostgreSQL database/user/application/schema/TLS/credential
  identities;
- the accepted PostgreSQL production configuration verifier returns
  `candidate_verified`;
- no credential read, connection, provisioning, service mutation, broadcast, or
  funds action; and
- no secret-bearing or service-execution directives in the three candidate
  fragments.

## Remaining host gates

Repository acceptance does not claim the designated host is ready. The following
remain observational/operator gates:

1. exact designated-host source alignment;
2. local PostgreSQL 16 readiness;
3. PostgreSQL server TLS configuration;
4. dispatcher database/role/schema/ACL provisioning;
5. password credential source binding;
6. CA credential source binding;
7. exact composed systemd environment; and
8. observation that the runtime remains disabled.

Those gates are why the next step is a read-only Precision census, not runtime
activation.
