# Buy VOID custody high-water transition fence store v1

## Status

Source/proof only. Unmounted. No production high-water write, reserve/recover,
service install, UID/socket change, payment mutation, signing, chain mutation or
funds movement is authorized or performed.

This candidate is stacked on the permanent transition-fence planner staged after
#2691. It persists only the **fence record**, never the high-water itself.

## Why a permanent store

The removable-lock negative proof shows that a release can become uncertain
after pathname removal but before final parent-directory fsync. The permanent
transition-fence model avoids that lifecycle entirely.

A future custody service needs one durable create-only record for each prior
high-water slot. Once present, the slot is never deleted or automatically
reaped.

The store therefore has only two successful outcomes:

- `created` — exact expected transition record was created, file-fsynced and the
  retained private root directory was fsynced;
- `exists_same_transition` — an existing permanent slot was descriptor-read and
  matched the exact expected record bytes.

A different successor for the same prior state maps to the same filename and
must HOLD.

## Private-root boundary

`src/economic/buy_void_custody_high_water_transition_fence_store_v1.mjs`
accepts an absolute root only as a future server-selected configuration value.

The source:

- requires Linux `O_DIRECTORY` and `O_NOFOLLOW`;
- walks the absolute path from retained directory descriptors through
  `/proc/self/fd`;
- rejects symlink ancestors and identity rebinding;
- permits root-owned sticky shared ancestors such as `/tmp` only for synthetic
  testing, while the final root must be owned by the current **nonroot** UID;
- requires the final root mode to be exactly `0700`, including no special bits;
- derives the record filename only from the validated
  `voidchwf1_<sha256>` slot ID;
- creates the record with `O_CREAT|O_EXCL|O_NOFOLLOW`, mode `0600`;
- writes the complete expected bytes, fsyncs the file, fsyncs the retained root,
  and reopens/revalidates the record;
- existing records must be regular, owner-private, single-link, bounded,
  descriptor-stable and parse as an exact transition fence.

The source contains no unlink, rmdir or rename path.

## Partial-create policy

A process or power failure after `O_EXCL` creation but before complete durable
publication can leave an empty or partial permanent slot. This source
**deliberately does not clean it up**.

That is an availability HOLD, not permission to infer success or to retry with a
different successor.

Policy remains:

- `partial_create_automatic_cleanup=false`;
- `partial_create_requires_external_recovery=true`;
- `stale_record_automatic_reap=false`;
- `record_deletion_allowed=false`.

A later privileged recovery design must qualify any manual repair/fencing
authority separately. This Draft provides no such authority.

## Synthetic proof

`scripts/prove_buy_void_custody_high_water_transition_fence_store_v1.mjs`
uses only brand-new OS temporary private directories.

It proves:

1. exact transition/store source blobs are pinned;
2. first publication returns `created` and persists exact mode-0600 bytes;
3. exact replay returns `exists_same_transition` without a second write;
4. a different successor from the same prior slot is rejected and cannot alter
   the winner;
5. a malformed pre-existing permanent slot is retained and fails closed;
6. a symlink occupying the slot is rejected and not cleaned up;
7. non-0700 private roots fail;
8. a symlink root fails;
9. two independent Node processes race different successors against the same
   slot and exactly one wins the `O_EXCL` publication.

The proof itself removes only its own disposable test fixtures after assertions.
The production module has no deletion API.

## Remaining production gates

This still is not the complete high-water writer.

A future custody-service successor must independently:

- select the actual server-owned transition-fence and high-water roots;
- qualify installed UID/GID and root-owned ancestor permissions;
- authenticate the IPC caller;
- descriptor-bind the current signed launch journal/receipt/high-water;
- create or verify the permanent transition fence;
- recover only the exact successor bytes stored in that fence;
- execute the separately reviewed atomic high-water staged-write/fsync/rename/
  dir-fsync protocol;
- qualify crash/power-loss behavior and partial-fence recovery authority;
- bind original buyer/payment, duplicate/capacity and allocation lineage; and
- only then consider reserve/recover or authenticated POST integration.

All remain false here:

`trusted_server_path_selection_verified=false`,
`high_water_write_performed=false`,
`service_mounted=false`,
`custody_reserve_method_enabled=false`,
`custody_recover_method_enabled=false`,
`production_allocation_mutation_ready=false`,
`funds_moved=false`.

**PROTECT THE CORE.**
