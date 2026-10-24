# Buy VOID custody V3 installer first-entry source lock V2

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALLER_FIRST_ENTRY_LOCK_V2`.

Status: **exact first-entry native source acceptance only; no protected installation
or execution authority**.

This successor consumes the exact source/CI-qualified V2 first-entry native
source from Draft #3810 and accepts only that immutable source generation. It
does not install, compile into a production binary, execute, or expose a new
apply path.

## Exact accepted generation

Parent first-entry source head:

`5ed63b70d89209201be903a5a92f9c5d760fd763`

Accepted installer-lock V2 parent head:

`3ad8c6f87fc9edfbffe196c42cf3aea99fdc9797`

Native source:

`native/void_buy_allocation_custody_runtime_v3_installer_first_entry_source_v2.c`

Exact identity:

```text
Git blob SHA-1:
d7693320783bcd0e3a2c4ef6c4afd86123e3688e

bytes:
20952

SHA-256:
d9cc46aeb3fe5d945fdadf0c0cddbc9991b51ed9c4328b4d32c45a7825248974
```

Companion identities:

```text
proof:
3d2fce2dba70f63dc3b8894fa3f120baf0584c3c

operator document:
a64253df5d88ddf5ef44ed230026d94a98f295f6

focused workflow:
0e267c9603906b85dc2688379400ab41cd65df8a

accepted installer-lock V2:
486a6f6e1e2c594e60d6f9fe3fa32b03175630ae
```

Historical V1 first-entry lineage remains pinned separately:

```text
head:
86e2e5c92f87a74985e4f96617b4d013c252e237

native source blob:
1bbe19704a3d1f89b8fe1bfc3759e202ba85594c
```

V2 does not silently relabel or reuse the V1 source bytes.

## Hosted evidence

The lock accepts hosted evidence only after GitHub API authentication of:

```text
focused run: 40079868431
focused job: 120830989728
same-account exact-head review: 5638151673
Codex exact-head state comment: 6382080747
reviewed head: 5ed63b70d89209201be903a5a92f9c5d760fd763
```

The same-account review is explicitly not independent external approval.

The Codex state must be authored by
`chatgpt-codex-connector[bot]`, bind the same exact source head, and report:

```text
has_any_findings=false
has_unresolved_findings=false
status=completed
```

Numeric IDs alone are not acceptance evidence. The workflow authenticates the
repository, run, workflow path, head, job membership, review commit and Codex
state before producing a temporary hosted-evidence receipt.

## Accepted source properties

The lock accepts the exact reviewed source/proof generation in which:

- repository native-source bytes are captured through a descriptor-bound
  `O_RDONLY|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC` read;
- acceptance identity is computed from those retained bytes;
- syntax compilation and the native FIFO harness compile only a disposable
  regular copy of the captured bytes;
- source symlink and FIFO substitution are rejected;
- a post-hash pathname replacement regression proves compilation remains bound
  to the retained captured generation;
- trusted leaf opening in the native source uses the shared nonblocking
  no-follow helper;
- installed-self pathname admission uses that same helper;
- the exact accepted installer-lock V2 is required;
- the historical V1 predecessor head/blob remain explicit lineage evidence.

The native C source contains no rename, unlink, chmod, chown, system or popen
filesystem-publication primitive. That does not make the source safe to execute
without later gates; it only describes the accepted source surface.

## Authority boundary

The source-property acceptance fields advance:

```text
first_entry_native_source_accepted=true
descriptor_bound_source_capture_accepted=true
source_fifo_nonblocking_rejection_accepted=true
captured_source_compile_binding_accepted=true
predecessor_lineage_bound=true
accepted_installer_lock_v2_bound=true
```

The following remain false:

```text
python_runtime_identity_selected=false
first_entry_candidate_derived=false
first_entry_candidate_accepted=false
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

The next gate may derive a content-addressed first-entry candidate from this
accepted source and separately select the exact Python/runtime closure. It may
not install or execute that candidate without another explicit protected-source
installation gate.

**PROTECT THE CORE.**
