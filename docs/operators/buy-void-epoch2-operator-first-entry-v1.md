# Buy VOID Epoch-2 protected operator first entry v1

Marker: `VOID_BUY_VOID_EPOCH2_OPERATOR_FIRST_ENTRY_V1`.

Tracker: #3295.

Status: **source/test/CI candidate only**. This source does not install the
preentry, does not perform the protected installer apply, and does not run the
installed qualifier on Precision.

## Purpose

Source-accepted #3289 and #3290 deliberately stop before live root operation.
Their Python algorithms are bounded and reviewed, but invoking either directly
from the ordinary runtime-user checkout would execute mutable Python as root
before its internal source checks could establish authority.

This contract places one static native first instruction in front of the three
allowed operator operations:

1. installer read-only plan;
2. installer create-only apply;
3. installed read-only qualification run.

No caller can select an arbitrary Python source, candidate path, interpreter
path, or operation argv.

## Fixed protected namespace

The source candidate requires a later separately reviewed host installation at:

```text
/opt/void-buy-void-epoch2-operator-first-entry-v1/
  bin/void_buy_void_epoch2_operator_first_entry_v1
  policy-v1.conf
  python3 -> /usr/bin/python3
  source/
    ops/precision/void_buy_void_epoch2_live_composition_native_protected_install_v2.py
    ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v2.py
    ...complete repository-shaped dependency closure required by those tools...
  input/
    void_buy_void_epoch2_live_composition_native_v4
    void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs
```

The native source defaults to `/usr/bin/python3`; the proof-only build may
override that path to exercise substitution adversaries. The production
namespace and all ancestors/files must be root-owned and not group/world
writable. Source, policy, and input files are single-link non-symlink regular
files.

This PR does **not** define or perform that installation. A later host gate must
materialize the preentry, protected source tree, policy, and accepted installer
inputs create-only/content-addressed and must bind the accepted preentry binary
identity before live use.

## Accepted Python source identities

The native boundary authenticates the exact source bytes before Python starts:

```text
installer
  Git blob c565c2f2327586e58100aaad4954602b85e7ebdb
  bytes    46700
  SHA-256  43d86d44fd47d21765879e149ae8328e1d645a7aa0172d9a180c212c3ca8b1fd

installed qualifier
  Git blob e8807d1acb8c7a81d52bf5b8f32b56c3446e28b5
  bytes    19661
  SHA-256  4f5cbc83cbe7cb2f7bf10b8dd564093d1d5e9af51b69705c1269e7d485d81969
```

The protected source tree must remain repository-shaped because the accepted
Python tools deliberately derive `ROOT = Path(__file__).resolve().parents[2]`
and independently verify their lock/source dependency set. The first-entry
contract does not weaken or replace those checks.

## Python identity policy

The root-owned `policy-v1.conf` is exactly three lines:

```text
schema=VOID_BUY_VOID_EPOCH2_OPERATOR_FIRST_ENTRY_POLICY_V1
python_sha256=<64 lowercase hex>
python_bytes=<positive decimal bytes>
```

A later host acceptance gate selects the exact reviewed Python identity. This
source candidate intentionally does not guess the production Python digest.

The preentry opens the requested `/usr/bin/python3` generation, resolves the
canonical target, retains its descriptor, verifies the exact policy digest and
size, and executes that retained descriptor with `fexecve`.

## Closed operation grammar

### Installer plan

```text
void_buy_void_epoch2_operator_first_entry_v1 \
  --installer-plan \
  --expected-head <40 lowercase hex>
```

The child receives only:

```text
python3 -I -B /proc/self/fd/<retained-installer-fd> \
  --plan \
  --native  /opt/void-buy-void-epoch2-operator-first-entry-v1/input/void_buy_void_epoch2_live_composition_native_v4 \
  --runner  /opt/void-buy-void-epoch2-operator-first-entry-v1/input/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs \
  --expected-head <exact caller head>
```

### Installer apply

```text
void_buy_void_epoch2_operator_first_entry_v1 \
  --installer-apply \
  --expected-head <40 lowercase hex> \
  --expected-plan-id voidbuye2nativeinstallplan2_<64 lowercase hex> \
  --confirm INSTALL_ACCEPTED_EPOCH2_LIVE_COMPOSITION_V4_CREATE_ONLY
```

The preentry validates the exact existing #3289 confirmation token and plan-ID
shape **before Python is started**. #3289 still independently rechecks both
values and emits its PRE_MUTATION authority receipt before candidate/protected
root mutation.

### Installed qualifier run

```text
void_buy_void_epoch2_operator_first_entry_v1 \
  --qualifier-run \
  --expected-head <40 lowercase hex>
```

The child receives only the accepted qualifier source via its retained source
descriptor and `--run --expected-head <head>`.

Direct
`python3 -I -B <ordinary-checkout-tool> --apply/--run`
is not reviewed operational authority.

