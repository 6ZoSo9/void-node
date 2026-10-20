# Buy VOID Epoch-2 V6R3 Python runtime closure contract V1

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_PYTHON_RUNTIME_CLOSURE_CONTRACT_V1`.

Status: **source contract only**. It does not perform or authorize a Precision census,
installation, or host plan.

Contract ID:

```text
voidbuye2v6r3pyruntimecontract1_cdb98f511f04a3c798200e304481ec14d94373fdbdf6ec30cf88b0e281b0eb4f
```

## Why this gate exists

#3574 accepts the exact static native first-entry ELF, but that launcher intentionally
enters a host Python ELF after the permanent UID/GID 1000 drop. The Python executable is
sealed before `fexecve()`, but a dynamically linked Python still depends on the host
ELF interpreter, DSOs, Python import roots, stdlib files, extension modules, and their
native dependencies.

A Python binary hash alone is therefore not a complete execution identity.

The planner also executes retained `/usr/bin/git` under UID/GID 1000 to establish
source/tree/ancestry evidence. Git is therefore a second dynamic execution closure and
cannot be left outside the production host gate.

## Bound upstream identity

```text
first_entry_lock_blob=66bf48fd6477e0335b1eea6e2b7e8a7f297f8c57
first_entry_lock_id=voidbuye2v6r3planfirstentrybinlock1_f6b452bb75542809454a0b68bae2f0049a4f2af6329e0b13075de1491bbbbc61
first_entry_binary_sha256=986e860593a1aaef34dc6d1ffbd44f626a2bed9512d96be79f1fbcfdc176f2cd
first_entry_binary_bytes=813064

