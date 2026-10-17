# Buy VOID Epoch-2 dormant-binder installer first entry V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V2`.

Status: **source/test/CI only; no candidate acceptance, installation, or live authority**.

## Purpose

V1 first-entry launcher is securely content-bound, but its accepted binary is
compile-bound to repository HEAD
`9eebcd1bb15ea0b853c3c7cfe0ffd8dd60030a30`.

That makes the launcher authority self-expiring as `main` advances. V2 accepts
the expected HEAD at invocation while preserving V1's native-first privileged
boundary and its installed-path contract with the retained runtime child.

V1 remains historical and unchanged.

## Compatibility with the unchanged runtime child

V2 identifies a new source and binary generation. Its default installation slot
retains the V1 name because the frozen runtime child authenticates that exact
launcher path.

Default root:

`/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1`

Default executable:

`/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1/bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1`

Policy schema:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1`

The Python child protocol also remains V1:

- environment protocol value:
  `VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1`;
- parent-proof schema:
  `VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_PARENT_PROOF_V1`.

The unchanged protected Python installer blob
`f3d6b1559be7490303cf36338c4bfa38fdaa390a` authenticates the exact wire
values and the device/inode identity of the V1 pathname against the live parent
executable. A V2-named slot cannot satisfy that check. Matching just the wire
strings in a synthetic child was insufficient to prove the production handoff.

The compatibility correction changes exactly three C definitions: the default
root, fixed executable basename, and policy schema. It preserves the V2 source
marker, runtime HEAD admission, child protocol, payload bindings, retained
descriptors, and postchild validation.

Sharing the installed pathname does not accept a new binary under an old lock.
A corrected V2 candidate still needs its own exact acceptance and installation
generation. Installation remains create-only: an existing different generation
causes a hold. This source gate provides no migration or overwrite operation,
and it makes no claim about whether the slot exists on Precision.

## Runtime HEAD contract

V2 removes the build requirement:

`VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_EXPECTED_HEAD`

and has no `EXPECTED_HEAD` compile constant.

Instead:

### Plan

```text
<launcher-v2>
--installer-plan
--expected-head <40 lowercase hex>
```

### Apply

```text
<launcher-v2>
--installer-apply
--expected-head <40 lowercase hex>
--expected-plan-id <voidbuye2dormantbinderinstall2_...>
--confirm INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY
```

The request owns a bounded `expected_head[41]`.

V2 admits only exact lowercase 40-hex values, writes the admitted value into
the private parent proof, and passes the same value unchanged to the
Python child executed through a retained regular installer descriptor for both
plan and apply.

The Python installer remains responsible for authenticating the supplied HEAD
against its own checkout/source/lock requirements.

## Preserved security boundary

V2 preserves V1 controls:

- static launcher;
- caller stdin must be `/dev/null`;
- root-only normal operation;
- root-custodied fixed self/policy/installer/native/Python paths;
- exact installer SHA-256 and byte count compile bindings;
- exact native SHA-256 and byte count compile bindings;
- exact apply-confirmation compile binding;
- retained installer/native descriptors;
- private parent-proof pipe;
- parent PID/start/executable generation proof;
- Python executable generation binding;
- child execution through retained Python descriptor;
- closed child environment;
- retained native descriptor passed to the installer;
- post-child generation revalidation;
- conservative receipt if apply child terminates abnormally.

The HEAD binding is the only compile-time authority removed.

## Actual production-child handoff proof

The proof requires an explicit `--accepted-native` file. It checks the accepted
native input against lock V3: 726,976 bytes and SHA-256
`ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`.
The input is read and hashed during the handoff fixture; that fixture never
executes the runtime native program.

CI obtains the input with the existing pinned
`scripts/materialize_buy_void_epoch2_dormant_binder_native_v2.py` materializer
(Git blob `557eb68453d517d78bb3b6c6d8427df9ed36316f`). It reproduces the
accepted candidate from frozen merge
`2b76758851d550e8cbd5fc71412e4b85cfaa8791` and requires the accepted report
and binary digests. That derivation includes the candidate's inert self-test
and loader controls. It grants no operational native execution or installation
authority. Reproduction depends on the accepted compiler and static input
identities; build-environment drift causes a hold rather than accepting a new
binary. Expiring Actions artifact storage is not the proof's input authority.

A disposable Linux fixture compiles C2 with its production default root and
Python path, its exact frozen runtime-child binding, and the accepted native
binding. The fixture executes the unchanged Python child through the launcher's
retained regular file descriptor. It does not replace the child's fixed-path
constant or parent validator.

The positive plan must reach the child's real plan result and valid
content-addressed plan ID. The proof then supplies an already-correct owned
native/binder pair and requires the real apply path to return `ALREADY_GREEN`
without protected publication. The fixed checkout contains the exact accepted
lock V3 and binder source; the child performs its normal checkout and parent
authentication.

All fixture roots must be absent before creation. The helper retains the parent
and created-file identities, stops and reaps its child processes, and removes
only its own unchanged fixture entries. This is CI fixture custody, not evidence
of an installed or running Precision generation.

### Hosted fixture isolation

The hosted workflow explicitly selects `--isolate-production-fixture`. Some
runner images expose a group/world-writable `/opt`; the fixture must still
exercise the production requirement for root custody. Only the generated
production driver enters a private mount and PID namespace with a fresh `/proc`.
Its exact, digest-bound input bundle is staged under `/tmp`, while the ordinary
proof, source checkout, materializer, and synthetic cases remain outside.

The driver checks the original `/` custody, physical `/opt` and `/home`
directories, and absence of every reserved fixture target before it mounts
fresh, bounded tmpfs filesystems at `/opt` and `/home` in its private view. Both
new roots have UID/GID 0 and mode `0755`; `/opt` permits the real launcher to
execute. The production paths, C source, frozen child, UID/GID checks, and
parent-process validation remain unchanged. No user or hostname namespace is
created. The driver verifies changed mount/PID namespaces and an unchanged user
namespace against the manifest-bound caller identities.

The fixture does not change the ownership or permissions of the runner's
underlying directories. It rechecks their original identity, ownership, mode,
link count, size, and mtime/ctime, along with the caller's namespace identities,
after the helper returns. The private mounts isolate the fixed fixture roots;
inherited filesystems such as `/usr` and `/tmp` are not a complete container or
filesystem sandbox.

Normal completion requires owned-entry cleanup, process reaping, descriptor
closure, and successful unmounting of the two fixture filesystems before GREEN.
The driver retains its 180-second deadline, with a root-owned 210-second hard
timeout around `unshare` inside the outer 240-second proof deadline. PID-namespace
teardown bounds surviving descendants if its init driver is killed. A timeout
or failed cleanup remains HOLD and cannot produce overall GREEN. A handled
timeout can still report successful cleanup if cleanup actually completed.

Namespace mode requires the kernel capabilities needed to create and mount
those namespaces. It has no fallback that changes shared anchors or relaxes
custody. The default direct fixture mode remains available for an already
qualified disposable environment; its intentional create/remove operations can
change `/opt` and `/home` directory timestamps. Neither mode supplies Precision
host evidence or exercises create-only production publication.

## Adversarial proof

The V2 proof preserves the V1 root-fixture/race suite and additionally requires
all of these before any child is created:

- missing `--expected-head` rejected;
- uppercase HEAD rejected;
- short HEAD rejected.

For an accepted lowercase HEAD, the fixture requires:

- child argv `--expected-head` equals the exact caller value;
- private parent-proof `expected_head` equals the exact caller value.

Existing installer-path replacement, native-path replacement, Python
substitution, arbitrary stdin, wrong confirmation, abnormal apply child,
`LD_PRELOAD`, and hostile Python-environment controls remain exercised.

## Source generation

V2 source Git blob:

`86dc09e52402c04fb6e4b30a7fcf695833808ca3`

V2 source SHA-256:

`46dc71674c115d20e43e56217eeb9f6e9486d143a601cc94347f031b42f827c3`

The workflow pins the exact adversarial proof and this document by Git blob.

Protected Python installer dependency:

`ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py`

Git blob:

`f3d6b1559be7490303cf36338c4bfa38fdaa390a`

Other unchanged production-child inputs:

| Input | Git blob |
| --- | --- |
| Native candidate lock V3 | `5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1` |
| Live binder source V2 | `9c29eb4716077e459b9154f39d0f30cf2e56729f` |
| Historical launcher C1 | `5f1195d0c0a328be4334ad5b7f6e32b150776cab` |

## Lifecycle

This PR establishes source behavior only.

Required later gates remain versioned and separate:

1. reproducible V2 launcher candidate;
2. canonical post-merge candidate acceptance lock;
3. matching V2 launcher materializer;
4. create-only protected installation generation;
5. read-only installed qualification;
6. non-executing current-head plan;
7. separately authorized privileged execution.

No V1 candidate/lock is automatically promoted to V2.

## Authority

Always false for this source gate:

```text
candidate_accepted=false
precision_install_authorized=false
protected_install_authorized=false
precision_installer_apply_performed=false
credential_content_access=false
private_key_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

CI uses ephemeral root-owned fixtures to exercise the privileged authentication
boundary. The actual runtime child is exercised as described above; separate
synthetic children retain the race and abnormal-termination coverage. Fixture
writes and the no-publication apply exercise grant no Precision authority.

**PROTECT THE CORE.**
