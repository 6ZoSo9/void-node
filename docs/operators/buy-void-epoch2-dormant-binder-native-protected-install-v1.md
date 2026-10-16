# Buy VOID Epoch-2 dormant binder native protected install V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V1`.

Status: **source-only create-only installer; no Precision installation is
authorized by this PR**.

## Accepted generation

The installer consumes only the accepted dormant-binder V2 lock:

`voidbuye2dormantbinderlock2_34df85425460aa9fc5192cee326de4b711deefbcb195dc6b7b6c3ebd23eb5597`.

Accepted native candidate:
- candidate ID
  `voidbuye2dormantbindercand2_342712bbfdc6c999ca3c4bb132b02531df94356ffd1e5bb0b21d40c8f82d33ce`;
- bytes: `726976`;
- SHA-256:
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`.

Accepted binder source:
- Git blob:
  `9c29eb4716077e459b9154f39d0f30cf2e56729f`;
- bytes: `39391`;
- SHA-256:
  `afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e`.

The binder bytes are obtained from the exact expected Git head through the
runtime UID's fixed `/usr/bin/git` process and are never accepted from an
arbitrary caller path.

## Fixed protected root

The only install root is:

`/opt/void-buy-void-epoch2-dormant-v3r-binding-v2`.

It contains exactly two files:

1. `void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2`
   - root:root;
   - mode `0555`;
   - exact accepted native bytes.

2. `void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs`
   - root:root;
   - mode `0444`;
   - exact reviewed binder Git-object bytes.

The staging directory is fixed at:

`/opt/.void-buy-void-epoch2-dormant-v3r-binding-v2.stage`.

Unknown, partial, symlinked, extra-entry, wrong-owner, wrong-mode or
wrong-digest states fail closed.

## Create-only publication

Apply is create-only:

1. exact human confirmation is checked before candidate, checkout or protected
   filesystem access;
2. isolated Python and a clean loader environment are required;
3. live apply rejects mutable worktree execution and requires Python stdin
   entry, intended to be the reviewed installer Git object;
4. expected current-main head/branch/clean checkout is verified via
   runtime-UID Git;
5. accepted lock, native candidate and binder source are verified;
6. an absent fixed staging root is created root:root mode 0755;
7. native and binder are created exclusively, fsynced and verified;
8. the complete staging root is verified;
9. `renameat2(RENAME_NOREPLACE)` publishes the complete directory;
10. the parent is fsynced and the final root is reverified.

No overwrite, exchange, final-root unlink or final-root rmdir path exists.

## Truthful failure boundary

Before publication, a failed staging operation may clean up only the known
staging root and reports:

`publication_state=not_published`.

Once `RENAME_NOREPLACE` succeeds, later parent-fsync, final-readback or close
failures may **not** claim that installation did not occur. They report:

`publication_state=published_needs_inspection`.

This preserves the failure-truth rule established by the credential-query
installer repair.

## Authority boundary

The installer never executes either installed file.

Even a successful future apply keeps:

```text
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

## Future operator sequence

A future read-only plan may use the accepted hosted candidate binary and current
main. The create-only apply remains a separate explicit authorization.

The intended privileged apply form is Git-object stdin, for example:

```bash
head=$(/usr/bin/git -C /home/zoso/dev/void-node rev-parse --verify HEAD)
/usr/bin/git -C /home/zoso/dev/void-node show   "${head}:ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v1.py" |
sudo env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C   /usr/bin/python3 -I -B -     --apply     --native /absolute/path/to/accepted/native-preentry-v2     --expected-head "$head"     --confirm INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V2_CREATE_ONLY
```

That operation is **not authorized by this PR**.

Next gate after an exact GREEN install:

`EPOCH2_DORMANT_BINDER_INSTALLED_READ_ONLY_QUALIFICATION_V1`.

PROTECT THE CORE.
