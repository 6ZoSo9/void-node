# DataNet H1 admitted S0/S1 exec publication v1

This stacked source/proof-only lane composes the accepted #1487 campaign-safe S0/S1 publisher shape with #1486's exec-preserved root+K POSIX admission capability.

Base prerequisite: #1487 exact accepted head `acebba0faff7d225497b3db5a1e2308eb0cd937c`.

Exact source bindings enforced by the proof:

- #1482 POSIX admission source Git blob: `c4d92dcaaed8879bcd98b96e199729098712d5b4`
- #1487 accepted S0/S1 source Git blob: `dc002dca29a42f0e83a5af4fddd967a7c9329b86`
- admitted S0/S1 publisher source Git blob: `0ec6b781a2a01e1f0094f27854577441f886af47`
- #1487 S0/S1 fixture Git blob: `ffe0df7cd6ed583bf59105e1a20be7d3483fb9f1`

## Composition proved

For S0 and S1, the Python lock owner opens and validates the exact visible root+K capability, acquires the traditional POSIX process lock, clears CLOEXEC only on the locked capability fd, and calls `execve()` so that the same PID becomes the Node publisher in-place.

The Node publisher independently verifies that:

- its store-root identity equals the admission-bound root identity;
- the visible capability name is exactly derived from the fixture K;
- the visible capability is a regular UID-owned mode-0600 zero-byte single-link inode with the exact bound identity;
- the inherited admission fd survived exec and `fstat()` resolves to the same exact capability inode; and
- the capability remains visible and identity-bound at classification, reservation, pre-link, and terminal checkpoints.

The proof coordinator concurrently attempts fresh acquisition while S0 and S1 are alive and requires BUSY samples until each publisher exits, followed by immediate fresh ACQUIRED. It also requires the post-exec Node PID to equal the pre-exec child PID.

The accepted #1487 publication shape is retained under that admission lock:

- S0 successful helper census: exactly 1 `fallocate` + 1 `ln`;
- S1 full-verifies canonical S0 before opening its anonymous candidate;
- S1 successful helper census: exactly 1 `fallocate` + 1 `ln`;
- S0 and S1 are distinct payload inodes;
- no successful path performs the old test-only collision `ln`;
- S2 becomes the same admitted Node classifier through exec, returns structured rejection before mutation, opens no anonymous payload inode, and executes zero helpers; and
- the coordinator hashes namespace/inode/content/allocation state before and after S2 and requires exact equality.

The composed proof therefore contains seven campaign-relevant process lifetimes: three for S0 (publisher + two helpers), three for S1, and one classifier-only S2 lifetime. The proof coordinator itself is explicitly outside that campaign census. This proves that admission does not add a publication process lifetime.

The dedicated Ubuntu 24.04 workflow runs the proof independently on natural Node 22, 24, and 26 using a fresh nonsparse 384 MiB ext4 image per matrix leg.

## Deliberate boundary

This is not the full V26 27-lifetime / peak-9 campaign. E0/R0 races, R0 crash cut, the third admitted publication, the V24 twelve-fault no-retry matrix, final composed application-I/O arithmetic, external observer/source-distinct aggregate, FIEMAP provenance, cold-remount/cold-storage acceptance, physical power-loss evidence, public-peer retrieval, and Chain-2050 authority gates remain open.

Keep Draft. No merge/Ready, deployment/restart, production runtime or network mutation, credentials/keys/wallets/signers, transaction, inventory, presale activation, treasury/liquidity, scheduler, cleanup, or funds action is authorized by this lane.
