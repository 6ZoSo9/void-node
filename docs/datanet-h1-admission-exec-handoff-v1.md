# DataNet H1 admission exec handoff v1

Marker: `VOID_DATANET_H1_ADMISSION_EXEC_HANDOFF_V1_GREEN`

Status: stacked source/proof-only prerequisite over #1484. This lane exists because #1484 deliberately proved composition with a Python lock-owning supervisor and a separate Node publisher, while V26's final campaign permits only the two `fallocate`/`ln` helper lifetimes per admitted publication. Reusing #1484's two-process composition three times would exceed the exact 27-lifetime campaign contract.

## Bound prerequisites

Exact base #1484 head:

`acdef1efa884cb52dfee01c5230aeb7ff8fbd918`

Exact imported Git blobs:

- POSIX admission primitive: `c4d92dcaaed8879bcd98b96e199729098712d5b4`
- ext4 publication primitive: `1ebc3b0e7611aa8d523333d0bbab5698ebee6456`
- publication fixture: `538501d77ca9565b81128ec98d3c7edcaa0c28df`

The proof fails closed if any of those bytes drift.

## Handoff contract

On one fresh dedicated nonsparse 384 MiB ext4 image:

1. create exactly one K-specific capability inode using the accepted #1482 source;
2. a publisher process opens the exact prebound root/capability identities and acquires the traditional process-associated POSIX byte-range lock;
3. it revalidates the binding and clears `FD_CLOEXEC` on **only the locked capability fd**;
4. without fork/spawn, that same process calls `execve()` on the exact #1483 Node publication source;
5. the root fd remains `CLOEXEC`; the Node publisher reopens the root through #1483 and must report the same root identity and exact capability inode identity;
6. a separate harness process repeatedly attempts fresh acquisition while the exec-replaced Node publisher is alive; every such sample must be BUSY;
7. the Node process completes the accepted inode-local reservation, payload write/fsync, fresh anonymous rehash, create-only publication, directory fsync, writable-custody retirement and independent readback proof; and
8. after that process exits, a fresh acquisition must succeed immediately.

`execve()` replaces the lock-owning process image and therefore adds **zero** process lifetimes. This lane proves the missing mechanism needed to preserve V26's eventual 27-lifetime count.

## Deliberate boundary

This proof does **not** yet claim the complete 27-lifetime campaign. In particular, #1483's standalone publication proof intentionally performs one extra collision-test `ln` helper after the successful link. That helper is useful in the primitive proof but cannot appear in the final V26 successful-path census. The eventual campaign lane must select a source-bound mode that retains create-only/no-replace enforcement while omitting that test-only second link from successful-path topology accounting.

This lane also does not prove the eight-way E0/R0 races, E0 classifier-only lifetime, R0 crash cut, three total admitted publications, V24 injected I/O fault matrix, V29 832 MiB ledger, observer/source-distinct aggregate, FIEMAP provenance, cold remount, physical power loss, hostile same-UID isolation, public-peer retrieval, or Chain-2050 authority.

No Ready/merge, deployment/restart, production filesystem/network mutation, credential/key/wallet/signer access, transaction, Work Credit, validator, inventory, presale activation, treasury/liquidity, scheduler, cleanup, or funds action is performed by this lane.
