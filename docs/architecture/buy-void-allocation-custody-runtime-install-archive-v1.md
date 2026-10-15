# Buy VOID allocation-custody runtime install archive v1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_V1`.

Status: **unaccepted source/CI install-payload candidate**.

## Why this exists

Merged #3023 accepts one exact package-free custody runtime identity containing
ten files. That acceptance lock is an identity manifest, not an installable
payload.

The Precision prerequisite census also established that the intended fixed
`/opt/void-buy-allocation-custody-runtime-v1` target is currently a large
legacy tree rather than the accepted ten-file runtime. A future guarded
replacement therefore needs exact reviewed bytes to materialize; it must not
copy whatever happens to be in an ordinary checkout.

This candidate creates those transportable bytes without installing them.

## Source binding

Before packaging, the tool requires the merged runtime-bundle lock exactly:

- Git blob:
  `acb5da31527ab42919d411695b475a94af29abb1`;
- SHA-256:
  `998b1e211c78cd11b65224a51868687f7cdd76afcd07224482cf8ce862af1eec`;
- accepted runtime candidate:
  `voidbuycustodybundle1_2339d565cc1c298a3f7ca9cae2ef163831288007bb32d9e7c37c01880aaee704`;
- candidate SHA-256:
  `5ee2b5e5fc25a7cec8313c7cb7c4cd8bb675e3652ab18dc614577a25376f2279`;
- exactly ten runtime files.

The existing runtime-bundle candidate source independently validates the pinned
source/build/compiler closure. This archive candidate invokes that exact
derivation after the workflow performs locked dependency installation and the
reviewed TypeScript build.

Every packaged runtime file is then re-opened directly with `O_NOFOLLOW`,
read under stable inode/metadata, and required to match the exact per-file byte
count and SHA-256 in the rederived candidate.

The independent archive inspector does not trust a manifest merely because it
repeats the accepted aggregate candidate ID. It carries the exact ten hosted
per-file records from #3013 (path, bytes, SHA-256, runtime kind and tracked
source Git blob where applicable) and requires byte-for-byte semantic equality.
A self-consistent forged manifest plus substituted payload therefore HOLDs even
if it leaves the aggregate candidate label unchanged.

## Deterministic archive

The archive is canonical USTAR and contains exactly twelve regular files:

1. the accepted #3023 runtime-bundle lock;
2. one canonical content-addressed archive manifest;
3. the exact ten runtime payloads.

All member names are sorted. Every member uses:

```text
uid=0
gid=0
uname=""
gname=""
mtime=0
mode=0444
```

No symlink, directory, hard-link, device, PAX, GNU extension, traversal or extra
member is accepted. Reinspection rebuilds the canonical USTAR bytes and requires
wire-byte equality, so trailing bytes or metadata changes fail closed.

## Hosted qualification

Node 22, 24 and 26 each:

- install the locked compiler dependencies;
- rebuild the exact accepted source generation;
- rederive the existing accepted runtime identity;
- run this archive proof;
- create one private candidate archive;
- inspect it independently; and
- upload it as CI evidence.

The compare job requires the three complete tar files to be byte-identical.

A green candidate run still does **not** accept the archive. A separate lock
generation must pin the exact hosted archive byte count, SHA-256, manifest ID
and cross-node artifact evidence.

## Authority boundary

This candidate remains:

```text
archive_candidate_accepted=false
immutable_root_install=false
install_target_selected=false
existing_target_replaced=false
node_binary_identity_verified=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

The only filesystem write performed by `--package` is create-only publication
of a mode-0600 archive into an already-private directory selected by the caller.
It is a build artifact, not a production installation.

No Precision target replacement, service/systemd action, permission mutation,
request/payment/customer/ledger/custody data read, credential/key/wallet/signer
access, RPC, transaction, Chain-2050/WC mutation, presale activation,
treasury/liquidity or funds movement is authorized or performed.
