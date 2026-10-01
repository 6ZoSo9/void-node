# Buy VOID Precision atomic activation preflight v1

Marker: `VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1`

Status: designated-host **read-only** activation preflight. This lane does not
write or remove a systemd drop-in, reload systemd, stop/start/restart VOID,
change any runtime gate, sign/broadcast a transaction, activate the public
presale/market, or move funds.

It follows the merged source sequence:

- #2189 — production PostgreSQL factory/schema qualification;
- #2196 — claimed PostgreSQL activation state machine;
- #2226 — content-bound atomic configuration generation v2.

## Why this gate exists

The source contract now proves one atomic dormant -> live-apply process
transition can be represented by one canonical logical gate generation:

```text
generation_id = voidbvpcg1_<configuration_sha256>
configuration_sha256 = sha256(canonical logical gate material)
```

That is still not enough to mutate Precision safely.

The designated host may contain:

- an old source checkout;
- a configured-vs-running process gate mismatch;
- host-private systemd drop-ins that override reviewed numbered fragments; or
- stale runtime/PostgreSQL readiness.

Precision has already shown one important example: a host-private late
`~...BUY-VOID-PK-DORMANT-V1.conf` safety overlay. A normal numbered
`96-...=1` drop-in must **not** be assumed to win against such an overlay.

This preflight inventories that reality instead of playing a filename-precedence
race.

## Two-stage execution boundary

The host wrapper deliberately runs in two stages.

### Stage 1 — no credential/database read

It requires:

- host exactly `zoso-Precision-Tower-7810`;
- live repo exactly `/home/zoso/dev/void-node`;
- branch `main`;
- clean worktree;
- exact reviewed main
  `53c451727bdeb38b53381716a46502eaa8c71f90`;
- `void-node-live.service` active/running;
- process cwd exactly the live repo;
- configured and running process gates exactly dormant.

It then reads only the five activation-gate assignments from active systemd
drop-ins.

Only these gate sources are currently reviewed:

| drop-in | SHA-256 | reviewed gate assignments |
| --- | --- | --- |
| `70-buy-void-runtime-integration-v1.conf` | `4b9221fcce60c29b22cbc2c61899f551086dea50b1d12c32d3f3e6505324aca5` | parent = 1 |
| `91-buy-void-payment-keyed-production-dormant-v1.conf` | `d244e9e6a8e2fc14179861676fa7843a7be6cc5e05b3481afd7bf72eb6ef3e9c` | full=0, apply=0 |
| `94-buy-void-claimed-postgres-precision-reconcile-v1.conf` | `2445f07932a367b28c0db7a9743f8467d49c08c18d6ceaf5038bb5aae626a325` | claimed=0, admitted=0 |

Any other drop-in that assigns one of the five gates is:

```text
HOLD_UNRECONCILED_GATE_ASSIGNMENT_SOURCES
```

The wrapper stops there. It does not read PostgreSQL credentials or connect to
PostgreSQL after this HOLD.

This includes old `90...` staging overlays, tilde-prefixed safety overlays,
duplicates, altered hashes, or unsupported assignment syntax.

## Stage 2 — readiness requalification

Stage 2 runs only after Stage 1 is GREEN.

It re-observes:

- the loopback Buy VOID operator status;
- parent enabled;
- all four inner gates still zero;
- full-runtime policy configured;
- signing dependency environment configured;
- exact full/runtime/preparation/receipt policy fingerprints;
- exact history-carrier authority/generation and activation readiness.

It then reuses the merged #2189 Precision PostgreSQL qualifier.

The wrapper itself does not read password/CA contents. The reviewed production
factory does read those credentials internally because a real TLS/password
connection cannot otherwise be qualified. Credential contents are never
printed.

The expected live fingerprints remain:

```text
postgres configuration:
8482aae40f7328749a168a2d64eef4afb67fee218b89425ea5c79d8cbbb52d40

postgres schema:
89616f198b0c0a47eef264701ebfce23d3aae3f98474cf050584ea9e899d66f1
```

Schema admission remains read-only.

## Configured-vs-running gate equality

The wrapper separately reads:

1. the effective configured unit `Environment=` values; and
2. the current process environment from `/proc/<MainPID>/environ`.

Both must equal:

```text
parent_runtime=1
claimed_runtime=0
full_runtime=0
admitted_guarded_runtime=0
full_runtime_apply=0
```

A pending drop-in change that has been daemon-reloaded but not restarted therefore
cannot pass.

## Derived live and rollback generations

Only after every readiness check is GREEN does the preflight call the merged
#2226 contract to derive:

- exact live-apply logical generation;
- exact dormant rollback logical generation;
- exact atomic forward/rollback transition acceptance; and
- exact proposed systemd drop-in bytes and file SHA-256 for both states.

The proposed basename is:

`96-buy-void-payment-keyed-postgres-atomic-activation-v1.conf`

This basename is **not activation authority**. It is usable only after the gate
inventory proves no unreviewed later override exists.

The rendered bytes bind:

- the #2226 generation ID;
- the #2226 configuration SHA-256;
- the parent gate; and
- all four inner gates.

## Staging boundary

A later activation transaction must not install live `=1` bytes into the active
systemd drop-in tree and leave them waiting for a restart. An unrelated
crash/reboot could then start a money-capable process before post-install
verification.

The future mutation lane must therefore prove:

1. live and all-zero rollback bytes are staged **outside** the active drop-in
   tree;
2. both byte hashes and #2226 generation IDs are reviewed before mutation;
3. no unreviewed gate source exists;
4. one separately authorized transaction installs the reviewed live bytes,
   daemon-reloads and crosses one controlled process-restart boundary;
5. the restarted process is requalified before any operator apply command; and
6. rollback bytes are prebuilt so rollback does not need to invent policy during
   an incident.

This preflight implements none of those mutations.

## HOLDs expected on current Precision

Two likely first-run HOLDs are intentional, not failures of the design:

- `live_repo_head_not_reviewed_main` if Precision has not yet been source-aligned
  to the reviewed activation generation; and
- `HOLD_UNRECONCILED_GATE_ASSIGNMENT_SOURCES` if the host-private late dormant
  safety overlay or other legacy gate owners are still present.

Those facts must be reconciled explicitly before activation planning advances.

## Authority

```text
source_mutation=false
dropin_write=false
dropin_remove=false
daemon_reload=false
service_stop=false
service_start=false
service_restart=false
runtime_gate_mutation=false
wallet_or_signer_access=false
transaction_construction=false
transaction_signing=false
transaction_broadcast=false
public_presale_activation=false
market_activation=false
funds_movement=false
```

A GREEN preflight means only:

`ATOMIC_ACTIVATION_PREFLIGHT_GREEN_NOT_AUTHORIZED`

Actual gate mutation remains a later, separately reviewed and explicitly
authorized operation.
