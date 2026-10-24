# Buy VOID custody V3 protected all-process source install plan V1

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALL_PLAN_V1`.

Status: **source/test/CI install planning only; no protected install authority**.

This successor consumes the exact accepted source lock from Draft #3795 and
defines the smallest create-only installation contract needed before the
protected all-process census source may ever be placed under `/opt`.

It does not install anything and has no `--apply` mode.

## Exact accepted input

Required source lock:

- path:
  `ops/security/buy-void-allocation-custody-runtime-v3-protected-all-process-reference-census-lock-v6.json`;
- Git blob:
  `5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1`;
- lock ID:
  `voidbuycustodyallprocreflock6_33a7221cad37aec70474b97b26c2b10e2ef60f66`;
- parent protected source head:
  `9bec0035b4085af82f51ec0e481d49c94ceb84b4`.

Accepted protected census source:

- repository path:
  `ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py`;
- Git blob:
  `33a7221cad37aec70474b97b26c2b10e2ef60f66`;
- bytes: `74322`;
- SHA-256:
  `d5b91c7efa048eb40601d162185563a29916f1ff22a23638c7da5f330b92beba`.

The input lock must still state:

```text
candidate_source_accepted=true
protected_install_authorized=false
protected_source_installed=false
live_privileged_census_authorized=false
live_privileged_census_executed=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

## Fixed protected destination

The accepted source contract already selects:

```text
install root:
/opt/void-buy-allocation-custody-procref-v1

source:
/opt/void-buy-allocation-custody-procref-v1/
  void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
```

The plan selects an exact final custody shape for later review:

```text
root owner/group: 0/0
root mode:        0555
source owner/group: 0/0
source mode:        0444
source links:       exactly 1
```

These values are planning data. They are not evidence that the path exists.
The plan has therefore **selected** the exact future target
(`install_target_selected=true`) while keeping installation and execution
authority false.

## Create-only publication contract

A future separately reviewed installer must satisfy all of the following:

1. The final protected root must be absent before the ceremony.
2. The fixed staging sibling
   `/opt/.void-buy-allocation-custody-procref-v1.stage-v1`
   must also be absent.
3. Staging must be private, root-owned and on the same filesystem as `/opt`.
4. The exact accepted 74,322 source bytes must be written and verified before
   publication.
5. The staged source must match the accepted SHA-256 before publication.
6. The source file must be durable before publication.
7. The staging directory must be durable before publication.
8. Publication must be kernel no-replace/create-only; an existing destination
   must never be overwritten, renamed aside or recursively deleted.
9. The final source must be reverified byte-for-byte/content-addressed after
   publication.
10. The final source and complete protected ancestry must be root-owned and
    non-group/world-writable, with the exact selected modes and one source link.
11. The `/opt` parent must be made durable after publication.
12. Any later execution must still use isolated safe-path Python with bytecode
    writes disabled.
13. Host namespace lease provenance and live-at-use process-reference
    revalidation remain separate later gates.

The plan intentionally does not select an existing-target replacement or
rollback ceremony because the protected destination is create-only and must be
absent.

## Why this is not an installer

The planner performs only bounded descriptor reads of the accepted repository
lock and emits canonical JSON to stdout.

It contains no:

- `sudo`;
- subprocess execution;
- mkdir/create/write/chmod/chown/link/symlink/rename/unlink primitives;
- systemd or service calls;
- archive extraction;
- credential, wallet, signer or private-key access;
- RPC, transaction, payment, presale or funds action.

The planner itself refuses UID 0 so a mutable checkout cannot be mistaken for
the privileged installer.

The next gate is explicitly:

`REVIEW_CREATE_ONLY_PROTECTED_SOURCE_INSTALLER_CANDIDATE`.

That later candidate must be independently reviewed before any root-owned host
write is considered.

## Proof source-generation binding

The standalone proof authenticates the install-plan source through one retained
descriptor generation rather than a hash-then-reopen pathname sequence. It:

- opens the plan source with `O_RDONLY|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC`;
- requires a bounded regular file and stable before/open/after generation;
- reads the exact opened byte length plus EOF and computes the Git blob from
  those retained bytes;
- compiles and executes those exact verified bytes in memory without reopening
  the source pathname.

Disposable regressions require a symlink source to fail, a FIFO source to fail
without blocking, and a pathname replacement after the verified read to keep
executing the original retained bytes. These proof-fixture checks do not grant
host installation or execution authority.

## Invocation

Source-plan and self-test execution require isolated no-bytecode Python:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_install_plan_v1.py \
  --plan
```

There is deliberately no `--apply`.

## Read-effect labeling

The plan is logically read-only but does not claim kernel-level write freedom:
ordinary file reads can update atime depending on mount policy.

```text
production_plan_read_only=true
production_plan_explicit_filesystem_write=false
production_plan_filesystem_write_free=false
production_plan_atime_write_possible=true
```

## Authority boundary

```text
source_plan_only=true
protected_install_authorized=false
protected_source_installed=false
live_privileged_census_authorized=false
live_privileged_census_executed=false
service_mutation=false
systemd_mutation=false
install_target_selected=true
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

A source lock and an install plan are not installation evidence.

**PROTECT THE CORE.**