## First-instruction and loader boundary

The production preentry must be accepted later as a **static native binary**.
The focused proof requires no `PT_INTERP` and no dynamic `NEEDED` entries.

The child environment is constructed from scratch and contains only the fixed
PATH/HOME/locale/timezone plus the first-entry marker. Caller
`LD_PRELOAD`, `LD_LIBRARY_PATH`, `LD_AUDIT`, `GCONV_PATH`,
`PYTHONPATH`, `PYTHONHOME`, `PYTHONSTARTUP`, `PYTHONINSPECT`,
`PYTHONWARNINGS`, `PYTHONBREAKPOINT`, and other unlisted variables do not
enter the Python child.

The proof includes dynamic controls showing that hostile `LD_PRELOAD` and
`PYTHONPATH/sitecustomize` payloads execute in ordinary unprotected processes
while the static preentry + closed child environment prevents them from reaching
the protected child.

## Retained generation semantics

Before fork, the parent retains descriptors for:

- its fixed preentry path;
- the policy;
- the exact installer source;
- the exact qualifier source;
- the exact Python target.

The child executes the selected source only through
`/proc/self/fd/<retained-source-fd>` and executes Python through the retained
Python descriptor.

After the child exits, and **before the parent emits its GREEN receipt**, the
parent revalidates the visible and retained generations of the preentry, policy,
both Python sources, and Python interpreter.

A source pathname swap during child execution therefore has two properties:

- the child still executes the retained original source bytes; and
- the parent refuses GREEN because the visible source generation changed.

Child output by itself is never an accepted protected-operation receipt.
Only a successful child exit followed by the parent
`VOID_BUY_VOID_EPOCH2_OPERATOR_FIRST_ENTRY_V1_GREEN` receipt establishes that
the first-entry/source/interpreter boundary remained stable through the child
lifetime.

## Installer-input boundary

The two fixed input names are not accepted merely because they exist. The
first-entry checks protected root custody/path shape, while the accepted #3289
installer remains authoritative for the exact V4 native and repaired V3 runner
bytes, modes, lock/candidate identities, source-finality checks, plan ID,
create-only stage, and `RENAME_NOREPLACE` publication.

#3292 and later artifact work remain a separate byte-handoff lineage. This source
does not promote a superseded materializer generation into production authority.

## Preserved parent semantics

This contract is additive to #3289 and #3290.

It does not weaken:

- #3289 exact V4 lock/candidate checks;
- fixed Node/Git/setpriv and clean-main checkout checks;
- exact expected-head and expected-plan-ID binding;
- wrong-confirmation PRE_MUTATION HOLD;
- create-only finalized stage;
- immediate pre-publication revalidation;
- `renameat2(RENAME_NOREPLACE)`;
- parent fsync/final readback;
- truthful post-publication failure receipts;
- #3290 complete installed-generation snapshots;
- retained native FD hashing/execution;
- visible + retained generation revalidation;
- two stable native self-tests;
- pathname-swap rejection;
- prohibition on executing the live V3 composition runner.

The focused workflow reruns both accepted parent proofs unchanged.

## Parent HOLD receipt truth

The native parent distinguishes the successful-fork boundary from pre-fork
validation.

Before a child exists, a parent HOLD may state both:

```text
installer_apply_performed=false
installed_qualifier_run_performed=false
```

because no protected Python operation has started.

After a successful `fork()`, a parent-generated HOLD must not reuse those
false-negative claims for the selected operation. The parent records
`child_process_created=true` and reports the selected operation
conservatively:

```text
installer_apply_state=unknown_or_partial_if_child_created
```

or:

```text
installed_qualifier_run_state=unknown_or_partial_if_child_created
```

as applicable. The unselected mutating/read operation may still remain strict
false.

This rule applies to parent-side wait failures, abnormal child termination, and
post-child revalidation failures. Ordinary nonzero child exits are returned
without replacing the child's own more precise receipt.

The focused proof requires:

- a pre-fork bad-confirmation HOLD with both operation-performed booleans false;
- an installer-apply child that terminates abnormally after creation, requiring
  conservative apply state;
- a qualifier child that completes its retained-source execution while the
  visible qualifier pathname is replaced, requiring conservative qualifier
  state when the parent rejects GREEN.

## Authority boundary

Source/test/CI only.

This candidate does **not** establish:

- installed/preentry binary identity accepted on Precision;
- protected source snapshot installed;
- operator input artifacts installed/accepted;
- exact production Python identity accepted;
- installer plan executed on Precision;
- protected installer apply performed;
- installed qualifier run performed;
- credential/private-key access;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale or WC/VOID activation;
- validator action;
- treasury/liquidity action;
- funds movement.

A later protected installation/host-qualification gate is mandatory before any
live invocation.

PROTECT THE CORE.
