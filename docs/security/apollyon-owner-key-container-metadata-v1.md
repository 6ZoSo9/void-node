# Apollyon owner-key container metadata v1

Marker: `VOID_APOLLYON_OWNER_KEY_CONTAINER_METADATA_V1`

## Purpose

Provide a reusable, fail-closed, **metadata-only** operator-side check for the
Apollyon owner-approval private-key container before any future cryptographic
correspondence or signing step is considered.

The verifier is intentionally weaker than a signer-capability proof. A green
result means only that the expected local container is structurally protected
at the filesystem metadata boundary.

## Security boundary

`scripts/apollyon_owner_key_container_metadata_v1.py`:

- performs no network activity;
- performs no source or runtime mutation;
- never opens or reads the target key container;
- never hashes, decrypts, copies, exports, or signs with private-key material;
- uses `lstat` metadata only;
- requires the target to remain beneath the invoking user's home directory;
- rejects target symlinks and non-regular files;
- requires owner UID/GID, mode `0600`, one hard link, and a bounded non-zero size;
- rejects symlinked/non-directory ancestors;
- requires the home directory not to be group/other writable; and
- requires sensitive descendants below the home directory to be owner-private.

The default target is expressed relative to `$HOME`:

```text
.local/share/void-apollyon-owner-approval-key-v16/owner-ed25519-encrypted-pkcs8.pem
```

The verifier deliberately does **not** print the absolute target path.

## What GREEN does not prove

A green result does not prove:

- that the encrypted container decrypts successfully;
- that it contains an Ed25519 private key;
- that its derived public key matches an Apollyon trust pin;
- that a signer is available;
- that an operator challenge has been authorized;
- that any signature has been created; or
- that Apollyon live authentication is enabled.

Those remain separate explicit gates.

## Operator use

Metadata-only local check:

```bash
python3 -I -B scripts/apollyon_owner_key_container_metadata_v1.py
```

Source self-test:

```bash
python3 -I -B scripts/apollyon_owner_key_container_metadata_v1.py --self-test
```

A successful local check terminates with:

```text
VOID_APOLLYON_OWNER_KEY_CONTAINER_METADATA_V1=GREEN
```

and explicitly reports:

```text
cryptographic_correspondence_proven=false
signer_capability_proven=false
```

This lane does not change the existing public Apollyon private-revelation
boundary and does not activate operator or validator communication.
