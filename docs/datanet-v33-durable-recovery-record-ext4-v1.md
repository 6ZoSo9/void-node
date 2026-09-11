# DataNet V33 durable recovery authorization record — ext4 v1

## Controlling semantic

This focused source/proof lane implements the durable recovery-authorization rule selected by live coordination #1301 V650 and Ren #1352 review #5179203370.

The selected rule is intentionally not the earlier state-derived `S0-only => AUTHORIZE_H1` experiment. Ordinary H0 completion does **not** authorize S1. H1 exists only as one bounded recovery successor from explicit durable local authority exact-coupled to root, K and the verified S0 inode generation.

Draft #1492 remains support evidence for the ext4 generation primitive and retained-FD custody. Its S0-only reducer is not the current recovery-authorization rule.

## One bounded logical record

For one `(root_identity, K, S0 generation)` the implementation admits at most three fixed create-only marker names:

- `ARMED` — the recovery window exists;
- `CLAIMED` — the single H1 attempt has been consumed before H1 allocation;
- `CLOSED` — terminal reason is exactly `ORDINARY_H0` or `RECOVERY_H1`.

Every marker is canonical ASCII JSON, source-bound, created with `O_CREAT|O_EXCL` relative to the retained root directory FD, file-fsynced, parent-directory-fsynced and reread through a non-following FD. The implementation contains no marker delete, overwrite, rename-over or reset path.

`ARMED` binds exact root identity, K, S0 device/inode identity, ext4 inode generation, length, SHA-256, record source SHA-256, generation-module SHA-256 and schema identity.

`CLAIMED` binds the exact `ARMED` digest. Creating it also creates one process-local claimant capability. That capability is never serialized into durable state, is bound to the creating PID/root/K/lock/ARMED/CLAIMED tuple, and is required to create `CLOSED(RECOVERY_H1)`.

`CLOSED(ORDINARY_H0)` binds the exact `ARMED` digest. `CLOSED(RECOVERY_H1)` additionally binds the exact `CLAIMED` digest plus verified S1 identity, ext4 generation, length and SHA-256.

## Four focused ext4 histories

All payload leaves are 64 MiB, fully allocated before admission and content-identical.

### Ordinary

1. create/fsync S0;
2. without `ARMED`, reducer returns `HOLD_NO_RECOVERY_AUTH`;
3. S2 is rejected before allocation;
4. full-verify S0 and durably create `ARMED`;
5. full-verify S0 and durably create `CLOSED(ORDINARY_H0)`;
6. fresh independent verification derives `HOLD_ORDINARY_H0`.

### Successful recovery

1. create/fsync S0 and durable `ARMED`;
2. a fresh recovery claimant reacquires K and derives `AUTHORIZE_CLAIM_H1` while allocation is still forbidden;
3. the claimant durably creates `CLAIMED`, receiving the process-local claimant capability;
4. only then does that same claimant create/fallocate/fsync S1;
5. the same claimant full-verifies S0/S1 and, while still holding the claimant capability, creates `CLOSED(RECOVERY_H1)`;
6. independent verification derives `COMPLETE_RECOVERY_H1` with zero new allocation authority.

The successful chronology requires one PID to create `CLAIMED`, S1 and recovery `CLOSED` in that order.

### Claimant death before S1

1. create/fsync S0 and durable `ARMED`;
2. a claimant creates durable `CLAIMED`;
3. the claimant is SIGKILLed and reaped before S1 exists;
4. a fresh reducer returns `HOLD_RECOVERY_ATTEMPT_ALREADY_CONSUMED`; S1 remains absent and no `CLOSED` marker exists.

### Claimant death after durable S1 but before recovery close

1. create/fsync S0 and durable `ARMED`;
2. a claimant creates durable `CLAIMED`;
3. that same claimant creates/fallocates/fsyncs S1;
4. the claimant is SIGKILLed and reaped before `CLOSED(RECOVERY_H1)`;
5. a fresh reducer returns `HOLD_S1_DURABLE_RECOVERY_CLOSE_INCOMPLETE` with allocation forbidden;
6. a fresh attempt to call recovery-close without the dead claimant's process-local capability fails `HOLD_RECOVERY_CLOSE_CLAIMANT_CAPABILITY_INVALID`;
7. the `CLOSED` marker remains absent permanently in this focused history.

This matches V650's rule: durable S1 makes capacity full, but a dead claimant's missing success close is evidence/HOLD and cannot be manufactured by a later supervisor.

## Focused process boundary

The proof retains exactly five role lifetimes:

- one orchestrator;
- one successful recovery claimant;
- one S1-before-close crash claimant;
- one claim-before-S1 crash claimant;
- one source-distinct final verifier.

This is specific to the focused V33 primitive and is **not** the inherited 27-lifetime V31/V32 campaign.

## Independent verifier

The final verifier does **not** import `datanet_v33_durable_recovery_record_v1.py` or call its reducer. It independently reacquires K, rereads complete S0/S1 bytes, re-observes ext4 generations, reparses canonical marker bytes and derives all four durable terminal states.

## External syscall census

The Node 22/24/26 workflow executes the proof under external `strace -f -yy` instrumentation and requires the repaired natural graph to produce exactly:

- 23 `EXT4_IOC_GETVERSION` calls;
- zero SETVERSION calls;
- six successful payload `fallocate` calls;
- four S0 and two S1 create-only payload publications;
- four `ARMED`, three `CLAIMED` and two `CLOSED` marker creations;
- 34 successful `fsync` calls;
- zero unlink/rename-family calls.

The observer additionally requires:

- successful recovery: the same claimant PID creates `CLAIMED`, S1 and `CLOSED(RECOVERY_H1)` in order;
- S1-before-close crash: one claimant PID creates `CLAIMED` then S1, and **no** `CLOSED` marker is ever created in that root;
- claim-before-S1 crash: `CLAIMED` exists and no S1 is created.

The raw syscall trace and SHA-256-bound census are retained as workflow artifacts. These exact counts are acceptance predicates only after natural hosted execution confirms them.

## Negative controls and nonclaims

The focused proof also rejects foreign-root ARMED state, stale S0 generation, noncanonical marker bytes and ordinary-close-plus-claim contradiction. Campaign, attempt, path, peer and schedule labels are not reducer inputs and cannot grant capacity.

Still open/false:

- composition into the inherited 27-lifetime V31/V32 campaign;
- hostile same-UID marker deletion/rewriting;
- deliberate same-UID ext4 generation rewriting;
- cold unmount/remount and physical power loss;
- FIEMAP retained-image provenance and full-suite byte readmission;
- public-peer retrieval;
- Chain-2050 finality/economic authority;
- deployment or production runtime activation.

Keep Draft until one unchanged head is naturally green on Node 22/24/26 for V33, broader repository CI and immutable Action refs, followed by fresh independent review.
