# VOID Tor bootstrap embedded release root v1

Status: source-only stacked trust-root lane. It does not create a production signing key, activate Tor, publish a bootstrap manifest, or change the launcher.

## Purpose

The Tor bootstrap resolver in PR #1027 accepts a content-addressed manifest only when the operator supplies its exact `voidpbm1_...` ID. That is safe, but it leaves a manual trust decision outside the release artifact.

This lane replaces manual manifest-ID entry with an embedded release root:

```text
verified VOID release archive
  -> config/void-tor-bootstrap-release-root-v1.json
  -> strict content-addressed voidptr1_ root
  -> Ed25519 threshold verification of a rotating signed manifest envelope
  -> derived voidpbm1_ manifest ID
  -> existing Tor manifest resolver
  -> numeric-loopback adapter
```

The release archive and its internal `RELEASE-CONTENTS-SHA256` bind the root file. The signed envelope may rotate without DNS, a registrar, a certificate authority, GitHub, or a cloud account becoming a runtime trust authority.

## Production hold state

The committed root is intentionally:

```text
status=hold_no_signing_keys
threshold=0
keys=0
```

It is content-addressed, embedded in public release archives, and unusable for manifest acceptance. This is fail-closed. A later separately reviewed key-binding lane may commit one or more public Ed25519 keys and change the status to `active`. Production private keys must never enter the repository or release artifact.

## Root contract

The root has a closed exact schema:

- network `VOID Network`;
- chain ID `2050`;
- domain `void:mainnet-0:tor-bootstrap-manifest-v1`;
- status `hold_no_signing_keys` or `active`;
- zero through eight Ed25519 SPKI public keys;
- threshold bounded by the active key count;
- content-derived `voidptr1_...` root ID; and
- every private and economic authority flag set to `false`.

Each key ID is derived from the SHA-256 digest of its canonical DER SPKI bytes. Duplicate IDs, malformed DER, non-Ed25519 keys, unknown fields, and mismatched IDs fail closed.

## Signed manifest envelope

The envelope contains:

- schema `void_tor_bootstrap_signed_manifest_v1`;
- the exact embedded root ID;
- one raw `void_public_bootstrap_v1` manifest; and
- one through eight unique signatures.

The signature payload is domain separated and binds both the release-root ID and canonical manifest bytes. Every supplied signature must verify, and the configured unique-key threshold must be met. Root substitution, manifest substitution, duplicate signatures, unknown keys, malformed base64, and cross-root replay fail closed before Tor network access.

## Resolver

Run the release-root resolver with a signed envelope:

```bash
node scripts/resolve_void_tor_public_bootstrap_release_root_v1.mjs \
  --signed-manifest-file /absolute/path/to/signed-bootstrap-envelope.json
```

Installed releases discover the embedded root under `bootstrap/` when present and otherwise use the source-tree `config/` location. An explicit `--release-root-file` remains available for deterministic review and testing.

The wrapper:

1. rejects a manually supplied expected manifest ID;
2. validates the embedded root and signed envelope before network access;
3. derives the manifest ID from verified content;
4. writes a private temporary manifest file;
5. invokes the existing strict Tor resolver with the derived ID; and
6. removes the temporary file.

## Proof

```bash
node scripts/prove_void_tor_bootstrap_release_root_v1.mjs
node scripts/prove_void_tor_bootstrap_release_root_v1.mjs --full
```

The proof generates fixture-only Ed25519 keys in a temporary directory. Those keys are not production credentials and are deleted after the proof. It verifies:

- content-addressed root validation;
- Ed25519 key-ID derivation;
- threshold signature verification;
- manual manifest-ID removal;
- root and manifest substitution rejection;
- duplicate, unknown, and invalid signature rejection;
- hold-root rejection;
- canonical regular-file and symlink boundaries;
- full release-root-to-Tor-resolver composition; and
- release archive inclusion plus internal checksum binding of the production hold root.

Expected marker:

```text
VOID_TOR_BOOTSTRAP_RELEASE_ROOT_V1_PROOF_GREEN
release_root_content_addressed=true
release_root_signature_algorithm=ed25519
signed_manifest_threshold_enforced=true
manual_manifest_id_required=false
production_private_key_generated=false
production_release_root_status=hold_no_signing_keys
manifest_substitution_rejected=true
root_substitution_rejected=true
signature_replay_across_roots_rejected=true
dns_resolution_required=false
domain_registrar_required=false
certificate_authority_required=false
cloud_provider_required=false
wallet_signer_validator_wc_money_authority=0
```

## Remaining gates

This lane does not activate a root, bind a production public key, sign or publish a manifest, alter `run-void-node.sh`, install Tor, create an onion identity, start a service, or perform outside-machine synchronization.

Those remain separate review and authorization gates. PR #1021 continues to own Tor seed installation and qualification. PR #1027 continues to own resolver, adapter, and supervisor integration.
