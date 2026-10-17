# Buy VOID Epoch-2 dormant-binder installer first entry V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V2`.

Status: **source/test/CI only; no candidate acceptance, installation, or live authority**.

## Purpose

V1 first-entry launcher is securely content-bound, but its accepted binary is
compile-bound to repository HEAD
`9eebcd1bb15ea0b853c3c7cfe0ffd8dd60030a30`.

That makes the launcher authority self-expiring as `main` advances. V2 fixes
only that lifecycle defect while preserving V1's native-first privileged
boundary.

V1 remains historical and unchanged.

## Versioned production namespace

Default V2 root:

`/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v2`

Default V2 executable:

`/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v2/bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v2`

Policy schema:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V2`

The existing Python child protocol remains V1. This is deliberate compatibility,
not stale launcher authority:

- environment protocol value:
  `VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1`;
- parent-proof schema:
  `VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_PARENT_PROOF_V1`.

The current protected Python installer blob
`f3d6b1559be7490303cf36338c4bfa38fdaa390a` authenticates those exact wire
values.

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
descriptor-sealed Python child for both plan and apply.

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

`e3fc712709c8c3b56fbe1f7b2dc0d20ba0860dc5`

V2 adversarial proof Git blob:

`f2d6b6d1e638695ac66570d7c7a10aaf05afe08c`

Protected Python installer dependency:

`ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py`

Git blob:

`f3d6b1559be7490303cf36338c4bfa38fdaa390a`

## Lifecycle

This PR establishes source behavior only.

Required later gates remain versioned and separate:

1. reproducible V2 launcher candidate;
2. canonical post-merge candidate acceptance lock;
3. V2 launcher materializer;
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
installer_apply_performed=false
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

CI may use an ephemeral root-owned synthetic fixture solely to exercise the
privileged authentication boundary. It grants no Precision authority.

**PROTECT THE CORE.**
