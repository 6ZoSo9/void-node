# VOID bootstrap record release root v1

## Purpose

The merged bootstrap-record v2 contract gives each canonical record a
content-derived `voidpbr2_...` ID, and the locator-resolver lane requires the
caller to know that exact ID before accepting bytes from replaceable HTTPS/Tor
locator mirrors.

This contract defines the missing trust handoff: a portable VOID release may
carry a small content-addressed Ed25519 release root that can verify a signed
exact `voidpbr2_...` record ID independently of whichever locator answers.

Locator infrastructure remains transport only. It never becomes bootstrap
truth or VOID network identity.

## Root contract

The root is a closed-schema object bound to:

- network `VOID Network`;
- numeric chain ID `2050`;
- fixed signature domain
  `void:mainnet-0:bootstrap-record-v2-release-v1`;
- an Ed25519 public-key set;
- a bounded threshold;
- an all-false private/economic authority object; and
- a content-derived `voidbrr1_...` root ID.

Each public key uses canonical Ed25519 DER SPKI and receives a content-derived
`voidbrk1_...` key ID. Root keys must already be sorted by key ID so the same
logical key set cannot acquire multiple roots through ordering ambiguity.

## Signed record-ID envelope

An active root verifies a closed envelope containing only:

- schema;
- exact root ID;
- exact canonical `voidpbr2_<sha256>` record ID; and
- one bounded, canonically ordered signature set.

The signature payload is domain separated across the fixed signature domain,
exact root ID, and exact record ID. Every supplied signature must be valid,
key IDs must be unique and known to the root, and the configured threshold
must be met.

Changing the record ID invalidates the signatures. Replaying signatures under
a different root fails. A locator mirror cannot substitute a different but
self-consistent record because the trusted record ID is resolved before the
locator layer is allowed to return record bytes.

## Production active-root boundary

The committed root is now:

```text
status=active
threshold=1
keys=1
root_id=voidbrr1_9861cdd1f717a4f5b3f4637c4e4539bc06d23ab5a8e530605b9eaad1f65229ec
key_id=voidbrk1_bbd03f57c88d6c79646023b5cf871f2fa631eeb54a1f8f9fb3711359e6af1087
```

Only the Ed25519 public key is committed. The corresponding production private
key was generated on offline Nimo and is not stored, read, or committed by the
repository. The root grants no wallet, signer, validator, treasury, Work Credit,
money-movement, or private-route authority.

This 1-of-1 root can authorize bootstrap trust material only after a separately
reviewed offline signature ceremony. Signed bootstrap-record IDs, observer
authorization, relay-introduction publication, deployment, and external
acceptance remain separate gates.

## Portable release binding

The existing public release builder copies tracked `config/` files into the
portable archive and hashes every allowed staged file into
`RELEASE-CONTENTS-SHA256`.

The full proof therefore builds a real deterministic public release and
requires the exact committed hold root to be present under `config/` and bound
by the archive's internal checksum manifest. No shared release-builder source
change is required.

## Composition boundary

After separate review/merge, the intended trust chain is:

```text
portable VOID release
  -> embedded voidbrr1 release root
  -> threshold-verified exact voidpbr2 record ID
  -> replaceable locator mirrors
  -> exact verified bootstrap record
  -> record-bound manifest mirrors
  -> exact verified bootstrap manifest
```

This PR does not compose the root into the still-draft locator resolver and
does not activate the launcher. That composition remains a later bounded lane
after both contracts are merged.

## Authority boundary

This lane performs no network calls, record/manifest publication, locator
fetch, launcher integration, bootstrap activation, deployment, service
restart, router/firewall/DNS/interface mutation, credential/private-key read,
wallet/signer/validator/treasury/Work Credit action, transaction, broadcast, or
fund movement.

Synthetic proof code generates ephemeral in-memory Ed25519 test keys only.
Those keys are not production keys and are never written to the repository.
