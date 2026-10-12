# Nimo V4 inactive exact-wire bundle — current first-original source

This source-only successor exists because cumulative first-original/custody
[#2790](https://github.com/6ZoSo9/void-node/pull/2790) merged into canonical
main at `63ff562ba8402d523976b3a6ee875c06b94abe18`. Its allocation-ledger
source Git blob is **`8d84955e1e093a5c5af63241e62b8722fadd2f29`**; the
replay source Git blob is `b451bcd895986dadaf6e53954671062068316ccf`.

The previously packaged **Nimo V3 archive is now a different generation**.
The operator's Oct 10/11 read-only observations still show historical V1
installed files (ledger and auto-fulfillment) and a privately staged,
**unaccepted** V3 archive of 256,000 bytes / SHA-256
`5063297be5469385113041da31962d465350607dafffe25784e3b4888e7f6900`.
That archive expects compiled allocation-ledger SHA-256
`97a1cb675fec65558aa823b94f049815345fbaed4ac69c9dfae4e1416950cec0`.
**Do not install or re-label it as a current-generation V4 runtime.**

## Exactly one changed V3 runtime member

The new `scripts/prove_buy_void_nimo_v4_inactive_bundle_v1.py` preserves
the seven V3 runtime files at their immutable SHA-256 and size commitments.
Only `dist/economic/buy_void_allocation_reservation_ledger_v1.js` changes.
The V3 auto-fulfillment runtime digest stays
`119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c`.

The script independently checks the current exact **source Git blobs** and
V2 proposed lock, then reads built runtime files through bounded read-only
file descriptors. It constructs a new **`voidwfb4_` content-addressed candidate**
from eight byte/sha runtime records, previous V3 and proposed V2 identities,
source ancestry, and all-false economic/host authorities. It creates a
canonical, bounded USTAR archive under `inactive-v4-candidate/` with fixed
order/uid/gid/mode/mtime; `--inspect-archive` refuses altered member sets,
paths, checksums, manifest, metadata, trailing padding, or canonical wire
bytes. `--package` is create-once, outputs only
`void-nimo-v4-inactive.tar` in a user-owned mode-private parent, and
fsyncs file + parent; it never touches any installed/Nimo path.
`--plan` and `--inspect-archive` are read-only.

The new exact-head [V4 workflow](../../.github/workflows/buy-void-nimo-v4-inactive-bundle-v1.yml)
builds on Node **22, 24, and 26**, asserts reviewed source/lock/ancestry,
derives and independently reinspects the archive, requires an injected
trailing-byte tamper to HOLD, and compares **complete original candidate
archives and receipts byte-for-byte across all three Node toolchains**.
The ledger compiled digest and archive manifest ID are **derived**, not
predeclared as accepted; publish the exact result after hosted qualification.
The source-only workflow has `contents:read`, no push credentials, no SSH,
sudo, installer, network payout, signer, wallet, or customer record access.

## Installation / launch HOLD remains mandatory

This stage does not prove running service quiescence, authenticated custody
principal, protected high-water, independent rollback, or safe file replacement.
The latest operator-supplied privileged Nimo FD census saw zero open target
FDs but **one process vanished during the scan** and explicitly reported
`runtime_service_quiescence_verified=false`; it is not lifetime service
quiescence. The old V3 privately staged bytes are **not accepted**, and this
V4 review archive also remains `HOLD_UNACCEPTED_NOT_INSTALLED`.

After V4 cross-node source qualification, a separately reviewed exact-archive
private stage, privileged rollback/quiescence ceremony, and authenticated
post-install evidence will be required. Only then can a separate operator
decision consider the already-unmounted verified-payment→allocation path,
capacity-serialized fsynced exactly-once recovery, source-chain payment
finality and coupled WC/VOID launch.

**No deployment, host/service, customer ledger, custody reserve/recover,
wallet/key/signer, transaction, presale activation or funds movement is
authorized by this PR. PROTECT THE CORE.**

## Exact hosted archive and safe private-stage generation (October 11)

Exact predecessor package proof at [workflow #38171973131](https://github.com/6ZoSo9/void-node/actions/runs/38171973131)
passed 4/4 jobs (Node22, 24, 26, and complete cross-node byte comparison).
The exact immutable artifact values are:

- Candidate ID:
  `voidwfb4_b5d9516e5fa462ca7ed2333ebe3ef715eaf62ecdd3c0a6b049ecc9eb1e1659c2`
- Canonical inactive archive: **266240** bytes, SHA-256
  `6bb01af17cc87dfb42b63942143458f3e95990d8ae1ef6c1671fc5cd7d4feaf8`.
- Current compiled ledger: **47309** bytes, SHA-256
  `51de81388631ecef2a8c3feea68960040ccbda75fd29ada171cb9c9c7b53188a`.
- Other seven V3 runtime members: byte-identical. The V3 **archive**
  and staged payload remain historical and are not silently overwritten.

The additional `scripts/void_nimo_v4_private_stage_v1.py` is a **standalone
unprivileged user-private review utility**, derived from immutable V3 private
staging behavior without changing its historical source. It independently
requires the *exact* V4 archive bytes/hash, exact ten-member set, and all
eight runtime checksums. `--plan <absolute-v4-archive>` is read-only.
`--self-test <absolute-v4-archive>` writes only throwaway directories
in temporary storage, verifies atomic create-once, tamper, symlink
replacement, a simulated ENOSPC after the first fully written payload,
retry while the unpublished partial tree remains quarantined under its
random private name, staged-leaf replacement during a descriptor read, and
a late replacement of the first validated leaf while a later subtree is
being read. The test restores its injected hooks and removes its disposable
temporary-directory fixtures afterward.
`--stage <absolute-v4-archive>` (not automatically called by CI) is
**create-once only**, restricted to the invoking unprivileged user's
own private home folder
`void-nimo-v4-inactive-review-20261011`; no overwrite/repair and no
installed/root-owned tree access. The staged files are first built, fsynced
and inspected inside a freshly named private sibling. Linux `renameat2`
with `RENAME_NOREPLACE` publishes the completed directory atomically,
never replacing even an empty existing stage. An interrupted build leaves a
random, user-private unpublished sibling for separate inspection and
retains the canonical name for a retry; it does **not** unlink entries based
on raceable pathname metadata. Publication fsync uncertainty returns HOLD
without deleting the already visible canonical stage.
`--inspect-stage` retains each leaf and subtree descriptor through the
**entire** inspection and compares their original metadata with the
post-scan visible names after all subtrees have been read. A Linux
inotify watch is installed on each pinned directory inode before
its subtree scan: any entry or metadata mutation anywhere in the
inspected tree, including during the final identity pass or an inotify
overflow/watch loss, must HOLD. The disposable self-test injects an
early-leaf replacement specifically during a later leaf's final stat,
after the early leaf's own final check, and requires the watch to HOLD.
This is a bounded observation, **not** a lease or continuous
installed-host attestation. A same-UID mutation after the final
observation remains outside this source-only inspection guarantee.
It is still not acceptance of production installed bytes.

The existing Node22/24/26 workflow now tests both V4 private-stage
`--plan` and `--self-test` on the newly derived canonical archive,
binds the exact private-stage Git blob
`b2bedf3757e42b787869cb905a7df023ef3ce3c1`, and requires exact
cross-toolchain stage receipts in addition to full archive equality.
The prior 4/4 SUCCESS is **historical predecessor CI only**;
this expanded head must independently pass before stage qualification.

**Do not use the inactive V4 review stage as an install procedure.**
The deployed two historic V1 files on Nimo require a separately
authorized, authenticated, protected rollback and quiescence plan, plus
independent post-install host attestation. This work does not enable
custody IPC, operator payment acceptance, presale/WC, keys, or funds.
