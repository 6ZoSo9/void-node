# Buy VOID Epoch-2 V6R3 terminal runtime census manifest substrate V1

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_TERMINAL_RUNTIME_CENSUS_MANIFEST_V1`.

Status: **source/test/CI manifest substrate only**. Production host census execution is
hard-disabled in this candidate.

## Bound upstream gates

```text
runtime_closure_contract_blob=c70dfd9da29c75b348a3619f6df7329381e939cf
runtime_closure_contract_id=voidbuye2v6r3pyruntimecontract1_cdb98f511f04a3c798200e304481ec14d94373fdbdf6ec30cf88b0e281b0eb4f

freshness_gate_blob=9657fff243e44135e1f992b1ef5b8e0d977b8b65
freshness_gate_id=voidbuye2v6r3pyclosurefreshness1_66f0fc4c608ab2874e75620e0e4037c9a672369fbd460b12a35a0b0600398a66
```

The corrected parent records the canonical sealed-Python `fexecve`
`pre_dumpable=0 → post_dumpable=1` diagnostic. The freshness gate is explicitly
pre-exec only.

## Implemented substrate

The source candidate implements reusable, bounded manifest primitives for a future
source-authenticated observer:

- no-follow/nonblocking, generation-stable SHA-256 of regular files;
- deterministic directory inventory without following symlinks;
- symlink text plus resolved-target facts;
- explicit absent-path records bound to their nearest existing parent;
- rejection of FIFOs/devices/sockets and other special files;
- **bounded directory discovery**, accounting for current objects and queued directories *before* materializing and sorting `scandir` entries, with a total 100,000-entry census budget;
- 512 MiB/file and 16 MiB/report bounds;
- exact accessed-path subset validation;
- canonical JSON terminal-manifest equality;
- explicit refusal to promote post-exec dumpability to verified/accepted.

The self-test uses only a temporary synthetic tree. It exercises content drift, a
materialized declared absence, symlink identity, special-file rejection, and a false
post-exec dumpability promotion.

### Fan-out denial-of-service negative tests

The original candidate used `sorted(os.scandir(current))`, which could
allocate an arbitrarily large list *before* the 100,000-entry bound was
checked. It also left child directory paths on a pending `stack` before they
counted against that limit.

The corrected source loops through `os.scandir` with a context manager and
collects at most the remaining `entry_limit - len(objects) - len(stack)`
entries. Encountering one excess entry immediately raises
`Hold("tree_entry_bound_exceeded")`; sorting occurs **only after** this
bounded discovery. Queued directories consume budget like hashed leaves.
The runtime maximum remains 100,000; a smaller `entry_limit` is available
exclusively for synthetic fixture testing.

The source fixture checks both a 3-file fan-out and a 3-directory fan-out
with limit 2, plus the root-counting boundary with limits 1 and 4. These
are all disposable filesystem objects; no protected host is read.

```text
bounded_scandir_source_blob=1299540e8a48a30d429a31580139dea28abccf23
bounded_scandir_source_proof_blob=130cf67728d670a6b27f036ddfbbb95376dfd6ab
host_execution_enabled=false
host_census_authorized=false
```

## Deliberate execution HOLD

This candidate contains:

```text
HOST_EXECUTION_ENABLED=False
```

Its CLI exposes only `--self-test` and `--source-plan`. There is no `--run`,
`--host-census`, installer, apply, service, credential, signer, RPC, payment, or
activation mode. The proof rejects the introduction of subprocess execution, `sudo`,
`/opt` paths, or privileged/destructive commands.

The substrate does **not** yet establish the Python/Git ELF resolution, exact import
probe, mapped-object/file-access observation, or protected first entry needed for a
real Precision report. Those belong to the next source-authenticated host-observer
adapter.

## Authority

```text
host_execution_enabled=false
host_census_authorized=false
protected_install_authorized=false
post_exec_dumpability_accepted=false
host_plan_authorized=false
credential_access=false
private_key_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
funds_movement=false
```

Next gate: `source_authenticated_host_observer_adapter`.

PROTECT THE CORE.
