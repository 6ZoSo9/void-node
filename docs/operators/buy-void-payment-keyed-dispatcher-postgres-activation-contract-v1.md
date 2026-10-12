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

The remaining risk is **activation state integrity**. The four inner switches
must never form an unreviewed mixed live-process state, and a non-atomic host
procedure must not briefly expose the legacy direct payment-keyed apply path.

These values are process environment. A running node does not observe a changed
systemd environment until a new process starts. The contract therefore supports
two explicit transition modes:

- adjacent staged transitions for rehearsal and diagnostic qualification; and
- one atomic process-restart transition for production, where all four inner
  gate values come from one reviewed configuration generation.

Any other multi-gate transition remains fail-closed.

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

## Transition modes

### Staged mode

A staged rehearsal or diagnostic transition is adjacent-only:

```text
dormant
  -> claimed_exclusive
  -> full_preview
  -> admission_armed
  -> live_apply
```

Each step changes exactly one gate. If exercised against a real systemd-managed
process, each phase requires a new process start before the process can observe
that phase.

The reverse staged rollback is also adjacent-only:

```text
live_apply
  -> admission_armed
  -> full_preview
  -> claimed_exclusive
  -> dormant
```

Its first step clears
`VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0`, so a staged
rollback cannot clear the claimed selector while apply authority remains live.

### Atomic production restart mode

Production does **not** need four restarts.

The contract permits exactly one multi-gate forward transition:

```text
dormant
  -- atomic process restart / one reviewed config generation -->
live_apply
```

and exactly one multi-gate rollback:

```text
live_apply
  -- atomic process restart / one reviewed all-zero config generation -->
dormant
```

The four changed inner gates are exactly:

```text
claimed_runtime
full_runtime
admitted_guarded_runtime
full_runtime_apply
```

The final live process therefore starts with the claimed selector already on
whenever apply authority is on. There is no process-visible interval in which
`apply=1` and `claimed=0`.

No other atomic jump is accepted. For example, dormant -> admission_armed and
claimed_exclusive -> live_apply are both HOLDs in atomic-restart mode.

For an atomic transition, the contract defines one canonical **logical gate
configuration** material with marker
`VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ATOMIC_CONFIGURATION_V1`.
That material includes the exact parent/runtime environment names and the
target values for the parent plus all four inner gates.

The contract derives:

```text
configuration_sha256 = sha256(canonical logical gate material)
generation_id = voidbvpcg1_<configuration_sha256>
```

Each of the four inner gate records must repeat that exact derived ID and digest.
The contract rejects a missing generation, mixed generation IDs, mixed digests,
wrong target values, **or a self-consistent caller-supplied digest that does not
equal the digest rederived from the canonical gate material**.

This logical SHA deliberately does not claim to hash a future systemd drop-in
file. The later host activation preflight must separately prove that the exact
staged systemd bytes express this same logical gate material, bind their own file
SHA-256, and prove the restart is the single runtime boundary. This source
contract still performs no host mutation.

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

- inherited runtime source to reviewed main commit
  `eef17f65a8bd495d581df3b91d9a411a5402cde8`;
- a squash-safe candidate-source review base at commit
  `c4614c49d79a6111c2590518ea4dda7863b14042` and tree
  `69c505eb451ef0c3ae75963fd651d3cae635c780`;
- exact Git blobs for the mounted parent/full-runtime/claimed/admitted source
  slice and the activation-contract source, with the activation-contract blob
  required to match the clean evaluated `HEAD`;
- full-runtime policy fingerprint;
- runtime policy fingerprint;
- preparation policy fingerprint;
- receipt policy fingerprint;
- history-carrier authority identity and generation;
- history-carrier activation readiness;
- PostgreSQL production configuration fingerprint;
- PostgreSQL schema fingerprint; and
- the observed dormant gate state.

The candidate verifier requires a clean worktree. It verifies the inherited
runtime blobs at the reviewed inherited-source commit and requires that commit
to be an ancestor of the evaluated `HEAD`. For candidate-specific source, it
requires the review-base commit/tree to be an ancestor anchor and verifies the
reviewed activation-contract blob directly through
`git rev-parse HEAD:<path>`.

This split is deliberate and squash-safe: the review base proves where the
candidate-source review began, while the exact clean-HEAD blob proves the source
bytes actually under review. The verifier does not require those changed bytes
to have existed in the pre-change review-base commit, which would make a
squash-merged source change impossible to represent without a future/self-
referential commit identity.

The verifier reports the evaluated repository HEAD/tree as evidence. Mutable
working-tree `git hash-object` output is not provenance authority. A checkout
with copied matching files, dirty source bytes, a non-ancestor review base, or
unreviewed HEAD source bytes therefore cannot claim the candidate provenance.

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
preflight/plan** that re-observes the same policy and PostgreSQL fingerprints,
proves one exact four-gate configuration generation, and proves the atomic
restart/rollback boundary without applying it. Actual gate changes remain
separately authorized.
