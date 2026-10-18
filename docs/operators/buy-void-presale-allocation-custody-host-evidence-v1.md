# Buy VOID presale allocation-custody host evidence V1

Marker: `VOID_BUY_VOID_PRESALE_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1`.

Status: **read-only host-evidence collector definition; rollback enforcement remains HOLD**.

## Purpose

Implement the allocation-custody storage/rollback lane from the accepted
presale host-evidence collection plan:

`voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab`.

This lane is intentionally truth-preserving. It can bind the current Precision
rollback policy and the reviewed Nimo second-control evidence, but the reviewed
primitives do not prove that every privileged restore/rollback surface is
forced to consult that policy.

A successful collection therefore remains a HOLD for presale release.

## Reviewed primitive bindings

The collector is bound to the exact #3507 primitives:

- rollback-independence classifier:
  `src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_independence_v1.ts`
  at `2d5fc24498b569f20701445d6214a8ca31e4f701`;
- live rollback-policy observer:
  `tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs`
  at `cf40d9d4a19d138d74aee849a6c02f96ee362dbb`;
- reviewed rollback second-control composition:
  `src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_second_control_composition_v1.ts`
  at `97180cc03e3f1b2f9935191ac6aafe4b15307708`.

The parent plan/proof/doc/workflow are pinned independently.

## Fixed Precision storage identity

The current replay roots are fixed by the reviewed live ceremony:

```text
journal root:
/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1

journal:
/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1/live-read-replay-v1.jsonl

high-water root:
/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1

high-water:
/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1/live-read-replay-high-water-v1.json

expected hostname:
zoso-Precision-Tower-7810
```

The reviewed policy observer also binds the root-owned policy file:

`/etc/void/buy-void-allocation-custody-witness-live-read-replay-rollback-controls-v1.json`.

## Future host invocation inputs

The collector accepts exactly three operator-selected **absolute artifact
paths**:

- reviewed live-cycle operator receipt;
- complete reviewed Nimo external-witness journal;
- reviewed rollback-policy receipt.

The current journal/high-water paths are not operator-selectable.

Each supplied/current artifact is opened with
`O_RDONLY|O_NOFOLLOW`, read through a retained descriptor, bounded in size,
and revalidated against its visible file identity before use.

The collector itself does not invoke SSH or any other network transport. The
Nimo evidence it consumes is the already-reviewed witness artifact.

## Collection sequence

A future separately authorized root run:

1. descriptor-reads the reviewed operator receipt;
2. descriptor-reads the current Precision replay journal and high-water;
3. descriptor-reads the reviewed Nimo witness journal;
4. descriptor-reads the reviewed rollback-policy receipt;
5. invokes the canonical live rollback-policy observer over the fixed replay
   roots and current root-owned policy;
6. requires current live policy observation and storage rebinding GREEN;
7. invokes the reviewed second-control composition over the exact five
   artifacts;
8. requires reviewed external custody, transport/storage provenance, same
   Precision storage identity, same replay high-water, and post-cycle policy
   binding;
9. cross-checks the fresh live policy observation against the second-control
   composition.

No subprocess, network, filesystem write, mount/backup/snapshot mutation, or
service mutation is performed by this collector.

## Truthful terminal

A successful host collection returns:

`ALLOCATION_CUSTODY_POLICY_AND_SECOND_CONTROL_EVIDENCE_GREEN_LIVE_ROLLBACK_ENFORCEMENT_REQUIRED`.

It proves:

```text
rollback_independence_policy_qualified=true
live_policy_observation_proven=true
policy_file_installation_proven=true
reviewed_external_custody_qualification_bound=true
external_transport_authenticated=true
external_witness_storage_proven=true
live_remote_read_performed=true
live_remote_append_performed=true
external_second_control_domain_qualified=true
external_second_control_policy_binding_proven=true
post_cycle_live_policy_observation_bound=true
```

It deliberately keeps:

```text
live_policy_enforcement_proven=false
live_rollback_test_performed=false
live_durable_storage_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
runtime_integration=false
production_gate_ready=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
funds_movement=false
production_host_evidence_authority=false
```

A policy plus authenticated second control is not proof that every privileged
restore path is policy-enforced.

## CI boundary

Hosted Node 22/24/26 CI performs only:

- exact four-file scope checks;
- exact parent-plan and three primitive blob checks;
- repository typecheck/build prerequisites;
- adversarial/static proof;
- collector `--self-test`.

CI never runs the real root `--run` path.

## Authority

This source gate grants no host execution authority. A future root host
collection remains separately authorized and read-only.

No payment acceptance, presale/WC activation, wallet/signing, transaction,
treasury/liquidity action, or funds movement is authorized by this lane.

**PROTECT THE CORE.**
