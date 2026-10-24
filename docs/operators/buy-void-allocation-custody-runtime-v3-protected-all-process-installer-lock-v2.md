# Buy VOID custody V3 protected all-process installer source lock V2

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V2`.

Status: **exact ctypes-free installer-candidate source acceptance only; no protected
install or execution authority**.

This successor consumes the exact source/CI-qualified V2 installer candidate from
Draft #3808 and accepts only its immutable source identity. It does not install,
execute, or expose a privileged apply path.

## Exact accepted installer generation

Parent installer head:

`0eb7d49b10681ee7b29298ca325902671121ef5a`

Qualified parent install-plan head:

`06395abde20620b99808f62fe0d90a3f2e05528e`

Installer source:

`ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v2.py`

Exact identity:

```text
Git blob SHA-1:
bd8728be0b59bce3db0f559d0ebd01692f9a5844

bytes:
46939

SHA-256:
75934d38e5b89eed904be7738c82de6cd586ac11afc28e075cc44a4e7fb9d715
```

The source is ASCII-only.

Companion identities:

```text
proof:
a8c3847b34da4fa05a50f741625b2171a1e34548

operator document:
ba1609aa65e7ef8dfaa8326f9c6a3c589528af6d

focused workflow:
80efb530a09c89b81a23c639309f0aee6633ab90

parent install-plan source:
0fef4e6f76738dd474ea775985b1facdd922bb54

historical V1 installer lock:
a1e1f4887787b408d313e73360966f93a63b2b58
```

Hosted evidence is accepted only after authenticated GitHub API metadata validation:

```text
focused run: 40073107466
focused job: 120810613302
same-account qualification review: 5637294073
independent Codex review-state comment: 6381355558
reviewed head: 0eb7d49b10681ee7b29298ca325902671121ef5a
```

The same-account qualification review is explicitly **not** independent
approval. The lock workflow separately authenticates the Codex review-state
comment authored by `chatgpt-codex-connector[bot]` and requires its
machine-readable code-review state to bind the exact installer head with
`has_any_findings=false`, `has_unresolved_findings=false`, and
`status=completed`.

Before the lock proof may emit hosted-evidence markers, the workflow uses its
read-only GitHub token to authenticate the exact repository/run/workflow/head,
successful focused job membership, same-account review commit, and independent
Codex review state. It writes only those non-secret verified fields into a
runner-temporary receipt; the token is never written to the receipt or logs.

## Hosted evidence boundary

Numeric run/job/comment IDs by themselves are not acceptance evidence. The
source lock requires a separately generated authenticated receipt proving that
the referenced hosted objects actually belong to the exact installer
generation and completed successfully. If GitHub metadata cannot be read or any
field disagrees, the lock proof HOLDs before reporting source acceptance.

## Accepted V2 source properties

This lock accepts the exact repaired V2 source boundary:

- no direct `--apply` CLI;
- `PROTECTED_FIRST_ENTRY_REQUIRED=true`;
- fixed least-authority entrypoint remains
  `install_accepted_source_create_only_after_protected_first_entry()`;
- publication uses the reviewed builtin `_voidfs.rename_noreplace` contract;
- no executable `ctypes`, `CDLL`, `renameat2`, `dlopen`, `dlsym` or
  host-libc symbol-lookup fallback exists;
- a preloaded `sys.modules["_voidfs"]` entry is rejected before import;
- builtin resolution is through `BuiltinImporter.find_spec` and an uncached
  module object created/executed through the builtin loader;
- module/spec loader identity and `origin == "built-in"` are required;
- the production bridge contains no ordinary `os.rename` fallback;
- the protected fixed entrypoint supplies no bridge override;
- retained repository/source leaf reads include `O_NONBLOCK` so FIFO
  substitution fails promptly rather than blocking;
- source self-test and standalone proof include a `sys.modules` shadow
  regression and fail closed;
- stage-generation-unknown, exact-generation cleanup, fsync ordering and
  truthful post-publication failure receipts remain bound.

This lock accepts those exact source bytes only. It does not claim that the
source has been placed under a protected root, compiled into a first-entry
binary, or invoked with root authority.

## Historical V1 relationship

The exact historical V1 lock remains bound as evidence:

`ops/security/buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v1.json`

Git blob:

`a1e1f4887787b408d313e73360966f93a63b2b58`

V1 remains immutable historical evidence. V2 does not rewrite or relabel the
accepted V1 source.

## Target-selection semantics

The parent install plan already selected the exact future destination. This
lock therefore truthfully preserves:

```text
install_target_selected=true
```

Target selection is not installation permission.

## Authority boundary

Source-property acceptance fields advance:

```text
candidate_installer_source_accepted=true
ctypes_free_builtin_voidfs_boundary_accepted=true
voidfs_preloaded_cache_rejection_accepted=true
repository_input_fifo_nonblocking_accepted=true
```

The following remain false:

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

The next source gate may rebind the protected first-entry mechanism to this
accepted V2 installer identity. Actual protected installation and any live
privileged census remain separate authorization events.

**PROTECT THE CORE.**
