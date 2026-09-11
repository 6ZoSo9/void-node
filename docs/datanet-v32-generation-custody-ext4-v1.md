# DataNet V32 ext4 generation custody v1

## Scope

This source/proof-only lane is stacked exactly on #1491 head `28576df7d0c4572436e870e09a9e08f3545c7581` and preserves its V24 bounded-I/O publisher wiring.

It composes the designated-host `EXT4_IOC_GETVERSION` feasibility result into the existing V31 27-lifetime campaign without adding a process lifetime.

## Generation primitive

`scripts/datanet_ext4_inode_generation_v1.py` performs one observation-only `EXT4_IOC_GETVERSION` call on an already-open regular-file FD. It binds a bounded unsigned 32-bit generation value and requires the same FD to retain exact device, inode, type, UID and size across the ioctl. It performs no SETVERSION-class mutation.

The exact module SHA-256 and the executed Python binary SHA-256 are recorded in the campaign source bindings. Unsupported ioctl or observation failure terminates the proof rather than dropping back to `dev:ino` identity.

This is ordinary ext4 crash/restart and inode-reuse discrimination. It does not prove resistance to a same-UID principal deliberately rewriting the ext4 generation value.

## R0 crash-cut binding

The existing R0 diagnostic collector now opens the exact canonical S0 leaf and records `(dev, ino, generation)` while the H0 publisher still holds the root+K exclusion capability. It does not reread payload bytes.

After the H0 publisher is killed and reaped, the fresh recovery race inherits the collector's expected S0 identity and generation only as a supervisor test input. The winning contender must independently reopen and fully verify current S0 bytes, perform its own `EXT4_IOC_GETVERSION`, and match both the cut identity and generation before it can enter S1 publication.

A changed generation therefore fails before S1 allocation in this tested supervisor-survives crash cut.

This is not a durable cold-restart record. Full supervisor loss/cold-remount authority remains open.

## Retained S0 FD across exec

The recovery winner does not close the S0 FD after classification. It clears CLOEXEC on that exact read-only verified FD and then replaces itself with the Node S1 publisher through the already-proven same-PID `execve()` handoff.

The Node S1 publisher:

1. receives the inherited S0 FD plus the pre-exec generation binding;
2. requires the canonical S0 name to resolve to the same retained inode;
3. full-hashes that inherited FD with the shared V24 bounded payload engine;
4. revalidates the canonical name and inherited FD before opening the anonymous S1 candidate;
5. keeps the inherited S0 FD alive through S1 reservation, write, prepublication hash, create-only link, parent-directory fsync and S1 readback.

Because the old S0 inode remains referenced by the inherited FD, ordinary inode-number recycling cannot occur during the Python-classifier to Node-publisher handoff. A pathname replacement with another inode fails the canonical-name equality check before candidate allocation.

## Preserved campaign contract

The generation observation is in-process. No GETVERSION helper process is spawned. The inherited V31 process contract therefore remains:

- role lifetimes: 21;
- `fallocate` + `ln` helper lifetimes: 6;
- total process lifetimes: 27;
- peak live processes: 9;
- successful payload ledger: 15,372 calls / 1,006,632,972 requested / 1,006,632,960 completed-returned bytes (960 MiB).

The final source-distinct verifier independently observes the ext4 generation of E0 S0 and R0 S0/S1 in-process while performing the existing three full payload passes. Across the complete campaign there are exactly six GETVERSION observations: E0 classifier, R0 cut collector, R0 recovery classifier, and three final-verifier leaves.

## Evidence and non-claims

The five create-only evidence files remain unchanged in count. Their manifest and aggregate bind the new generation module, Python executable, exact observation count, zero added generation-helper lifetimes, R0 cut/prepublication generation equality and retained-FD exec custody.

Explicitly still false/open:

- same-UID generation-rewrite resistance;
- full supervisor-loss/cold-restart generation authority;
- cold unmount/remount and physical-power-loss acceptance;
- FIEMAP/retained-image provenance;
- public-peer retrieval;
- Chain-2050 finality/economic authority;
- deployment or production runtime activation.

No Ready/merge, deployment/restart, production filesystem/network mutation, credentials/keys/wallet/signers, transaction, inventory/presale, treasury/liquidity, scheduler or funds action is authorized by this lane.
