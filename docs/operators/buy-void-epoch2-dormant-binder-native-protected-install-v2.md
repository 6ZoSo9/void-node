# Buy VOID Epoch-2 dormant binder protected installer V2

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2`.

Status: **source/CI-only create-only installer; no Precision apply is authorized**.

## Purpose

V2 replaces the superseded V1 installer lane after #3363 changed the
content-addressed dormant-binder candidate evidence generation.

V2 consumes only accepted lock V3:

`voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a`.

It explicitly requires:
- post-#3363 candidate ID
  `voidbuye2dormantbindercand2_8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d`;
- verified-helper execution bound;
- `executed_from_verified_bytes=true`;
- `mutable_path_import=false`;
- both pre-#3363 V2 locks recorded as superseded;
- `superseded_pre_3363_locks_install_authority=false`.

The native ELF bytes remain:
- 726,976 bytes;
- SHA-256
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`.

The binder source remains:
- Git blob `9c29eb4716077e459b9154f39d0f30cf2e56729f`;
- 39,391 bytes;
- SHA-256
  `afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e`.

## Fixed protected root

`/opt/void-buy-void-epoch2-dormant-v3r-binding-v2`

contains exactly:
- native preentry: root:root mode 0555;
- binder JavaScript: root:root mode 0444.

The path is unchanged because the superseded installer never became canonical
install authority and no V1 apply is authorized by this source lane.

## Create-only publication

The installer first creates a content-addressed read-only plan. Future apply must supply the exact `plan_id`, binding expected head, accepted V3 lock, candidate bytes, binder Git object, protected state and non-authority contract.

The installer:
1. requires explicit confirmation
   `INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY`;
2. requires isolated Python and rejects loader/Python injection variables;
3. rejects direct mutable-worktree apply;
4. requires the authenticated native first-entry marker plus inherited installer,
   native-candidate and private parent-proof file descriptors for privileged
   apply;
5. consumes the one-shot parent proof and binds real parent PID/start ticks,
   fixed launcher device/inode, executing installer FD, retained native FD and
   running Python device/inode to the launcher-authenticated generation;
6. verifies that its executing script path and `--native` argument correspond
   exactly to those inherited descriptors;
7. verifies exact current-main checkout through fixed runtime-user Git;
8. validates accepted V3 lock from the exact expected Git head;
9. verifies the retained native-candidate descriptor by exact bytes/SHA-256;
10. obtains binder bytes from the exact expected Git object;
11. requires the exact operation-bound plan ID before host mutation;
12. immediately before the first staging mutation revalidates the live
    first-entry parent/Python generation;
13. creates a private staging root and writes/verifies exact root-owned files;
14. immediately before publication revalidates clean expected checkout, accepted
    V3 lock, retained native-candidate descriptor, binder Git-object bytes and
    the same live first-entry parent/Python generation;
15. publishes exactly once with `renameat2(RENAME_NOREPLACE)`;
16. fsyncs the parent and verifies final state.

The first-entry parent separately retains and revalidates the visible installer
and native-candidate generations after the child exits. Visible pathname drift
therefore cannot redirect bytes consumed by this installer and still produce a
trusted parent GREEN receipt.

No overwrite/exchange/final-root unlink path exists.

## Failure truth

Before publication, an incomplete private stage may be cleaned.

After publication begins, parent-fsync, final-readback, or close failures are
reported as published-needs-inspection. The installer never reports
`protected_install_performed=false` after the final root may already exist.

There is deliberately **no post-publication rollback**. Once the final root has
been published, the installer does not rename or remove it automatically; an
ambiguous post-publication failure requires inspection.

## Hosted proof

The focused proof:
- binds exact V3 lock and V2 installer source;
- executes the actual V3 lock parser in a CI fixture;
- requires verified-helper execution evidence;
- runs installer self-test and inert source-plan;
- proves content-addressed plan-ID determinism and plan-ID validation before host access;
- proves candidate/binder/checkout revalidation immediately before publication;
- proves exactly one final-root publish call and no post-publication rollback;
- proves missing confirmation fails before host/candidate access;
- proves direct mutable-worktree apply is rejected;
- proves privileged apply requires the authenticated first-entry inherited-FD
  and private parent-proof contract rather than caller-selected stdin, a
  reopened native pathname, or caller-forged marker/FD state;
- requires fixed native-parent and running-Python generation checks before the
  first mutation and again before publication;
- supplies a forged direct-parent proof shape and requires fail-closed rejection;
- verifies create-only publication structure and non-authority markers.

Hosted CI performs no protected install and no native/binder execution.

## Authority boundary

Source/CI only:

```text
protected_install_authorized=false
native_execution=false
binder_execution=false
service_mutation=false
systemd_mutation=false
credential_access=false
private_key_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
funds_movement=false
production_host_evidence_authority=false
```

A future apply remains separately authorized.

Next gate after a future exact GREEN install:

`EPOCH2_DORMANT_BINDER_INSTALLED_READ_ONLY_QUALIFICATION_V2`.

PROTECT THE CORE.
