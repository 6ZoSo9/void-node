# Buy VOID Epoch-2 dormant-binder installer first entry v1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1`.

Status: **source/test/CI only**. This generation does not install or invoke anything on Precision.

## Purpose

Issue #3367 exists because a privileged invocation of:

```text
python3 -I -B -
```

cannot authenticate the Python program before that caller-selected stdin program
has already begun executing as root.

This source places a static native first instruction in front of the dormant-
binder protected installer. The native boundary authenticates the exact
installer source, native candidate, expected source head and Python runtime
before the installer payload can execute.

It deliberately does **not** select or promote the retired #3364/#3366
candidate-lock generation.

## Build-time generation binding

A production candidate cannot compile unless its build supplies all of:

```text
VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_SHA256
VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_BYTES
VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_SHA256
VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_BYTES
VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_EXPECTED_HEAD
VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_APPLY_CONFIRM
```

There are no stale/default installer, candidate, head or confirmation
identities in the source. A later candidate derivation must fill these from the
then-accepted post-#3363 dormant-binder installer/lock generation.

The fixed protected namespace is:

```text
/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1/
  bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1
  policy-v1.conf
  python3 -> /usr/bin/python3
  source/ops/precision/
    void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py
  input/
    void_buy_void_epoch2_dormant_binder_native_candidate_v2
```

The exact future installer filename is a source-profile name, not an accepted
installer generation. Source acceptance of this first-entry primitive does not
authorize or assert that such an installer is already canonical.

## Python runtime policy

The installed root-custodied policy is exact-order:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1
python_sha256=<64 lowercase hex>
python_bytes=<positive decimal>
```

The native launcher verifies fixed Python pathname/canonical target custody,
retains the Python descriptor, and verifies the policy-bound Python SHA-256 and
size before any installer child exists.

## Allowed operations

The native surface is intentionally limited to:

```text
--installer-plan
--installer-apply --expected-plan-id <operation-bound plan id> --confirm <compile-bound exact token>
```

The child receives no arbitrary caller path, source head or environment. Apply
receives only one caller-controlled value beyond the fixed operation selector:
the operation-bound plan ID, validated by closed grammar before child creation.

Plan executes only:

```text
python3 -I -B /proc/self/fd/<retained-installer-fd> \
  --plan \
  --native /proc/self/fd/<retained-native-fd> \
  --expected-head <compile-bound exact head>
```

Apply executes the same retained installer source with `--apply`, the
caller-supplied operation-bound `--expected-plan-id`, and the compile-bound
confirmation token. The plan ID must match the installer's exact prefix +
64-lowercase-hex grammar before a child is created.

The installer successor remains responsible for its own accepted lock,
candidate semantics and create-only publication rules. This first-entry layer
only authenticates what code/interpreter/input generation is permitted to reach
that installer boundary.

## First-instruction and stdin boundary

The native candidate must be statically linked with no `PT_INTERP` or dynamic
`NEEDED` dependency.

Before parsing a privileged operation, the native launcher requires its stdin
to be exactly `/dev/null`. Caller-supplied Python stdin is therefore rejected
before source admission or child creation.

The Python child is entered with `fexecve()` on the retained Python
descriptor. The installer and native candidate are both referenced only by
retained `/proc/self/fd/<fd>` descriptors.

Before fork, the native launcher also creates a private one-shot pipe. Its exact
proof record binds the launcher PID/start ticks, launcher device/inode, retained
installer/native/Python device/inode identities, exact operation, exact expected
head, and inherited installer/native FD numbers. The child environment is
constructed from scratch and contains only fixed PATH/HOME/locale/timezone, the
first-entry marker, the installer/native FD numbers, and the private proof-read
FD number.

The installer must consume that one-shot proof and cross-check it against its
real `getppid()`, `/proc/<ppid>/stat`, `/proc/<ppid>/exe`, its executing
script FD, retained native FD, and `/proc/self/exe`. Marker + FD-number state
alone is not privileged provenance.

Caller-controlled `LD_PRELOAD`, `LD_LIBRARY_PATH`, `LD_AUDIT`,
`PYTHONPATH`, `PYTHONHOME`, `PYTHONSTARTUP`, `PYTHONINSPECT`,
`PYTHONWARNINGS`, and `PYTHONBREAKPOINT` are not propagated into the
Python child.

## Retained generation semantics

Before fork the parent retains exact descriptors for:

- its fixed installed native executable;
- the root-owned Python policy;
- the exact installer source;
- the exact native candidate input; and
- the Python runtime.

Installer source and native candidate are checked against the build-time
SHA-256/byte identities before Python is started.

The installer revalidates the live native-parent PID/start/executable and
running Python generation immediately before its first protected staging
mutation and again immediately before `RENAME_NOREPLACE`. After the child
exits, before parent GREEN, the native parent revalidates all retained and
visible generations.

A pathname replacement during child execution cannot change either the retained
installer bytes the child executes or the retained native-candidate bytes the
installer consumes. Any visible installer/native/launcher generation drift or
loss of the parent process generation prevents authority from advancing.

If a parent-side failure occurs after an apply child was created, the receipt
does not claim `installer_apply_performed=false`; it reports the conservative
state:

```text
installer_apply_state=unknown_or_partial_if_child_created
```

## Focused adversarial proof

The hosted proof:

- requires compilation to fail when exact generation macros are omitted;
- compiles the real source statically and rejects `PT_INTERP`/dynamic
  `NEEDED`;
- installs a disposable root-owned fixture outside production paths;
- proves plan and synthetic apply can reach only the retained installer;
- dynamically consumes the private parent-proof pipe and verifies parent PID,
  start ticks, executable device/inode, retained installer/native identities,
  running Python identity, operation and expected head before the fixture marks
  itself invoked;
- supplies arbitrary caller stdin Python and requires pre-fork HOLD;
- supplies a wrong confirmation and requires pre-fork HOLD;
- substitutes installer bytes and requires HOLD before Python;
- substitutes native-candidate bytes and requires HOLD before Python;
- substitutes the Python target and requires HOLD before payload execution;
- swaps the visible installer pathname while the retained child is running and
  requires child completion but parent HOLD/no GREEN;
- swaps the visible native-candidate pathname before the fixture reads candidate
  bytes, proves the child still consumes the pre-authenticated retained FD, and
  requires parent HOLD/no GREEN;
- forces abnormal apply-child termination and requires a conservative
  post-fork receipt;
- proves a working dynamic `LD_PRELOAD` control cannot reach the static
  preentry or its closed-environment Python child; and
- proves a working `PYTHONPATH/sitecustomize` control cannot reach the
  protected child.

The fixture is removed after the proof. It does not touch the production
Precision dormant-binder namespace.

## Authority

This source candidate grants no:

- protected installer apply authority;
- Precision filesystem mutation;
- dormant-binder execution;
- service/systemd action;
- credential/private-key access;
- signing or wallet access;
- RPC/transaction action;
- payment acceptance;
- public presale/WC activation;
- treasury/liquidity action; or
- funds movement.

After source acceptance, later gates still must derive a candidate against the
accepted post-#3363 installer/lock generation, create-only install the native
preentry/policy/source/input namespace, and perform an installed read-only
qualification before any root apply can be considered.

PROTECT THE CORE.
