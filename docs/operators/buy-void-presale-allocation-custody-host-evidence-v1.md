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
- canonical live installation/storage observer:
  `tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs`
  at `c0c86bc1687fc9a3cb9313b5a68029c35c6a9a63`;
- reviewed rollback second-control composition:
  `src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_second_control_composition_v1.ts`
  at `97180cc03e3f1b2f9935191ac6aafe4b15307708`.

## Durability / rollback contract

The collector also binds #3513's machine-readable challenge contract:

- contract blob `eef7c4e1db7401ba82fda96aa1e8da40c1981b7d`;
- proof blob `7ced5fb56a22cd546aab30c466021b01b1c6a84d`;
- operator doc blob `16a8a755888abd7b9ad4f0377468d6a403f80a70`;
- workflow blob `b3426f40577ff1ca1bbab8ca46232ae1ca0a8148`.

That contract explicitly requires
`reviewed_source_generation_binding_required=true` in addition to current
rollback-policy binding. Read-only evidence cannot satisfy the future
durability/rollback challenge by itself.

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
5. invokes the canonical installation/storage observer and requires its
   read-only storage classification GREEN;
6. requires the collector's retained journal/high-water reads to match that
   observer's exact path/dev/ino/hash/bytes/uid/gid/mode/nlink generation;
7. invokes the canonical live rollback-policy observer over the fixed replay
   roots and current root-owned policy;
8. requires current live policy observation and storage rebinding GREEN;
9. invokes the installation/storage observer again and requires the same
   qualification ID and high-water generation;
10. invokes the reviewed second-control composition over the exact five
   artifacts;
11. requires reviewed external custody, transport/storage provenance, same
   Precision storage identity, same replay high-water, and post-cycle policy
   binding;
12. submits the prerequisite booleans to #3513's challenge contract.

The collector itself contains no direct child-process API, but the canonical
installation/storage observer transitively executes root-custodied
`/usr/bin/stat` and `/usr/bin/lsblk` for read-only block-device identity
observation. A successful host receipt therefore reports
`process_execution_performed=true`,
`process_execution_read_only_contract=true`, and
`transitive_storage_identity_helper_execution_required=true`.

No network, filesystem write, mount/backup/snapshot mutation, or service
mutation is performed. On a HOLD path, process execution is reported
`unknown` because a read-only identity helper may already have run.

## Truthful terminal

A successful host collection returns:

`ALLOCATION_CUSTODY_PREREQUISITES_GREEN_CONTROLLED_CHALLENGE_REQUIRED`.

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
source_contract_ready=true
reviewed_prerequisites_bound=true
read_only_collection_sufficient=false
controlled_live_challenge_required=true
reviewed_source_generation_binding_required=true
```

The next action remains exactly:

`SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1`.

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

The hosted proof additionally pins canonical installation-observer blob
`c0c86bc1687fc9a3cb9313b5a68029c35c6a9a63`, rejects storage-file generation
mismatches, and verifies the collector has no direct process-launch API even
though a future host run truthfully includes the observer's bounded read-only
`stat`/`lsblk` helpers.

## Authority

This source gate grants no host execution authority. A future root host
collection remains separately authorized and read-only.

No payment acceptance, presale/WC activation, wallet/signing, transaction,
treasury/liquidity action, or funds movement is authorized by this lane.

**PROTECT THE CORE.**

## Closed normalized receipt interface

The rollback-policy and second-control receipts are validated at their
machine-readable normalized boundary before any cross-receipt comparison.
The collector requires exact normalized key sets, exact schema/marker/version
identities, formatted qualification IDs and SHA-256 fields, bounded policy
generation/time values, and the designated Precision source hostname.

Cross-receipt binding is direct after validation: high-water SHA-256, source
hostname, policy qualification ID, policy fingerprint, and policy generation
must agree. Missing, null, wrong-type, extra-key, one-sided omission, and
cross-receipt mismatch fixtures fail closed.

This changes no host authority. The future host run remains read-only collection
with truthfully reported transitive `stat`/`lsblk` helper execution and still
terminates at the separately authorized controlled-challenge boundary.

## HOLD diagnostic integrity

The root collector emits a bounded, single-line `reason=` token on CLI failures. Only
safe, fixed lowercase ASCII failure codes are retained; arbitrary filesystem or
operator-supplied path diagnostics are redacted to
`allocation_custody_diagnostic_redacted`. The focused proof exercises a missing
synthetic path with embedded newline-delimited positive status/authority markers,
checks that no such line survives formatting, and checks that normal explicit
collector HOLD codes remain usable. The proof additionally launches the actual
collector CLI in a bounded, ordinary-user child with a test-only JavaScript
geteuid() override. A synthetic missing first receipt path containing LF-delimited
positive markers must produce exit 2, one HOLD marker, exactly one redacted
reason line and only negative economic/host authority lines. The physical UID and
Linux privileges are unchanged; the nonexistent path fails before any fixed
journal, high-water, witness or policy observer is reached. This hardens log
parsing only and grants no host collector, storage challenge, presale, payment
or funds authority.

## Nonblocking retained-file observation

The unprivileged source proof now exercises the production read-only artifact
observer with a deterministic regular-file-to-FIFO replacement between
`lstat` and `open`. The collector opens with
`O_RDONLY|O_NOFOLLOW|O_NONBLOCK` so FIFO substitution never blocks before
file-type and descriptor-generation validation. The test intercepts the
actual `openSync` flags before opening the FIFO and fails immediately if
`O_NONBLOCK` regresses. It uses only disposable test files and does not
invoke a live host observer, root collection, payment or custody challenge.
