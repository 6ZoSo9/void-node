# VOID public bootstrap release/locator composition v1

## Purpose

VOID already has three merged, independently proven trust-chain primitives:

1. a release-embedded root that threshold-verifies one exact signed
   `voidpbr2_...` record ID;
2. a locator resolver that retrieves only that exact record from replaceable
   HTTPS/Tor mirrors; and
3. a record-bound resolver that retrieves only the exact manifest named by the
   verified record.

This lane composes those contracts into one callable source boundary. It closes
the trust gap between a portable release and a verified bootstrap manifest
without making a locator, mirror, repository host, DNS provider, Tor endpoint,
or transport into VOID identity or authority.

## Exact trust order

The composition is deliberately sequential:

```text
embedded release root
  -> active root validation
  -> threshold verification of signed exact voidpbr2 record ID
  -> replaceable locator-mirror resolution of that exact record
  -> record validation and exact ID equality
  -> record-bound manifest-mirror resolution
  -> exact manifest size, SHA-256, content ID, schema, network, expiry,
     Tailnet, and private/economic authority validation
```

Release-root and signed-ID validation occur before either injected transport
callback can run. The currently committed production root remains
`hold_no_signing_keys`; composition with that root fails before any locator or
manifest fetch.

## Transport boundary

The source contract performs no network I/O. Record and manifest fetch
functions are injected by a later runtime integration, remain untrusted, and
receive only the already-derived immutable content URL for their layer.

The composition reuses the existing mirror validators and therefore preserves:

- three through sixteen distinct mirror roots and failure domains;
- HTTPS and Tor transport diversity;
- immutable record and manifest paths;
- no mutable `latest` alias;
- exact caller-pinned record ID;
- exact record-bound manifest bytes; and
- fail-closed exhaustion when every mirror fails.

## Cryptographic boundary

The composition adds no cryptographic algorithm or key format. It consumes the
algorithm-tagged key entries already validated by the release-root contract.
The current root contract uses classical Ed25519 and is **not** quantum safe.
Future root algorithms require a separately reviewed, versioned migration; this
lane does not broaden the existing Ed25519 surface.

## Current operational truth

This is source composition only. It does not modify `run-void-node.sh`, the v1
manifest resolver, `src/node_core.ts`, or the UDP Swarm stack. It does not
publish a root, signed record ID, record, manifest, or mirror plan.

The ordinary launcher remains on its existing v1 GitHub-hosted manifest path.
The next bounded source step, after this composition and an active public root
are separately reviewed, is launcher/runtime integration with bounded HTTPS and
Tor fetch adapters plus migration and N-1 acceptance proofs.

## Authority boundary

No real network request, bootstrap activation, release publication, deployment,
service restart, router/firewall/DNS/interface mutation, credential/private-key
access, wallet/signer/validator/treasury/Work Credit action, transaction,
broadcast, or fund movement is performed or authorized.

The proof uses ephemeral in-memory Ed25519 test keys only. They are not
production keys and are not written to the repository.
