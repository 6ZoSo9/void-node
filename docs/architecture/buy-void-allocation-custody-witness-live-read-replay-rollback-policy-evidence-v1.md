# Buy VOID allocation custody witness live-read replay rollback policy evidence v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1`
is a designated-host, read-only collector for the replay rollback-control policy.

It composes two already-defined authorities:

1. live replay storage installation evidence; and
2. the source-only rollback-independence policy classifier.

The collector answers a narrow operational question:

> Is the reviewed rollback-control configuration installed as a fixed,
> root-owned read-only policy on the designated host, and does that policy
> still qualify against a fresh observation of the exact replay storage roots?

It does not perform a rollback, snapshot, backup, restore, replay mutation,
witness mutation, service mutation, wallet/signing action, transaction,
activation, inventory action, treasury/liquidity action or funds movement.

## Fixed policy path

Production observation reads exactly:

```text
/etc/void/buy-void-allocation-custody-witness-live-read-replay-rollback-controls-v1.json
```

The caller cannot select another policy path.

The policy file must be:

- a direct regular file;
- root-owned `root:root`;
- mode `0444`;
- single-link;
- below a root-owned, group/world-nonwritable parent chain;
- opened descriptor-relative with `O_NOFOLLOW`; and
- canonical JSON with one trailing newline.

The policy bytes are reread after the live storage reobservation and must retain
the same file identity, SHA-256 and exact canonical content.

After the terminal storage census, the collector re-reads the local clock and
requires the observation to still be inside the exact parent-policy expiry
window. A clock regression below the original observation time or a terminal
time after expiry HOLDS instead of returning stale `LIVE_ROLLBACK_POLICY_OBSERVED`
evidence. Verification-clock authority remains false; this check only prevents
the collector itself from outliving the bounded policy lease it just derived.

## Stable control configuration

The installed file contains stable control declarations only:

- designated host ID;
- positive policy generation;
- bounded policy TTL;
- journal rollback controls;
- high-water rollback controls; and
- the top-level host-wide/joint rollback prohibitions.

It does not contain transient observation or expiry timestamps.

At collection time the tool creates the exact #2546 policy packet by injecting:

- the current observation time;
- an expiry bounded by the installed TTL; and
- the exact current journal/high-water disk serial and WWN values from the live
  replay installation evidence.

The constructed packet is then passed to the canonical
`classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackIndependenceV1(...)`
classifier. The collector does not implement a competing rollback-policy
interpretation.

## Live storage rebound

The collector runs the live replay installation evidence before policy
classification, again after classification, and a third time after the final
policy-file reread.

All three observations must commit to the same:

- installation qualification ID;
- normalized root/file identities;
- distinct storage-domain proof;
- distinct parent block-device proof;
- canonical journal/high-water binding;
- absence of writer publication intent; and
- stable double census.

A storage mutation, root replacement, file mutation or pending replay-writer
intent therefore HOLDs the policy observation. The terminal third observation
closes the same-UID replay-storage race after the final root-owned policy read
and before success is returned.

## What live GREEN proves

A live success reports:

```text
root_owned_policy_file_observed=true
rollback_independence_policy_qualified=true
installation_storage_rebound=true
bounded_policy_freshness_checked=true
policy_file_installation_proven=true
live_policy_observation_proven=true
```

The receipt binds:

- fixed policy path;
- exact policy-file SHA-256 and metadata;
- live replay installation qualification ID;
- canonical replay high-water SHA-256;
- parent #2546 rollback-policy qualification ID;
- policy fingerprint;
- policy generation;
- designated host ID; and
- observation time used for the source classifier.

The receipt itself is content-addressed.

## What live GREEN does not prove

The installed control file is an operator policy boundary, not proof that every
backup product, hypervisor, firmware controller, administrator, credential
store or external restore path obeys it.

Therefore even a live GREEN result keeps all of these false:

```text
verification_clock_authority_proven=false
policy_generation_monotonicity_proven=false
live_policy_enforcement_proven=false
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

This avoids converting a root-owned declaration into fictitious custody
authority.

## Control shape

The installed file has this form:

```json
{
  "schema": "void_buy_void_allocation_custody_witness_live_read_replay_rollback_control_v1",
  "marker": "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_CONTROL_V1",
  "version": 1,
  "host_id": "zoso-Precision-Tower-7810",
  "policy_generation": "1",
  "policy_ttl_ms": 60000,
  "journal": {
    "role": "journal",
    "snapshot_enabled": false,
    "snapshot_domain_id": null,
    "backup_enabled": false,
    "backup_domain_id": null,
    "backup_target_id": null,
    "restore_domain_id": "void.replay.journal.restore.v1",
    "rollback_controller_id": "void.replay.journal.rollback.controller.v1",
    "restore_credential_domain_id": "void.replay.journal.restore.credentials.v1",
    "hostwide_snapshot_member": false,
    "hostwide_backup_member": false,
    "automatic_restore_allowed": false,
    "restore_requires_manual_approval": true,
    "restore_requires_separate_credential": true,
    "restore_second_control_required": false
  },
  "high_water": {
    "role": "high_water",
    "snapshot_enabled": false,
    "snapshot_domain_id": null,
    "backup_enabled": false,
    "backup_domain_id": null,
    "backup_target_id": null,
    "restore_domain_id": "void.replay.high-water.restore.v1",
    "rollback_controller_id": "void.replay.high-water.rollback.controller.v1",
    "restore_credential_domain_id": "void.replay.high-water.restore.credentials.v1",
    "hostwide_snapshot_member": false,
    "hostwide_backup_member": false,
    "automatic_restore_allowed": false,
    "restore_requires_manual_approval": true,
    "restore_requires_separate_credential": true,
    "restore_second_control_required": true
  },
  "hostwide_snapshot_can_revert_both": false,
  "hostwide_backup_can_revert_both": false,
  "hostwide_restore_can_revert_both": false,
  "shared_rollback_controller": false,
  "coordinated_rollback_without_second_control": false
}
```

The example deliberately disables snapshot and backup automation. That is a
policy declaration only; the later enforcement/rollback-test lane must prove
the actual host and external control surfaces match it.

## Focused proof

```bash
npm run typecheck
npm run build
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_evidence_v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_rollback_independence_v1.ts
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1.mjs
git diff --check
```

The proof covers:

- exact fixed policy path;
- root/group/mode/link metadata rejection;
- policy-file digest mismatch rejection;
- canonical JSON requirement;
- designated-host mismatch rejection;
- overlong policy TTL rejection;
- missing high-water second-control rejection;
- shared rollback-controller rejection;
- shared restore-credential rejection;
- forged live storage identity rejection;
- synthetic evidence cannot claim live observation;
- terminal observation-time equality is accepted;
- clock regression and terminal observation after expiry are rejected; and
- all negative enforcement/custody/runtime/economic authority flags.

## Next gate

After this source collector is merged, the operator lane may install the exact
root-owned policy file on Precision and run one read-only live observation.

That observation still does not authorize the durable replay/Nimo composition.
The next stronger gate must prove enforcement and/or an actual bounded rollback
exercise before `rollback_resistance_proven` or
`protected_high_water_custody_proven` can change.

No live mutation is authorized by this document.
