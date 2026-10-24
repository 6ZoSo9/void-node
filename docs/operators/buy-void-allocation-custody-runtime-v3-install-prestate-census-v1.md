# Buy VOID allocation-custody runtime V3 install prestate census V1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALL_PRESTATE_CENSUS_V1`.

Status: **read-only host-prestate inspection only**.

This successor consumes the exact accepted V3 custody install-archive lock from
Draft #3742 and defines the minimum filesystem prestate needed before any future
install/replacement planner can be reviewed.

## Exact accepted archive input

The census requires:

- lock path:
  `ops/security/buy-void-allocation-custody-runtime-install-archive-lock-v3.json`
- Git blob:
  `edb4ea2b833373ab387762e45ba7da4032c860f3`
- lock SHA-256:
  `ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7`
- archive candidate:
  `voidbuycustodyarchive3_0b1c997cb4649be6b6eaf161712230ad3ee1a0b69720133d3adc4875bae322cb`
- archive bytes: `266240`
- archive SHA-256:
  `5c77db938bcfd353e72628088f1e02c4b22d73814cbae555b9c13ce3ba3a95d1`

The accepted lock must still state that install, replacement, service, runtime,
payment, presale and funds authority are false.

## Host scope

The production census reads only:

```text
/opt
/opt/void-buy-allocation-custody-runtime-v1
```

plus the accepted lock file in the source checkout.

It does **not** inspect:

- Buy VOID request/customer history;
- allocation/custody ledgers or protected data roots;
- process environments or process arguments;
- credentials, wallets, signers or private keys;
- Unix-socket contents;
- systemd service state.

Those remain separate later qualification gates.

## Existing target identity

If the target is absent, the census records an **unprivileged create-only
candidate shape**. It does not create the target.

If the target exists, it must be a direct directory on the same filesystem and
the same Linux mount ID as `/opt`. Every opened descendant directory/file must
retain that mount ID as read from `/proc/self/fdinfo/<fd>`; this rejects
same-device bind mounts as well as cross-device mounts instead of absorbing
either into rollback identity. The census walks the tree through retained
`O_DIRECTORY|O_NOFOLLOW|O_NONBLOCK` descriptors. Every regular file is opened
with `O_NOFOLLOW|O_NONBLOCK` only to bind its type, mount and metadata
generation; **file contents are never read or hashed**. The opened generation is
revalidated against the visible generation before the metadata record is used.

The tree may contain ordinary directories, regular files and symlinks.
Directory entries are processed immediately through descriptor-relative
`os.scandir(fd)`; recursive frames do not retain sibling-name lists. The global
entry counter is charged before descending into a child, so traversal cannot
retain depth × 32,768 pending names before the 32,768-entry HOLD. Canonical
output remains deterministic because the completed metadata records are sorted
globally by relative path before hashing. Symlinks are treated as opaque legacy
entries: the census never follows them and **does not read their target text at
all**. Only `lstat` metadata contributes to the tree digest. FIFOs, sockets,
devices and other special files HOLD with fixed reason codes that do not embed
untrusted entry names.

The census emits a bounded **metadata digest** over relative path, type,
device/inode, UID, GID, mode, link count and metadata timestamps, plus regular
file length where applicable. Symlink target text, target length and target
hashes are excluded. It also records the target root device/inode so a future
rollback planner can bind a same-filesystem rename of that exact legacy root.

The legacy-target metadata bounds are deliberately separate from the tiny
accepted V3 archive. The existing target may contain at most 32,768 entries,
each regular-file metadata size may be at most 64 MiB, and aggregate regular
bytes remain capped at 512 MiB. These values cover the observed Precision
legacy footprint (16,490 entries; largest regular file 40,757,984 bytes;
aggregate regular bytes 148,357,378) with bounded headroom. Raising these
metadata ceilings does not authorize or perform any legacy file-content read.

No legacy regular-file content is read or printed. Symlink target text is
neither read nor printed. HOLD output uses fixed reason codes for target-tree
entry failures and never interpolates untrusted target entry names.

## Proposed future names

The census only checks whether these future names are free:

```text
/opt/.void-buy-allocation-custody-runtime-v3.stage-v1
/opt/.void-buy-allocation-custody-runtime-v1.rollback-v3-v1
```

It does not create, unlink, rename or reserve either path.

A present legacy target is only a **rollback-rename candidate** when both names
are absent and the target is on the same filesystem as `/opt`.

An absent target is only a **create-only install candidate** when both names are
absent. In that state `same_filesystem_rename_candidate=false` because no
existing target inode has been observed to rename.

Neither status is installation authority.

## Invocation

Host census requires isolated, safe-path, unoptimized **and no-bytecode** Python. The `-B` flag is mandatory because the production receipt claims no filesystem writes before ordinary module imports:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_runtime_v3_install_prestate_census_v1.py \
  --census
```

No sudo is required or authorized by this generation. Omitting `-B` is a
bootstrap HOLD before the normal census imports.

The command emits one canonical JSON record with a content-addressed
`prestate_id`. It performs no explicit filesystem write syscall, but Linux
directory enumeration and ordinary reads can update access-time metadata on
mounts where atime is enabled. The receipt therefore does **not** claim to be
filesystem-write-free. It reports `read_only=true`,
`filesystem_explicit_write=false`, `filesystem_write_free=false`,
`atime_write_possible=true`, and the equivalent production-scoped keys.
On any ambiguity it exits HOLD.

## Authority remains false

```text
production_census_read_only=true
production_census_explicit_filesystem_write=false
production_census_filesystem_write_free=false
production_census_atime_write_possible=true
archive_extraction=false
permission_mutation=false
service_state_checked=false
service_mutation=false
live_process_binding_checked=false
process_environment_read=false
process_arguments_read=false
request_history_read=false
custody_data_read=false
credential_access=false
wallet_or_signer_access=false
install_target_selected=false
existing_target_replaced=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

A later install/replacement planner must additionally bind service quiescence,
live-process/runtime identity, Node binary identity, the accepted archive lock,
and an explicit rollback/recovery protocol before any durable mutation is
considered.

**PROTECT THE CORE.**
