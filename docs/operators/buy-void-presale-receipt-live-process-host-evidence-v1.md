# Buy VOID presale authenticated receipt + live-process host evidence V1

Marker:
`VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V1`.

Status: **source/CI-only collector definition; no Precision collection has been run by this gate**.

Parent plan:

`voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab`

This gate implements only lane 1 of #3507:

`authenticated_receipt_and_live_process`.

It does not collect allocation-custody or Epoch-2 installed-generation evidence.

## Purpose

A future separately authorized Precision run can establish two facts that #3503
and #3507 deliberately leave false:

1. the existing root-custodied deployment receipt authenticates the exact source
   generation of the currently retained VOID live process;
2. the existing root-custodied live-process V2 receipt is byte-for-byte the
   receipt derived from that exact retained live-process generation.

Even a GREEN result does **not** make production source-finality authority,
payment acceptance, presale activation, WC/VOID activation, transaction
submission, treasury action, or funds movement true.

## Exact reviewed primitives

The collector is stacked on #3507 and binds these existing sources:

- deployment/source-finality verifier:
  `src/economic/buy_void_source_finality_generation_provenance_v7.ts`
  — Git blob `390ff1a2ff0437cd8c8693e7807c12275df42573`;
- live-process V2 receipt schema/binding:
  `src/economic/buy_void_source_finality_live_process_binding_v2.ts`
  — Git blob `987c97568a4d1b9814218603df48a65dbfeed18f`;
- reviewed receipt builder/source-custody helpers:
  `ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts`
  — Git blob `a334ab29477dec3e36862a512191b9701debb73e`;
- live selector collection plan:
  `ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts`
  — Git blob `d47a6f99870f385c1bc938adbef74535b78eba1f`.

The collector imports only the publisher module's in-memory receipt builder and
source-custody requalification helper. It does **not** import its create/replace,
retire, rollback, or publication functions.

## Future host collection sequence

A future `--run` requires root because the reviewed selector collection
primitive itself requires root and retained pidfd/process inspection.

Inputs:

```text
--run --runtime-uid <exact live runtime uid> --runtime-gid <exact live runtime gid>
```

The collector performs this sequence:

1. start one reviewed installed selector session and retain its manager/service
   pidfds from READY through the complete validation interval;
2. observe the READY generation and require exact systemd/MainPID/source
   identity, then verify the fixed deployment receipt against that source;
3. requalify reviewed live source custody through fixed
   `/usr/bin/setpriv --clear-groups --no-new-privs` without reading the service
   environment;
4. derive, in memory, the exact V2 live-process binding receipt and
   descriptor-read the installed canonical receipt through retained/root-owned
   ancestor custody;
5. require exact receipt bytes and stable systemd/source identity while the
   selector session is still holding the same pidfds;
6. retain a no-follow descriptor plus root-owned ancestor descriptors for the
   canonical deployment receipt across the complete validation interval;
7. perform the **final canonical live-process receipt reread while both the
   selector pidfds and deployment-receipt descriptor lease remain active**;
8. semantically reverify the deployment receipt against the final observed
   source generation and require its content-addressed receipt ID to equal the
   initial deployment receipt ID;
9. send selector `VERIFY`, require GREEN, and require GREEN to match both READY
   and the final observed generation;
10. after GREEN, revalidate the same retained deployment-receipt descriptor,
    bytes, and canonical namespace one final time; and
11. return the report without any later host-sensitive read.

The terminal selector GREEN overlaps the retained deployment-receipt lease:
deployment semantics are reverified before GREEN, then the identical retained
and canonical deployment receipt bytes/inode are revalidated after GREEN.
Service-generation drift or root-maintenance replacement during the interval
must therefore HOLD instead of being reported as current.

Any source/process/receipt generation drift causes HOLD.

## Deliberate process execution

This collector is read-only with respect to persistent host state, but it is
**not metadata-only**.

A future authorized host run executes:
- one reviewed selector session retained across the complete validation interval;
- the reviewed source-custody requalification child as required by the
  credential-free source observations.

The report therefore states:

```text
selector_process_execution_performed=true
source_custody_process_execution_performed=true
filesystem_read_performed=true
filesystem_write_performed=false
network_contact_performed=false
receipt_publication_performed=false
receipt_retirement_performed=false
service_mutation_performed=false
```

The existing VOID service is observed, not restarted or mutated.

## Why the service self-verifier is not called

