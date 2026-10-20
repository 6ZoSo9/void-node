# Buy VOID Epoch-2 V6R3 Python runtime closure contract V1

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_PYTHON_RUNTIME_CLOSURE_CONTRACT_V1`.

Status: **source contract only**. It does not perform or authorize a Precision census,
installation, or host plan.

Contract ID:

```text
voidbuye2v6r3pyruntimecontract1_e8f3211a483cf12a77f5c66e4a625da5d4f95b1f669cefa2a09711dcc6e6ee01
```

## Why this gate exists

#3574 accepts the exact static native first-entry ELF, but that launcher intentionally
enters a host Python ELF after the permanent UID/GID 1000 drop. The Python executable is
sealed before `fexecve()`, but a dynamically linked Python still depends on the host
ELF interpreter, DSOs, Python import roots, stdlib files, extension modules, and their
native dependencies.

A Python binary hash alone is therefore not a complete execution identity.

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
- root-owned/non-writable ancestry and effective runtime-UID nonwritability for all
  execution-authority paths.

The census must be bounded (100,000 entries, 512 MiB per regular file, 16 MiB canonical
report) and must remain **unaccepted source evidence** until a separate content-addressed
lock reviews the exact host report.

## Loader and Python environment

The bound launcher executes Python under numeric UID/GID 1000, empty supplementary
groups, `no_new_privs`, `PR_SET_DUMPABLE=0`, isolated `-I -B -S`, clean stdin, and
a newly constructed environment. Ambient loader/Python controls such as
`LD_PRELOAD`, `LD_LIBRARY_PATH`, `LD_AUDIT`, `GLIBC_TUNABLES`, `PYTHONPATH`,
`PYTHONHOME`, and `PYTHONSTARTUP` are not accepted as authority.

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
