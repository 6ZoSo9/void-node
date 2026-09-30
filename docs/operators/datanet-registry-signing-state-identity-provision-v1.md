# DataNet registry signing-state identity provision v1

Marker: `VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1`

Status: private Nimo-local state-generation provisioning gate. No signing
authority.

## Purpose

The hardened single-use signing-authorization consumer no longer trusts a replay
store pathname by itself. It requires a separately provisioned external identity
for the exact filesystem generation behind:

`~/.local/state/void/datanet-registry-signing-v1`

This gate creates that identity file only. It does not consume an authorization,
inspect the deployer credential, or sign anything.

## Fixed production paths

The provisioner is Nimo-only and binds:

`~/.local/state/void/datanet-registry-signing-v1`

to:

`~/.config/void/datanet-registry-signing-state-identity-v1.json`

The state root must already exist. This lane never creates, replaces, renames,
or removes it.

## Generation identity

The identity binds:

- marker `VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_V1`;
- version 1;
- canonical state-root realpath;
- filesystem device ID;
- filesystem inode ID; and
- content-addressed `voiddrssi1_<sha256>` state-store ID.

The ID is computed over the canonical marker/version/path/device/inode material.

Replacing the replay state root with another directory at the same pathname
therefore does not preserve the identity.

## Preconditions

Before any write, the Nimo runner requires:

- exact host `Nimo`;
- clean `main`;
- canonical non-symlink state root;
- current-user ownership;
- exact mode 0700;
- canonical private `~/.config/void` directory, also mode 0700;
- no unexpected state-root entries;
- no existing consumption record.

An existing empty `consumed/` directory is permitted only when it is canonical,
owned by the operator, mode 0700, and empty.

If any consumption record already exists, provisioning fails closed. This gate
cannot reset or reopen a consumed signing opportunity.

## Plan-only default

Without `--apply`, the runner only prints the computed state-store identity and
the required confirmation.

No file is written.

## Applied confirmation

Creation requires both `--apply` and the exact generation-bound confirmation:

`provisionDatanetRegistrySigningStateIdentityV1:<state_store_id>`

The suffix is the content-derived `voiddrssi1_...` identity for the current
canonical state-root realpath/device/inode generation. Replacing the state root
therefore changes the required confirmation; authorization for generation A
cannot be replayed to provision generation B.

This confirmation authorizes only the external replay-state generation identity
file.

It is not authorization to consume a signing authorization or sign a
transaction.

## Publication

The identity file is mode 0600.

Publication uses:

1. exclusive `O_EXCL|O_NOFOLLOW` temporary-file creation;
2. file mode enforcement and fsync;
3. exclusive hard-link publication to the final identity pathname;
4. config-directory fsync; and
5. temporary-file removal.

The final file is never overwritten. Best-effort close/unlink cleanup failures
remain visible in source and never silently change the provisioning result.

If an exact identity file already exists, plan-only mode returns
`ALREADY_GREEN_NO_MUTATION`.

Applied mode with the exact confirmation may write a new receipt from that exact
existing identity without mutating the identity file. This supports recovery
from the narrow crash case where identity publication completed but receipt
publication did not.

If a conflicting identity already exists, the gate fails closed.

## Receipt

Applied creation requires a caller-selected receipt path.

The receipt is mode 0600, is published exclusively through a same-directory
temporary file plus hard link and fsync, and records only public/metadata facts:

- state-store ID;
- SHA-256 of the canonical local state-root pathname;
- device/inode generation;
- identity-file SHA-256;
- repository head; and
- provisioning time.

It does not contain a credential or private key.

The receipt parent may be 0700 or a conventional operator-owned 0755 directory
such as `Downloads`, but it must not be group/world writable.

## Authority boundary

This lane may write one filesystem identity file and one receipt.

It does **not**:

- mutate the replay state root;
- create or delete a consumption record;
- access the deployer credential;
- access a private key;
- expose a signer;
- sign a transaction;
- export a signed transaction;
- submit or broadcast;
- deploy the registry;
- mutate Chain-2050;
- move funds; or
- retry automatically.

## Next gate

A green identity provision permits only the hardened durable single-use signing
authorization consumer to bind itself to this exact state-root generation.

The later signing gate must still require a valid consumed authorization,
recheck runtime expiry, bind the same operation slot and state-store identity,
and receive the exact operation-bound signing confirmation.