`verifyBuyVoidSourceFinalityLiveProcessBindingV2()` intentionally binds the
receipt to the **calling process**. Calling it from an external host collector
would compare the service receipt to the collector process and would be the
wrong authority model.

Instead this collector independently derives the canonical expected receipt from
the retained service generation and requires the installed root-custodied
receipt file to be byte-identical to it.

## GREEN report

A GREEN report may set only this lane's evidence:

```text
authenticated_receipt_verified=true
source_custody_requalified=true
selector_generation_verified=true
same_live_process_binding_verified=true
installed_live_process_receipt_exact_bytes_match=true
receipt_ancestor_custody_revalidated=true
pre_post_live_generation_stable=true
final_post_validation_generation_revalidated=true
```

It must still keep:

```text
filesystem_write_performed=false
network_contact_performed=false
receipt_publication_performed=false
service_mutation_performed=false
credential_access=false
wallet_or_signer_access=false
signing=false
transaction_submission=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_or_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

## CI boundary

Hosted CI:
- binds the exact #3507 parent plan and four reviewed primitive blobs;
- typechecks the repository;
- runs adversarial/source proof;
- runs collector `--self-test`;
- does **not** run collector `--run`;
- does not inspect a hosted fake service as production evidence.

The real Precision collection remains separately authorized.

**PROTECT THE CORE.**

## Canonical receipt namespace revalidation

Retained ancestor directory descriptors are necessary but not sufficient: a
root-level rename/replacement can leave those old descriptors stable while the
canonical receipt pathname resolves through a different directory generation.

After the receipt read, the collector therefore performs two independent checks
for every receipt ancestor:

1. the retained descriptor must still match its authenticated dev/inode/uid
   and exact permission/special-mode bits (`07777`);
2. the original canonical ancestor pathname is lstat'ed, reopened with
   `O_DIRECTORY|O_NOFOLLOW`, fstat'ed, and lstat'ed again; all three
   observations must match the retained generation and remain root-owned and
   non-group/world-writable.

The canonical revalidation traversal is deliberately **root-to-leaf** even
though descriptor acquisition is leaf-to-root. The receipt's immediate parent,
`/var/lib/void-source-finality-v7`, is therefore revalidated last. A concurrent
rename/replacement after an earlier root check cannot be hidden by spending the
remainder of the validation interval walking less-specific ancestors.

A missing path, symlink/type change, uid/mode drift, setuid/setgid/sticky-bit
drift, or canonical inode replacement causes HOLD even when the old retained
descriptor is unchanged. Hosted proof includes retained and before/open/after
canonical adversaries for ordinary permission bits plus special mode bits.

No host write, receipt publication, service mutation, payment, signing,
transaction, activation, treasury, or funds authority is added.


## Exact receipt leaf mode

The installed live-process receipt itself is held to the same fail-closed custody
standard as its ancestor chain. Its initial retained-parent-relative observation
requires root:root ownership, one link, regular non-symlink type, exact expected
size, and exact permission-plus-special bits:

`(mode & 07777) == 00444`.

Setuid, setgid, or sticky bits on the receipt leaf are therefore rejected even
when ordinary permission bits remain `0444`. The focused adversarial proof
exercises `04444`, `02444`, and `01444` negatives through the exact
predicate used by production.

## Final canonical receipt leaf revalidation

Ancestor revalidation closes directory-generation drift only up to the receipt
parent. A concurrent root replacement of the receipt leaf itself does not change
the parent directory's dev/inode/uid/mode identity, so the receipt leaf is now
revalidated **after** the root-to-leaf ancestor walk has completed.

The collector reopens the absolute canonical receipt pathname with
`O_RDONLY|O_NOFOLLOW`, requires that the canonical leaf still has the exact
retained receipt dev/inode/uid/gid/mode/nlink/size/mtime/ctime generation,
descriptor-reads the canonical leaf again, and requires those bytes to equal the
already derived expected receipt. A final descriptor/path observation must still
match that same retained generation.

This is deliberately the last namespace-custody check before accepting the
receipt bytes. Hosted proof models a leaf replacement after parent revalidation
by changing only the canonical leaf inode and requires HOLD; ctime, mode,
special-mode, size, and symlink/type drift are rejected as well.

No host write, receipt publication, service mutation, payment, signing,
transaction, activation, treasury, or funds authority is added.

## Exact filesystem-generation identity

Receipt leaf and ancestor identity uses BigInt stat observations end to end.
`dev`, `ino`, `uid`, `gid`, `mode`, `nlink`, `size`,
`mtimeNs`, and `ctimeNs` are compared without floating-point conversion.
Only the already bounded receipt length (`<= 64 KiB`) is converted at the
Buffer-read boundary.

Hosted adversaries reject adjacent inode values above `2^53-1` and
one-nanosecond mtime/ctime changes.

## Credential-free retained live-generation verification

The current collector no longer executes the historical JavaScript collection
plan that reads `/proc/<pid>/environ`. The reviewed launcher exports
`NODE_PRIVKEY_PATH`, so consuming that kernel file would be credential-bearing
even if the secret value were not printed.

Instead, the collector authenticates and drives the reviewed native selector
directly. One selector session retains manager and service pidfds from READY
through every source, systemd, deployment-receipt and installed-receipt check;
only then does the collector send `VERIFY` and require GREEN for the identical
manager/service generation.

Live facts are obtained without process environment access:

- `MainPID`, `InvocationID`, and working directory use read-only
  `systemctl --user show` over the root-owned runtime bus;
- process `stat`, `status`, `cgroup`, `cmdline`, `exe`, and `cwd`
  are bounded, descriptor-read kernel observations;
- source commit/tree/main are derived from the exact reviewed launcher argv and
  requalified against the clean root-custodied observed checkout; the collector
  does not invent an `/opt/.../releases/<commit>` location that the launcher
  never promised;
- source-custody requalification drops to the runtime UID/GID through fixed
  `/usr/bin/setpriv --clear-groups --no-new-privs`, matching the reviewed
  publisher contract;
- the expected canonical-producer `NODE_OPTIONS` digest is derived from the
  reviewed `src/index.ts` generation and guard mapping, not read from
  `environ`;
- launch-time loader-variable absence and canonical-role fields remain
  authenticated fields of the exact root-custodied, content-addressed V2
  live-process receipt.

The report truth is therefore:

```text
process_environment_read_performed=false
systemd_metadata_query_performed=true
launch_environment_fields_receipt_attested=true
credential_access=false
```

The collector performs no receipt publication, filesystem write, service
mutation, network contact, wallet/signer access, payment acceptance,
transaction, presale/WC activation, treasury/liquidity action, or funds
movement.

## Exact filesystem-generation identity

Receipt leaf and ancestor generation checks use BigInt stat observations end to
end. `dev`, `ino`, `uid`, `gid`, `mode`, `nlink`, `size`,
`mtimeNs`, and `ctimeNs` are compared without floating-point conversion.
Only the bounded receipt byte length (at most 64 KiB) is converted at the
Buffer-read boundary.

Hosted adversaries reject adjacent inode values above `2^53-1` and
one-nanosecond mtime/ctime drift.

## Retained-byte semantic deployment verification

The final source generation removes the independent deployment-receipt pathname
verifier from this collector. The root-custodied deployment receipt is opened
once into the retained no-follow descriptor lease. Both the initial and final
deployment decisions parse and classify **only `deploymentLease.bytes`** with
the reviewed pure V7 classifier and the exact reviewed-source digest/count.

The existing retained descriptor + root-owned ancestor lease still requires the
canonical pathname to remain the same inode/generation and the canonical bytes
to remain byte-identical before, during, and after selector verification. A
temporary pathname replacement therefore cannot be semantically authenticated
while a different receipt remains leased.

The collector does not call
`verifyBuyVoidSourceFinalityDeploymentReceiptV7`; no semantic decision reopens
the deployment receipt pathname.

All read-only/no-credential/no-write and false economic authority boundaries are
unchanged.

## Descriptor-executed selector generation

The installed native selector is no longer hashed and then reopened by pathname.
The collector opens the reviewed root-custodied selector once with
`O_RDONLY|O_NOFOLLOW|O_CLOEXEC`, requires the exact accepted size and SHA-256
on that retained descriptor, and records the full bigint inode/stat generation.

The selector child receives that retained descriptor as child FD 3 and is
started as `/proc/self/fd/3`. The parent waits for successful spawn, then
revalidates both the retained descriptor and the canonical installed pathname
against the authenticated generation before closing its copy. Atomic pathname
replacement therefore cannot substitute a different compatible selector between
hashing and execution.

Hosted proof opens a temporary copy of `/bin/true`, atomically replaces its
pathname with `/bin/false`, and requires descriptor execution through child
FD 3 to retain the original successful generation while pathname execution sees
the replacement.

No selector semantics, credential access, host mutation, payment, signing,
transaction, activation, treasury or funds authority is added.

