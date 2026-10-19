# Apollyon training-start consumption directory custody candidate v1

Marker: `VOID_APOLLYON_TRAINING_START_CONSUMPTION_DIRECTORY_CUSTODY_CANDIDATE_V1`

Status: **disposable fixture-only, read-only source and test precursor**.
This is **not** a Xiphos protected-store revalidator or an installed-host
qualification. It cannot return or transfer a writer directory FD.

## Why this gate exists

The flattened [protected consumption writer](../../tools/apollyon-training-start-consumption-protected-writer-v1.mjs)
accepts a caller-retained directory FD. Its exact
[revalidation request](../../tools/apollyon-training-start-store-revalidation-request-v1.mjs)
requires a future privileged revalidator to establish that the FD originated
from the fixed claim-state root and belongs to the same store generation as
the terminal/claim/authorization winner. Passing the writer's create-once
tests alone does not prove those facts.

This precursor deliberately tests **one narrow prerequisite**: whether
descriptor-relative traversal can verify that a synthetic directory tree
remains the same visible inode generation while all descriptors are held.

The fixed, non-configurable *future host* identities are:

- root: `/var/lib/void-apollyon-attempt-claim-v2`
- child: `training-start-consumption-v1`

The source refuses the fixed production root and any descendant as fixture
inputs. The executable `--live-read` flag **always exits HOLD before opening
any host file**. There is no `--apply`, writer invocation, service launch,
privileged credential read, or training action.

## Bounded disposable observation

`observe_fixture_only(root_path, uid, gid, trusted_ancestors=False)` requires
Linux, a non-root current effective UID/GID, and an exact absolute nonproduction
path. It opens directories relative to retained FDs with
`O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK`. Every pathname component is
checked before and after open; the final synthetic claim root and derived
consumption directory must have owner/group equal to the current process,
mode **0700**, ordinary directory type and no extended POSIX access ACL.

The source rereads both retained inode identities and visible names before
emitting a *synthetic fixture receipt*. Its descriptor custody is explicitly
single-owner: a rejected child is closed before propagating HOLD; a validated
child transfers ownership before the previous parent close; the final reader
closes both owned FDs once. An indeterminate close returns a distinct HOLD,
never a positive observation. Optional trusted-ancestor checks require
root-owned, non-group/other-writable ancestors and absent extended ACLs.

The fixture receipt may set only
`fixture_descriptor_stable=true` and
`fixture_visible_generation_stable=true`. All real-host claims remain false:

```text
fixture_only=true
protected_store_origin_proven=false
current_store_generation_revalidation_performed=false
generation_lineage_revalidation_performed=false
authorization_winner_reread_performed=false
durable_claim_record_reread_performed=false
consumption_slot_classification_performed=false
writer_directory_capability_origin_proven=false
writer_invocation_authorized=false
consumption_publication_authorized=false
trainer_release_authorized=false
training_execution_authorized=false
credential_access=false
signing=false
transaction=false
funds_movement=false
```

Importantly, no verified **production** directory FD leaves this module.
The receipt is therefore not sufficient input to the writer or release gate.

## Disposable adversarial qualification

The focused proof runs under a trusted fixed `python3 -I -B` interpreter.
It covers:

- private 0700 directories and stable descriptor/visible inode generation;
- wrong root or child mode, wrong caller identity, world-writable ancestors;
- symlinked root/child and injected extended POSIX ACL;
- swapping the child pathname immediately after its descriptor opens;
- repeated rejected roots without leaking descriptors;
- synthetic EIO **after** a real child close, requiring uncertainty HOLD and
  unchanged FD census;
- a non-isolated checkout-local `json.py` adversary; and
- unconditionally refused CLI `--live-read`, including the fixed real path.

An early Python flags guard cannot protect code that the Python interpreter
might execute *before* entering the script (e.g. site startup customization).
Any future privileged launcher must separately enforce fixed trusted Python
provenance and isolated startup. A test green result is not installation
approval.

## Required next engineering gates

The real Xiphos revalidator must separately establish claim-service-only
writer provenance, the exact current store-generation record and authenticated
lineage, the exact protected authorization winner, terminal/custody/claim
record bytes, and an unchanged visible directory generation up to and through
the atomic writer mutation boundary. The current module performs none of
those host checks and issues no ability to consume a training-start slot.

Current dependencies pinned by the disposable proof:

- protected writer Git blob:
  `66b76ea9201f870672c0bc1c3df207b3c95cf68a`
- fixed protected-store request Git blob:
  `051209be6307f9b0784aa6c428f0c4d5b202b7f9`

No installed Xiphos state, service, private key, wallet, transaction,
funds movement or trainer start is requested or permitted.

**PROTECT THE CORE.**


## Current close-hardened writer generation

The fixture is now pinned to protected writer
`66b76ea9201f870672c0bc1c3df207b3c95cf68a` and revalidation-request source
`051209be6307f9b0784aa6c428f0c4d5b202b7f9`.

Those parent sources classify terminal created-record and owned-directory close
uncertainty after a durable publication. This fixture still does not call the
writer and still cannot prove production directory origin; the pin only ensures
that any future protected-host bridge is built on the current close-hardened
source generation.

## Fixture namespace guard (October 19)

The source-only library function is importable, so disabling the CLI's
`--live-read` option is **not sufficient** to ensure that callers cannot
inspect arbitrary host paths. Before this repair, any absolute root outside
the single forbidden production-root prefix passed lexical admission and
could reach retained-FD traversal if its directory metadata matched.
The receipt still said `fixture_only=true`, which overstated the path
admission boundary.

`root_fixture_path()` now permits only synthetic disposable roots under
`/tmp/apollyon-*/<fixture-root>`. This lexical requirement is enforced
**before the first open or stat**, and the fixed production root remains
denied separately. The proof injects a handler that rejects any host FD open,
then checks unrelated private roots in `/var/tmp`, `/tmp`, `/home` and
`/opt` all return `fixture_root_outside_disposable_namespace` without
entering traversal. Ordinary positive and adversarial disposable fixtures
retain their descriptor checks and negative authority.

A test-like pathname is **not** cryptographic or mount-namespace proof that
a path is synthetic. A privileged bind mount could still defeat purely
lexical scoping. Consequently this defense is strictly a source-level
restriction on the fixture API, not a future installed Xiphos reader, and no
writer directory descriptor is ever returned. The CLI `--live-read` remains
unconditionally disabled. Protected origin, current generation, winner,
claim, terminal, consumption, release, training, credentials and funds
authority all remain false/unperformed.

**PROTECT THE CORE.**
