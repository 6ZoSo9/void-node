# Buy VOID allocation-custody V3 protected process-reference install plan V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_PROCREF_INSTALL_PLAN_V1`.

Status: **read-only create-only installation planning only; no apply mode and no host mutation authority**.

## Purpose

This plan follows the exact accepted protected all-process census source lock at
head:

```text
e709726c6a7d2af1e61956fa2e60f6fb0904c653
```

It describes the minimum create-only publication shape for a future protected
copy of the all-process census source. It does not install that source, execute
it as root, inspect all host processes, or touch the legacy custody runtime.

## Exact accepted inputs

Acceptance lock:

```text
path=ops/security/buy-void-allocation-custody-runtime-v3-protected-all-process-reference-census-lock-v1.json
git_blob_sha1=3eacfe0dec5144ba8c1e4c743bf3e8025f58f88a
lock_id=voidbuycustodyallprocreflock1_0567991abb05c121722d47485ab9e7410b8b8126
```

Accepted protected census source:

```text
path=ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
git_blob_sha1=0567991abb05c121722d47485ab9e7410b8b8126
bytes=31062
sha256=c9de40bc6b6b25ded246a06d04560326541fdeee5a815a12f8fc40922226d90c
```

The plan independently rereads and verifies the exact source Git blob, byte
count and SHA-256. It also rereads the exact acceptance-lock blob and requires
all protected-install/live-census/replacement/economic authority fields in that
lock to remain false.

## Future fixed paths

The future install target would be:

```text
/opt/void-buy-allocation-custody-procref-v1
/opt/void-buy-allocation-custody-procref-v1/
  void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1.py
```

The proposed private stage would be:

```text
/opt/.void-buy-allocation-custody-procref-v1.stage-v1
```

The plan merely observes whether the install root and stage root are absent.

Even if both are absent, the observation remains point-in-time and
non-authoritative:

```text
create_only_prestate_candidate=true
host_identity_bound=false
observation_time_bound=false
observation_freshness_proven=false
live_at_use_prestate_reverification_required=true
protected_install_ready=false
protected_install_authorized=false
```

## Future apply contract, not implementation

A separately reviewed future installer would have to satisfy all of these
conditions:

- explicit separate authorization;
- root execution from an independently admitted installer source;
- isolated/safe-path Python with bytecode writes disabled;
- exact acceptance-lock and candidate-source re-verification;
- fresh root-owned/non-group/world-writable `/` and `/opt` custody checks;
- install root absent;
- stage root absent;
- create-only private stage mode `0700`;
- create-only/no-follow source leaf;
- exact root:root source mode `0444`, single link;
- file fsync and exact SHA-256 re-verification;
- stage-directory fsync;
- final stage-root mode `0755`;
- create-only publication using `renameat2(RENAME_NOREPLACE)`;
- `/opt` directory fsync after publication;
- exact final-tree re-verification;
- no automatic post-publication cleanup;
- no custody-service mutation;
- no mutation of
  `/opt/void-buy-allocation-custody-runtime-v1`.

These are future requirements only. This generation contains no implementation
of them.

## CLI boundary

The only modes are:

```text
--self-test
--plan
```

There is no `--apply` mode.

The production plan path contains no filesystem mutation primitive. It does not
create a stage, write a file, rename, unlink, chmod/chown, fsync, invoke sudo,
launch subprocesses, stop/start a service, or perform any economic action.

## Invocation

The plan itself may be inspected without privilege:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_protected_procref_install_plan_v1.py \
  --plan
```

This is a read-only observation. It is not permission to run a future installer
or the protected census as root.

## Authority boundary

```text
read_only=true
filesystem_write=false
apply_implemented=false
apply_available=false
protected_install_authorized=false
protected_install_performed=false
host_identity_bound=false
observation_time_bound=false
observation_freshness_proven=false
live_at_use_prestate_reverification_required=true
live_privileged_census_authorized=false
live_privileged_census_executed=false
service_mutation=false
systemd_mutation=false
legacy_runtime_target_mutation=false
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

After source/CI qualification, the next possible gate is a separately reviewed
create-only installer source. Installing or executing it on Precision would
still require a separate host-mutation authorization.

**PROTECT THE CORE.**
