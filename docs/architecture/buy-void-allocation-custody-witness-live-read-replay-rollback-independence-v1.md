# Buy VOID allocation custody witness live-read replay rollback independence v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1`
is a source-only policy qualification contract for the replay journal / replay
high-water storage pair.

It consumes an already-GREEN
`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1`
result and asks a narrower question than production custody:

> If the two physical replay storage domains are later restored, snapshotted,
> backed up, or rolled back, does the supplied control policy prevent one
> ordinary host-wide control path from silently reverting both domains together?

A source-qualified result is **not** proof that those controls are live. It
binds the required policy shape and the exact live storage qualification so a
later operator evidence collector has a deterministic target.

## Parent installation evidence

The classifier requires the exact live installation result to report:

- live storage observation;
- distinct local storage domains;
- distinct parent block devices;
- canonical journal/high-water binding;
- no pending replay-writer intent;
- stable double census; and
- all stronger custody/runtime/transport authority still false.

The installation qualification ID is recomputed from the canonical normalized
installation object. A forged or drifted qualification ID HOLDS.

The rollback policy must rebind both physical disk serials and WWNs from that
installation result. A policy for different storage cannot be reused.

## Rollback policy

The policy is content-addressed and bounded by:

- host ID;
- observation time;
- expiry;
- positive policy generation;
- journal rollback domain; and
- high-water rollback domain.

The policy TTL is at most five minutes. This checks supplied ordering only;
`verification_clock_authority_proven=false` remains authoritative.

## Per-domain controls

Each storage domain binds:

- disk serial;
- disk WWN;
- optional snapshot domain;
- optional backup domain and backup target;
- restore domain;
- rollback-controller identity;
- restore-credential domain;
- host-wide snapshot membership;
- host-wide backup membership;
- automatic-restore policy;
- manual-approval requirement;
- separate-credential requirement; and
- second-control requirement.

Snapshot or backup identifiers must be null when that mechanism is disabled and
must be explicit when enabled.

The high-water domain must require a second restore control.

Automatic restore is forbidden.

## Cross-domain independence policy

Journal and high-water rollback controls must use distinct:

- restore domains;
- rollback controllers; and
- restore credential domains.

If both domains participate in snapshots, the snapshot-domain IDs must differ.

If both domains participate in backups, both backup-domain IDs and backup-target
IDs must differ.

The top-level policy must also state that none of these can revert both roots:

- host-wide snapshot;
- host-wide backup;
- host-wide restore;
- shared rollback controller; or
- coordinated rollback without the required second control.

Any positive joint-rollback path HOLDS.

## What GREEN means

A successful source qualification reports:

```text
rollback_independence_policy_qualified=true
installation_storage_rebound=true
bounded_policy_freshness_checked=true
```

It emits:

- exact installation qualification ID;
- exact replay high-water SHA-256;
- policy generation;
- policy fingerprint; and
- content-addressed qualification ID.

## What GREEN does not mean

Caller-supplied policy is not external trust.

Therefore even a GREEN result reports:

```text
verification_clock_authority_proven=false
policy_generation_monotonicity_proven=false
live_policy_observation_proven=false
live_rollback_test_performed=false
live_durable_storage_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
external_transport_authenticated=false
external_witness_storage_proven=false
live_remote_read_performed=false
runtime_integration=false
production_gate_ready=false
funds_movement=false
```

No filesystem, backup, snapshot, service, replay, witness, wallet, transaction,
activation, or funds mutation occurs in this contract.

## Focused proof

```bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_rollback_independence_v1.ts
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts
git diff --check
```

The focused proof covers:

- exact live installation qualification rebinding;
- key-order-invariant qualification identity;
- forged installation ID rejection;
- physical disk identity drift rejection;
- shared restore-domain rejection;
- shared rollback-controller rejection;
- shared restore-credential-domain rejection;
- shared snapshot-domain rejection;
- shared backup-domain rejection;
- shared backup-target rejection;
- host-wide joint snapshot/backup/restore rejection;
- shared rollback-controller assertion rejection;
- coordinated rollback without second control rejection;
- automatic high-water restore rejection;
- missing high-water second control rejection;
- future/stale/overlong policy-window rejection;
- zero policy-generation rejection;
- accessor/getter evidence rejection without getter execution, including nested
  installation file evidence traversed by the qualification hash; and
- all negative live/runtime/custody/economic authority flags.

## Next gate

After this source policy contract is merged, a designated-host/operator evidence
collector must prove the reviewed backup/snapshot/restore controls are actually
in force and bind them to the installed replay roots.

Only that later live evidence may consider promoting
`rollback_resistance_proven` or
`protected_high_water_custody_proven`.

The authenticated Nimo read should not be composed into a durable replay
generation until that rollback boundary is qualified.
