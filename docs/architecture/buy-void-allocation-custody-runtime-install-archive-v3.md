# Buy VOID allocation-custody runtime install archive V3

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_V3`.

Status: **unaccepted source/CI install-payload candidate only**.

This successor packages the exact accepted FIFO-safe custody runtime bundle from
Draft #3734. It does not install or replace anything on Precision or any other
host.

## Exact accepted source

Parent acceptance-lock head:

```text
0c7afa6318c26d16d9b6b6fced8a07f16a900524
```

Accepted lock:

- path: `ops/security/buy-void-allocation-custody-runtime-bundle-lock-v3.json`
- bytes: `2387`
- Git blob SHA-1: `9e371ebc4ba1dcf494e55823eddb8a183c31d69f`
- SHA-256: `bfa65de5e4b3735bf32b46c0595a442d8979dd5768caebbfe563e568723fabfc`

Accepted V3 runtime candidate:

- candidate ID:
  `voidbuycustodybundle3_dae3764e1f1b660235d17ad933e32ed0d4f67d8fc4cd322286d34c5d9f0dbe32`
- bytes: `12379`
- SHA-256: `0d1be868aab98debdf0785c59cf45954ae68b2e1ebd0687ee56206b10b02ac67`
- Git blob SHA-1: `3474174b68995eacd1c516bc9bc5190ff04757b6`
- runtime files: `10` (six compiled TypeScript outputs and four tracked source files)

The archive generator rederives the V3 candidate from the exact pinned source,
compiler and runtime closure. It does not trust a candidate label or archive
manifest by itself.

## Read boundary

Every accepted lock, candidate artifact and runtime payload read uses retained
Linux descriptor-relative directory traversal and an
`O_NOFOLLOW|O_NONBLOCK` regular-file leaf descriptor. Visible/opened/post-read
file generations are compared. A real synthetic regular-to-FIFO substitution
must reject without waiting for a FIFO writer.

## Deterministic archive

The archive is canonical USTAR under:

```text
void-buy-allocation-custody-runtime-install-v3/
```

It contains exactly twelve regular members:

1. the exact accepted V3 runtime-bundle lock;
2. one canonical archive manifest; and
3. the exact ten runtime payload files.

All members are sorted and use:

```text
uid=0
gid=0
uname=""
gname=""
mtime=0
mode=0444
```

The manifest carries the complete normalized V3 runtime records: path, byte
count, SHA-256, tracked-source Git blob when present, imports and runtime kind.
Independent archive inspection rederives the accepted V3 candidate and requires
exact record equality before accepting payload bytes. A self-consistent forged
manifest plus substituted payload therefore fails closed.

Trailing bytes, extra members, links/devices, traversal, metadata drift,
accepted-lock substitution and per-file payload drift are rejected.

## Hosted qualification

Node 22, 24 and 26 independently:

- check out the exact PR head;
- bind the exact four-path successor delta from #3734;
- install the locked compiler dependencies;
- rebuild the exact TypeScript source tree;
- run the V3 archive tool self-test and independent proof;
- create one private mode-0600 archive candidate;
- independently inspect that archive; and
- upload the candidate and receipt.

The compare job requires all three archive files and receipts to be byte
identical.

A green run still does **not** accept or install the archive. A separate archive
acceptance lock must bind the exact hosted archive bytes before any replacement
planner can consume it.

## Authority remains false

```text
archive_candidate_accepted=false
immutable_root_install=false
install_target_selected=false
existing_target_replaced=false
node_binary_identity_verified=false
request_root_selected=false
shared_directory_selected=false
service_unit_installed=false
service_started=false
service_restarted=false
runtime_integration=false
reserve_method_enabled=false
recover_method_enabled=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

The only filesystem write performed by `--package` is one create-only final
artifact in a caller-selected already-private build directory. Before that
final path can exist, the exact in-memory archive bytes are fully inspected,
rebound to the accepted V3 candidate, and required to satisfy the canonical
archive contract. Only after validation succeeds does the create-only write
begin. The written file generation is captured **before** file fsync. That same
generation must survive fsync unchanged; an exact-byte truncate/rewrite during
fsync is rejected even if the bytes are restored. The exact archive bytes are
then read back through the same retained output descriptor, required to equal
the prevalidated in-memory bytes exactly, and required to keep that generation
stable before the parent-directory durability step can proceed.

The output parent is traversed and retained through descriptor-relative
`O_DIRECTORY|O_NOFOLLOW|O_NONBLOCK` opens. The same retained descriptor is used
for the write-failure cleanup path, so renaming or replacing the caller-visible
parent during the write cannot strand a partial artifact in the original
directory. On successful publication, the archive file is fsynced first, the
retained parent directory is then fsynced to make the new directory entry
durable, and the retained/caller-visible parent generation is revalidated again.
After that directory fsync, the archive leaf is re-statted through the retained
parent descriptor and must still be the exact opened file generation before
returning success. Any parent or leaf drift HOLDS and enters retained-descriptor
cleanup. Synthetic tests require both regular-file and directory fsync on
success, truncate and restore the exact retained output bytes during file
fsync to prove pre-fsync generation stability, remove the leaf immediately after
parent fsync to prove the terminal leaf check, force a partial write and an
output-parent pathname rebind,
and require no discoverable failed archive. An existing final path is never
overwritten.

No systemd action, target replacement, permission mutation, request/customer
history read, custody reserve/recover, key/wallet access, RPC, transaction or
funds movement is performed.

**PROTECT THE CORE.**
