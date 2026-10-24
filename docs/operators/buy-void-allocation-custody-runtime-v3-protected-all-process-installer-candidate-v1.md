# Buy VOID custody V3 protected all-process installer candidate V1

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_CANDIDATE_V1`.

Status: **source/CI installer candidate only; no protected install authority**.

This successor follows the exact green install-plan head
`47a6f1ae0b6f0cebbfa7d6b859436d1e5858eb97`.

It implements the create-only publication algorithm required by that plan, but
the command-line interface deliberately exposes only:

```text
--source-plan
--self-test
```

There is no production `--apply` entry point.

A later separately reviewed protected first-entry mechanism must authenticate
this installer candidate itself before the mutation routine may ever be invoked
against `/opt`.

## Exact inputs

Install plan:

- repository path:
  `ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_install_plan_v1.py`;
- Git blob:
  `d0d500d5a4715c9319e702350a8851884b4baff8`;
- exact plan head:
  `47a6f1ae0b6f0cebbfa7d6b859436d1e5858eb97`.

Accepted source lock:

- Git blob:
  `5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1`.

Accepted protected census source:

- repository path:
  `ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py`;
- Git blob:
  `33a7221cad37aec70474b97b26c2b10e2ef60f66`;
- bytes: `74322`;
- SHA-256:
  `d5b91c7efa048eb40601d162185563a29916f1ff22a23638c7da5f330b92beba`.

## Fixed destination

```text
/opt/void-buy-allocation-custody-procref-v1/
  void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
```

Fixed stage:

```text
/opt/.void-buy-allocation-custody-procref-v1.stage-v1
```

Final modes:

```text
protected root: 0555
source leaf:    0444
```

## Implemented create-only algorithm

The internal mutation algorithm implements:

1. direct physical parent admission;
2. optional root-owned/non-group/world-writable parent enforcement;
3. destination-root absence;
4. stage-root absence;
5. mode-0700 private stage creation;
6. same-filesystem stage verification;
7. one create-only `O_CREAT|O_EXCL|O_NOFOLLOW` source leaf;
8. complete source write;
9. source fsync;
10. final source mode `0444`;
11. exact descriptor-bound source byte verification;
12. stage mode `0555`;
13. stage-directory fsync;
14. visible stage generation revalidation;
15. one `renameat2(RENAME_NOREPLACE)` publication;
16. parent fsync;
17. exact final root/source verification.

The final root is required to contain exactly one entry: the accepted source.

## Pre-publication failure behavior

Before publication, a failure may clean up only the exact stage generation
created by that invocation.

Cleanup requires:

- the stage dev/inode to be captured immediately after `mkdir`, before the
  stage is reopened for population;
- the visible stage dev/inode still match that retained generation;
- no unexpected stage entries;
- only the known source leaf may be removed;
- the sealed stage is first restored to private mode `0700`;
- the final destination is never touched.

A cleanup exception or a cleanup result of false becomes its own explicit HOLD;
the original pre-publication error is never allowed to masquerade as a clean
cleanup.

The self-test forces the rename step to fail after the stage has been sealed and
requires both stage and destination to be absent afterward. The independent
proof additionally injects a cleanup refusal and requires
`prepublication_failure_stage_cleanup_incomplete`.

## Post-publication failure behavior

After `renameat2(RENAME_NOREPLACE)` succeeds, the installer must never report
a false no-mutation result and must never delete the final root automatically.

A parent-fsync or final-verification failure raises a bounded
`PublishedInstallError` with:

- publication=true;
- parent-fsync completion state;
- final-verification completion state;
- original failure class and bounded reason.

The self-test injects a parent-fsync failure after publication and requires the
final root to remain present for inspection.

## Descriptor lifetime

Final root verification uses one retained directory descriptor and closes it in
a `finally` block on every success/failure path. The source proof requires
that deterministic close structure.

## Protected first-entry boundary

The mutation routine exists as reviewed source, but this file is **not** a
trusted privileged first instruction when read from a mutable checkout.

Therefore:

```text
direct_apply_cli=false
protected_first_entry_required=true
protected_installer_first_entry_installed=false
protected_installer_first_entry_verified=false
protected_install_authorized=false
```

The next gate must accept the exact installer source identity and define a
protected first-entry mechanism. Only after that separate gate could a future
operator authorization consider invoking the create-only mutation routine.

## Hosted CI

Hosted CI may run only:

- compile;
- `--self-test`;
- source proof;
- inert `--source-plan`;
- an invalid `--apply` invocation that must be rejected by argparse;
- diff hygiene.

The self-test mutates only disposable temporary directories owned by the CI
user. It never writes `/opt`.

## Authority boundary

Still false:

```text
protected_installer_first_entry_installed=false
protected_installer_first_entry_verified=false
protected_install_authorized=false
protected_source_installed=false
live_privileged_census_authorized=false
live_privileged_census_executed=false
service_mutation=false
systemd_mutation=false
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

**PROTECT THE CORE.**
