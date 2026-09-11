# DataNet V33 durable recovery authorization record — ext4 v1

## Controlling semantic

This focused source/proof lane implements the durable recovery-authorization rule selected by live coordination #1301 V650 and Ren #1352 review #5179203370.

The selected rule is intentionally not the earlier state-derived `S0-only => AUTHORIZE_H1` experiment. Ordinary H0 completion does **not** authorize S1. H1 exists only as one bounded recovery successor from explicit durable local authority exact-coupled to root, K and the verified S0 inode generation.

Draft #1492 remains useful support evidence for the ext4 generation primitive and retained-FD custody. Its S0-only reducer is not treated as the current recovery-authorization rule.

## One bounded logical record

For one `(root_identity, K, S0 generation)` the implementation admits at most three fixed create-only marker names:

- `ARMED` — the recovery window exists;
- `CLAIMED` — the single H1 attempt has been consumed before H1 allocation;
- `CLOSED` — terminal reason is exactly `ORDINARY_H0` or `RECOVERY_H1`.

Every marker is canonical ASCII JSON, source-bound, created with `O_CREAT|O_EXCL` relative to the exact retained root directory FD, file-fsynced, parent-directory-fsynced and reread through a non-following FD. The implementation contains no marker delete, overwrite, rename-over or reset path.

`ARMED` binds exact root identity, K, S0 device/inode identity, ext4 inode generation, length, SHA-256, record source SHA-256, generation-module SHA-256 and schema identity.

`CLAIMED` binds the exact `ARMED` digest. It is durable before the reducer exposes any H1 payload-allocation permission.

`CLOSED(ORDINARY_H0)` binds the exact `ARMED` digest. `CLOSED(RECOVERY_H1)` additionally binds the exact `CLAIMED` digest plus verified S1 identity, ext4 generation, length and SHA-256.

## Focused ext4 histories

The proof constructs three independent histories on one disposable ext4 filesystem. Every payload leaf is 64 MiB, fully allocated before admission and content-identical.

### Ordinary

1. acquire the exact K admission capability;
2. create and fsync S0;
3. with no `ARMED`, the runtime reducer returns `HOLD_NO_RECOVERY_AUTH`;
4. S2 is rejected before allocation;
5. full-read/hash S0 and durably create `ARMED`;
6. full-read/hash the same S0 again and durably create `CLOSED(ORDINARY_H0)`;
7. a fresh independent verifier must derive `HOLD_ORDINARY_H0` and zero new allocation authority.

### Recovery success

1. acquire K, create/fsync S0, full-verify it and durably create `ARMED`;
2. release the original supervisor and start one fresh recovery child;
3. the child reacquires K and derives only `AUTHORIZE_CLAIM_H1` — payload allocation remains forbidden;
4. it revalidates S0/ARMED and durably creates `CLAIMED`;
5. only after `CLAIMED` readback may the proof create/fallocate/fsync S1;
6. with S1 durable but recovery close absent, the reducer returns `HOLD_CAPACITY_FULL_RECOVERY_CLOSE_MISSING` and permits no further allocation;
7. after full S0/S1 verification, create `CLOSED(RECOVERY_H1)`;
8. a fresh independent verifier derives `COMPLETE_RECOVERY_H1` with zero new allocation authority.

### Claimant death

1. acquire K, create/fsync S0, full-verify it and create `ARMED`;
2. a fresh recovery child reacquires K and durably creates `CLAIMED`;
3. that child exits with S1 absent;
4. a fresh independent verifier must derive `HOLD_RECOVERY_ATTEMPT_ALREADY_CONSUMED`.

This proves the one-shot cut: a consumed claim cannot become a second H1 allocation after supervisor death.

## Independent verifier

The final verifier is a separate implementation. It does **not** import `datanet_v33_durable_recovery_record_v1.py` and does not call the runtime reducer.

It independently:

- reacquires each K capability;
- rereads complete S0/S1 payload bytes and checks SHA-256;
- observes ext4 inode generation from the retained leaf FD;
- reparses canonical marker bytes with duplicate-key rejection;
- validates exact source/schema/root/K/digest couplings;
- derives the ordinary, recovery-complete and claim-consumed terminals directly from current durable state.

## External syscall census

The Node 22/24/26 focused workflow executes the proof under one external `strace -f` observer. That observer is workflow instrumentation rather than a DataNet record or publication role.

The exact focused generation requires:

- 17 `EXT4_IOC_GETVERSION` observations;
- zero `EXT4_IOC_SETVERSION` observations;
- four successful payload `fallocate` calls: three S0 leaves plus the one authorized S1;
- three create-only `ARMED` markers;
- two create-only `CLAIMED` markers;
- two create-only `CLOSED` markers;
- exactly one S1 create-only publication;
- the first `CLAIMED` marker creation to occur before that S1 creation;
- the second `CLAIMED` marker to occur afterward in the claimant-death history with no second S1;
- zero unlink or rename-family syscalls from the proof;
- 25 successful fsync calls from the fixed three-case chronology.

The raw syscall trace and SHA-256-bound census are retained as workflow artifacts.

## Negative controls

The focused proof rejects:

- S0 without `ARMED`;
- S2/cap-plus-one requests;
- copied `ARMED` state carrying a foreign root identity;
- a stale/substituted S0 inode-generation value;
- noncanonical marker encoding;
- an ordinary close combined with a recovery claim;
- a consumed claim with S1 absent after claimant death.

Campaign, attempt, path, peer and schedule labels are not reducer inputs and cannot grant capacity.

## Explicit nonclaims

This focused lane does **not** yet prove:

- composition into the inherited 27-lifetime V31/V32 campaign;
- hostile same-UID deletion or rewriting of durable markers;
- deliberate same-UID ext4 generation rewriting;
- cold unmount/remount survival;
- physical power-loss durability;
- FIEMAP retained-image provenance;
- public-peer retrieval;
- Chain-2050 finality or economic authority;
- deployment or production runtime activation.

The next composition step is permitted only after one unchanged V33 head is naturally green on Node 22/24/26, broader repository CI and immutable Action references, followed by fresh independent review of the durable-record boundary.
