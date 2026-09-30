# Buy VOID payment-keyed claimed PostgreSQL activation contract v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CONTRACT_V1`

Status: source-only activation state machine and readiness binding. This lane does
not install a systemd drop-in, reload or restart a service, read credentials,
connect to PostgreSQL, access a wallet/signer, sign or broadcast a transaction,
activate the public presale/market, or move funds.

## Why this contract exists

The production PostgreSQL substrate is now qualified on Precision:

- actual production credential-backed connection factory: GREEN;
- actual loopback TLS PostgreSQL connection: GREEN;
- actual read-only schema/ACL admission: GREEN;
- configuration fingerprint:
  `8482aae40f7328749a168a2d64eef4afb67fee218b89425ea5c79d8cbbb52d40`;
- schema fingerprint:
  `89616f198b0c0a47eef264701ebfce23d3aae3f98474cf050584ea9e899d66f1`.

The mounted Buy VOID parent status is also ready while dormant:

- parent runtime enabled;
- full-runtime policy configured;
- signing dependency environment configured;
- history carrier activation ready;
- full runtime, full apply, claimed runtime and admitted guarded runtime all zero.

The remaining risk is **activation ordering**. Setting four independent switches
to `1` without a state machine could temporarily reopen the legacy direct
payment-keyed apply path or create a partially armed money-capable state.

This contract makes that ordering explicit and fail-closed.

## Independent gates

The relevant environment switches are:

```text
VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED
```

The outer parent is already required to remain `1`.

The four inner switches begin at `0`.

## Canonical phases

Only five exact states are recognized.

### 1. dormant

```text
parent=1
claimed=0
full_runtime=0
admitted=0
apply=0
```

This is the observed production state at contract creation.

### 2. claimed_exclusive

```text
parent=1
claimed=1
full_runtime=0
admitted=0
apply=0
```

The claimed selector moves first.

This is deliberate: selecting the claimed dispatcher retires the older direct
full-runtime mutation path through the existing parent/direct-route exclusivity
walls while every execution-capable prerequisite is still disabled.

A claimed command still fails closed before PostgreSQL credential access because
the admitted runtime is disabled.

### 3. full_preview

```text
parent=1
claimed=1
full_runtime=1
admitted=0
apply=0
```

The full runtime becomes available for server-derived read-only preview/status,
but the claimed path still stops at the missing admitted-runtime gate.

Apply remains zero.

### 4. admission_armed

```text
parent=1
claimed=1
full_runtime=1
admitted=1
apply=0
```

The production PostgreSQL child may now satisfy its selector checks, but the
full-runtime apply gate is still zero. The claimed runtime therefore holds at
`full_runtime_apply_disabled` before entering the factory/worker path.

This is the last non-money-capable phase.

### 5. live_apply

```text
parent=1
claimed=1
full_runtime=1
admitted=1
apply=1
```

This is the only modeled money-capable phase.

Reaching it still does **not** make money move automatically. The mounted parent
continues to require:

- loopback-only operator access;
- action exactly `run_payment_keyed_dispatcher_claimed_fulfillment`;
- exact lowercase 64-hex attempt ID;
- `apply=true`;
- exact claimed-runtime confirmation;
- server-owned durable attempt/custody state;
- production policy checks;
- fresh PostgreSQL factory and schema admission;
- server-owned enqueue/claim/lease;
- guarded worker checks; and
- no automatic retry.

This source contract grants none of that per-command authority.

## Adjacent transitions only

Forward activation must be:

```text
dormant
  -> claimed_exclusive
  -> full_preview
  -> admission_armed
  -> live_apply
```

No phase may be skipped.

Each adjacent transition changes exactly one gate.

In particular, a direct dormant -> live_apply transition is forbidden.

## Rollback order

Rollback is the exact reverse sequence:

```text
live_apply
  -> admission_armed
  -> full_preview
  -> claimed_exclusive
  -> dormant
```

The first rollback transition therefore clears:

```text
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0
```

before any selector or runtime is disabled.

This ordering prevents a rollback from accidentally clearing the claimed
selector while the legacy full-runtime apply path remains enabled.

## Invalid states

The state normalizer rejects every state where `apply=1` unless all three
prerequisites are also `1`:

```text
claimed=1
full_runtime=1
admitted=1
```

It also rejects mixed states outside the five canonical phases. For example,
`full_runtime=1` while `claimed=0` is not a recognized activation phase.

The objective is not to prove such a state can never exist in Linux; it is to
ensure the reviewed activation procedure never treats it as acceptable.

## Readiness candidate

The machine-readable candidate is:

`ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json`

It binds:

- reviewed source commit `eef17f65a8bd495d581df3b91d9a411a5402cde8`;
- exact Git blobs for the mounted parent/full-runtime/claimed/admitted source
  slice;
- full-runtime policy fingerprint;
- runtime policy fingerprint;
- preparation policy fingerprint;
- receipt policy fingerprint;
- history-carrier authority identity and generation;
- history-carrier activation readiness;
- PostgreSQL production configuration fingerprint;
- PostgreSQL schema fingerprint; and
- the observed dormant gate state.

The candidate verifier checks the source blobs directly from the worktree with
`git hash-object`.

A green candidate means only:

```text
candidate_verified_activation_not_authorized
```

## What this lane does not produce

This lane intentionally does **not** create:

- a systemd `Environment=...=1` drop-in;
- an installer;
- a daemon-reload command;
- a restart command;
- an automatic rollback command;
- a transaction request;
- a presale/public activation command; or
- activation authorization.

Those remain later operator gates.

The next step after this contract is accepted is a **read-only activation
preflight/plan** that re-observes the same policy and PostgreSQL fingerprints and
proves the exact staged host mutations that would be required. Actual gate
changes remain separately authorized.
