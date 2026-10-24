# Buy VOID custody V3 protected all-process installer candidate V2

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_CANDIDATE_V2`.

Status: **source/CI installer candidate only; no protected install authority**.

This is a successor to the **accepted V1 installer source**, not a rewrite of
that historical evidence. It additionally binds the exact accepted V1 installer
lock:

- lock path:
  `ops/security/buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v1.json`;
- lock Git blob:
  `a1e1f4887787b408d313e73360966f93a63b2b58`;
- accepted V1 installer head:
  `395249d8eab96adbdf5b15c6654326bd827aa1a0`;
- accepted V1 source Git blob:
  `9dd33f38fe4c89a5d2beacbc535380346eaea83b`.

V1 remains accepted historical source evidence. V2 changes only the publication
authority needed by the future static first-entry runtime.

This successor follows the exact green install-plan head
`06395abde20620b99808f62fe0d90a3f2e05528e`.

It implements the create-only publication algorithm required by that plan, but
the command-line interface deliberately exposes only:

```text
--source-plan
--self-test
```

There is no production `--apply` entry point.

A later separately reviewed protected first-entry mechanism must authenticate
this installer candidate itself before the fixed mutation entrypoint may ever be
invoked against `/opt`.

The parameterized mutation engine is private/test-only. Its success receipt
always says `protected_source_installed=false`, even when a disposable fixture
was successfully published. It cannot mint protected-install authority for
caller-selected bytes or paths. Its recovery contract also requires
`stage_generation_unknown_hold_required=true` and
`retry_after_unknown_stage_requires_operator_inspection=true`.

Only the zero-argument least-authority entrypoint

`install_accepted_source_create_only_after_protected_first_entry()`

may emit `protected_source_installed=true`. It internally requires root
UID/GID identity, loads the exact accepted repository source itself, rechecks
its bytes/SHA-256/Git-blob identity, and invokes the private engine with only
the fixed `INSTALL_PARENT`, `INSTALL_NAME`, `STAGE_NAME`, `SOURCE_NAME`,
UID/GID 0 and root-parent enforcement.

## Exact inputs

Install plan:

- repository path:
  `ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_install_plan_v1.py`;
- Git blob:
  `0fef4e6f76738dd474ea775985b1facdd922bb54`;
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
15. one the built-in `_voidfs.rename_noreplace` operation publication;
16. parent fsync;
17. exact final root/source verification.

The final root is required to contain exactly one entry: the accepted source.

All retained read-only repository/source leaves use
`O_RDONLY|O_NOFOLLOW|O_NONBLOCK` before their existing regular-file,
single-link, size and generation checks. The standalone proof swaps a regular
fixture to a real FIFO at the production leaf-open boundary, verifies
`O_NOFOLLOW|O_NONBLOCK` before creating the FIFO, and requires the opened
descriptor to fail closed as a rebound/non-regular generation rather than
blocking for a writer.

## Pre-publication failure behavior

Before publication, a failure may clean up only the exact stage generation
created by that invocation.

Cleanup requires:

- after `mkdir`, the **first successful** no-follow identity read binds the
  stage dev/inode before the stage is reopened for population;
- the visible stage dev/inode still match that retained generation;
- no unexpected stage entries;
- only the known source leaf may be removed;
- the sealed stage is first restored to private mode `0700`;
- the final destination is never touched.

If `mkdir` succeeds but that first identity read fails, the installer does
**not** guess that cleanup is safe. It raises a dedicated
`StageGenerationUnknownError` with:

```text
stage_creation_succeeded=true
stage_identity_bound=false
possible_residual_stage=true
retry_requires_operator_inspection=true
```

That state preserves the possibly residual stage for inspection and forbids an
ordinary blind retry. It cannot masquerade as a clean prepublication failure.

Once a stage generation is bound, a cleanup exception or cleanup result of
false becomes its own explicit HOLD; the original pre-publication error is
never allowed to masquerade as a clean cleanup.

The self-test and independent proof inject failure into the first post-`mkdir`
identity read and require the dedicated unknown-generation HOLD with the stage
left present. Separate adversaries force rename failure and cleanup refusal;
the normal bound-generation cleanup path must remove only the exact stage
generation and never touch the final destination.

## Post-publication failure behavior

After the built-in `_voidfs.rename_noreplace` operation succeeds, the installer must never report
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

## Built-in publication bridge

V2 removes the V1 dynamic-symbol publication path entirely. Production
publication requires `_voidfs` to be present in `sys.builtin_module_names`,
import with `__spec__.origin == "built-in"`, and expose exactly one public
operation:

```text
rename_noreplace
```

The installer passes the same retained parent directory descriptor plus the
distinct stage/final leaf names to that operation. `_voidfs` is responsible for
the already-reviewed Linux `RENAME_NOREPLACE` semantics and kernel `EEXIST`
preservation.

The V2 source contains no executable `ctypes`, `CDLL`, `renameat2`, `dlopen`,
`dlsym`, or host-libc symbol lookup path. There is no fallback to ordinary
rename in the protected fixed entrypoint.

Hosted CI does **not** pretend ordinary GitHub Python contains `_voidfs`.
Disposable self-tests inject an explicit fixture rename function into the
parameterized internal helper. The production fixed entrypoint keeps the
built-in `_voidfs` bridge as its default and cannot accept a caller-supplied
publication primitive.

## Protected first-entry boundary

The mutation routine exists as reviewed source, but this file is **not** a
trusted privileged first instruction when read from a mutable checkout.

Therefore:

```text
direct_apply_cli=false
protected_first_entry_required=true
parameterized_internal_receipt_never_claims_protected_install=true
protected_installer_first_entry_installed=false
protected_installer_first_entry_verified=false
protected_install_authorized=false
```

The focused proof additionally requires:
- the fixed entrypoint to pass exactly the accepted source and fixed destination
  constants to the private engine;
- a wrong payload through the private engine to keep
  `protected_source_installed=false`;
- a neighboring destination through the private engine to keep
  `protected_source_installed=false`.

The next gate must accept the exact installer source identity and define a
protected first-entry mechanism. Only after that separate gate could a future
operator authorization consider invoking the fixed create-only mutation
entrypoint.

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
