# Nimo V2: exact-wire private staging (no install/cutover)

This is a source-only child of [inactive archive Draft #2741](https://github.com/6ZoSo9/void-node/pull/2741).
It extends the already-verified **256,000-byte**, SHA-256
`656357f5ed98da324e205ca85085fa4b72d9289f8e2c2b7d5d43eb8e082c87c6`
review TAR into a **user-owned, explicitly inactive side-by-side stage**.

## Status and reason

Nimo's user-supplied read-only census shows the original frozen witness V1
8/8 installed file hashes, all root-owned mode 0444. The proposed current
V2 is 7/8 against Nimo because only `buy_void_auto_fulfillment_v1.js`
differs: original SHA-256
`ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6`,
proposed V2
`119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c`.
No V2 host install or independent attestation is inferred.

## Operator entrypoints — explicit, unprivileged and no manual edits

`scripts/void_nimo_v2_private_stage_v1.py` is standalone Python 3
standard library. With one unchanged CI archive copied to Nimo,
the operator may invoke:

```bash
python3 void_nimo_v2_private_stage_v1.py --plan "$HOME/Downloads/void-nimo-v2-inactive.tar"
python3 void_nimo_v2_private_stage_v1.py --self-test "$HOME/Downloads/void-nimo-v2-inactive.tar"
# Separate explicit user choice, NOT invoked by CI or import:
python3 void_nimo_v2_private_stage_v1.py --stage "$HOME/Downloads/void-nimo-v2-inactive.tar"
python3 void_nimo_v2_private_stage_v1.py --inspect-stage
```

`--plan` opens the supplied canonical absolute user-owned, nlink=1 regular
TAR once using `O_NOFOLLOW|O_NONBLOCK`; descriptor-binds its inode/mode,
time and length, reads bounded bytes via `pread`, and requires the
**entire physical TAR** to match the reviewed exact SHA-256 before parsing.
All ten files are checked in order: eight current compiled runtime modules,
original review manifest and proposed V2 lock, with sizes, hashes, owner
metadata, 0444 member modes and fixed paths. Extra, missing or symlinked
entries HOLD. No customer, credential, installed witness or other private
state is read.

The opt-in `--stage` refuses root/setuid execution. It only creates a
**new** mode-0700 directory named
`void-nimo-v2-inactive-review-20261009` directly beneath the invoking
unprivileged account's registered home directory. It writes exclusively
under that directory, with descriptor-relative `O_EXCL|O_NOFOLLOW`
opens, mode-0444 payloads, file+directory fsync and exact post-stage
revalidation. An already-existing stage, partial stage, changed TAR,
symlink, changed inode, extra file, wrong mode/owner or hash HOLDS.
No automatic repair/deletion of a partially staged directory is performed.

`--inspect-stage` is independently read-only, checks all ten bytes and
directory/inode/mode boundaries again, and never accepts the staged bundle
as root-owned or executable production code. Even when `--stage` succeeds,
the new files remain **user-owned** and **nonactivated** in the home
directory; they are NOT installed V2 witness files.

`--self-test` creates and deletes only disposable OS-temp fixtures.
It verifies changed padding, appended bytes, one-bit changes, repeat-stage
rejection and private staged-file tampering. The dedicated low-cost Node24
workflow compiles source, uses the existing #2741 exact TAR builder to
produce the reviewed archive, runs real `--plan` and `--self-test`, and
requires all authority fields false.

## Strict further review

No `sudo`, SSH, `/usr/local/libexec` write, binary install, symlink
switch, systemd or forced-command change, witness state reset, customer
data, keys, wallets, RPC or transactions. The genuine V1 installed root-owned
bundle is preserved; nothing here claims an independently authenticated
Nimo principal or V2 installed/accepted host identity.

Subsequent separately approved steps require a reviewed root-owned V2
installation with rollback/rollback-independent evidence, exact 8/8
installed file comparison, authenticated cross-UID IPC, shared protected
high-water and payment-to-allocation durable recovery. The installed
service `reserve` and `recover` remain source-HOLD; coupled WC/VOID
presale and inventory funding remain HOLD.

`installed_v2_accepted=false`, `dedicated_principal_authenticated=false`,
`custody_reserve_enabled=false`, `payment_to_allocation_authorized=false`,
`presale_activation=false`, `funds_moved=false`.

**PROTECT THE CORE.**