planner_git_blob=19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff
planner_sha256=95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627
planner_bytes=49025
python_flags=-I -B -S
```

The planner's exact top-level standard-library import set is:
`argparse, hashlib, json, os, pathlib, re, stat, subprocess, typing`.
Repository-local Python imports are forbidden.
The compile-time directive is also exact: one unaliased `from __future__ import annotations`
and no other future feature.

## Required host census closure

A later separately reviewed read-only census must bind all of these:

- canonical `/usr/bin/python3` target, byte identity, custody, and effective
  UID-1000 nonwritability;
- Python ELF `PT_INTERP` and exact dynamic-loader identity/custody;
- absence of `/etc/ld.so.preload`;
- `/etc/ld.so.cache` identity when present;
- the complete transitive `DT_NEEDED` resolution for Python **and every ELF file**
  reachable under the Python import roots, with no unresolved or ambiguous dependency;
- every RPATH/RUNPATH record that can affect resolution;
- the exact ordered `sys.path` observed under `-I -B -S`, with no empty/current
  directory entry and user/site injection disabled;
- prefix/implementation/cache-tag/SOABI facts;
- a complete recursive inventory of every existing import root, including regular-file
  SHA-256/metadata, symlink text plus resolved target identity, directory custody, zip
  import roots, and rejection of special files;
- every nonexistent `sys.path` entry as an explicit absence claim plus custody of the
  nearest existing parent, so a later-created path cannot silently become import authority;
- an exact isolated import-probe file-access and mapped-ELF closure for the planner's
  reviewed imports, including native `dlopen` plugins and configuration files not visible
  in static `DT_NEEDED` metadata; every observed runtime file must be in the manifest;
- root-owned/non-writable ancestry and effective runtime-UID nonwritability for all
  execution-authority paths.
- exact `/usr/bin/git` realpath/digest/size, PT_INTERP, transitive DSOs, RPATH/RUNPATH,
  helpers/plugins/config file accesses, mapped ELFs, and terminal generation revalidation;
- Git local/worktree config, object alternates, shallow boundary and graft metadata as
  exact identities or explicit absence claims under the planner's clean Git environment;
- a negative dependency/helper substitution fixture that must HOLD rather than emit
  forged READY/GREEN source evidence.

The census must be bounded (100,000 entries, 512 MiB per regular file, 16 MiB canonical
report) and must remain **unaccepted source evidence** until a separate content-addressed
lock reviews the exact host report.

## Loader and Python environment

## Bound post-exec dumpability diagnostic

The contract now binds the exact source-only diagnostic that established the reset:

```text
diagnostic_pr=3579
diagnostic_head=bc59170b211c3bd2490446b0e1cd045b5d9d5925
diagnostic_script_blob=a946e81549fe12f61b61d17cad76a7eda40501ff
diagnostic_workflow_blob=e27aa4a81fbfe4ae122db5fa5cf906fbe1848e28
diagnostic_run=39360364319
diagnostic_job=118424883505
native_source_blob=ae26706a117025893496901d4bde8cee87cadfba
pre_fexecve_dumpable=0
post_fexecve_dumpable=1
```

This evidence tuple is content-addressed into the contract. The verifier rejects changes
to the diagnostic commit/blob identities, hosted run/job, conclusion, native source,
observed values, or proof marker. It remains source evidence only; it does not accept
post-exec dumpability.

The bound launcher executes Python under numeric UID/GID 1000, empty supplementary
groups, `no_new_privs`, a **pre-exec-only** `PR_SET_DUMPABLE=0`, isolated
`-I -B -S`, clean stdin, and a newly constructed environment. The native
pre-exec attribute alone does **not** establish nondumpable Python after
`fexecve()`. Ambient loader/Python controls such as
`LD_PRELOAD`, `LD_LIBRARY_PATH`, `LD_AUDIT`, `GLIBC_TUNABLES`, `PYTHONPATH`,
`PYTHONHOME`, and `PYTHONSTARTUP` are not accepted as authority.

## Post-exec dumpability trust boundary — explicit HOLD

The static native first entry disables dumpability **before** `fexecve()`
of a sealed-memory Python executable. Linux `execve(2)` normally resets the
new ordinary executable's dumpability to `1`. A protected runtime process
must therefore **not** inherit `dumpable=false` as an accepted fact from
the native pre-exec proof marker.

[PR #3579](https://github.com/6ZoSo9/void-node/pull/3579) provides an
isolated unprivileged **actual sealed-memfd `fexecve`** fixture:
`pre_fexecve_dumpable=0` → `post_fexecve_dumpable=1`, focused hosted
run `39360364319` / job `118424883505` SUCCESS. It does not run any
VOID production binary or qualify Precision's process isolation.
See [Linux execve(2)](https://man7.org/linux/man-pages/man2/execve.2.html).

The revised source contract states:
```text
pre_exec_dumpability_zero_required=true
ordinary_sealed_python_fexecve_reset_observed_in_fixture=true
post_exec_dumpability_verified=false
post_exec_dumpability_accepted=false
post_exec_pr_get_dumpable_observation_required=true
post_exec_ptrace_procfs_policy_evidence_required=true
python_loader_startup_exposure_must_be_reviewed=true
post_exec_dumpability_protection_or_isolation_gate_required=true
```

Any future host census must report the **actual post-exec** `PR_GET_DUMPABLE`
result and relevant ptrace/procfs policy, or separately validate another
independently reviewed process-isolation mechanism and account for the
interpreter/loader initialization interval. Do not reclassify a pre-exec
zero as an observed child-process zero. This correction changes no
runtime code, grants no host census authority, and does not imply an
installed-host vulnerability was exploited.

## Authority

```text
host_census_authorized=false
python_runtime_closure_accepted=false
protected_install_authorized=false
installed_binary_identity_proven=false
host_plan_authorized=false
service_mutation=false
systemd_mutation=false
credential_access=false
private_key_access=false
signing=false
transaction=false
rpc_call=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

Next gate:
`void_buy_void_epoch2_v6r3_python_runtime_closure_census_v1`.

PROTECT THE CORE.
