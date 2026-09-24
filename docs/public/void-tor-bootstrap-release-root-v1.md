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

## Production active state

The committed production root is now:

```text
status=active
threshold=1
keys=1
root_id=voidptr1_14f2cba76fc64e04cf8efd50e300dba21170f59e2c3441b33f6b415d31b1b839
key_id=voidtpk1_6111a98528baf5e781f02456b17bd8f5f01ec0a5e81432366564e515be705c94
```

Only the canonical Ed25519 public SPKI is committed. The matching private key was
generated offline on Nimo and is not present in the repository or release
artifact. A 1-of-1 root is operationally sufficient but makes that one release
key a single signing authority; a later rotation may add independently generated
keys and raise the threshold.

The hold-state contract remains supported and tested as a synthetic fail-closed
fixture. Production private keys must never enter the repository or release
artifact.

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

Each key ID is derived from the SHA-256 digest of its canonical DER SPKI bytes. Parsed keys are exported again and must match the supplied DER byte-for-byte. Duplicate IDs, malformed or noncanonical DER, non-Ed25519 keys, unknown fields, and mismatched IDs fail closed.

## Signed manifest envelope

The envelope contains:

- schema `void_tor_bootstrap_signed_manifest_v1`;
- the exact embedded root ID;
- one raw `void_public_bootstrap_v1` manifest; and
- one through eight unique signatures.

The signature payload is domain separated and binds both the release-root ID and canonical manifest bytes. Every supplied signature must verify, and the configured unique-key threshold must be met.

Signature acceptance also runs the complete Tor bootstrap manifest contract before network access: exact keys, network and chain binding, `stable_tor_seed`, zero clearnet endpoints, no Tailnet publication, all authority flags false, bounded timestamps, content-derived manifest ID, checksum-valid onion identities, and fresh qualifications. A correctly signed but malformed, expired, authority-bearing, or resealed unknown-field manifest is rejected.

Root substitution, manifest substitution, duplicate signatures, unknown keys, malformed base64, forged prevalidated-root objects, and cross-root replay fail closed.

## Resolver

Run the release-root resolver with a signed envelope:

```bash
node scripts/resolve_void_tor_public_bootstrap_release_root_v1.mjs \
  --signed-manifest-file /absolute/path/to/signed-bootstrap-envelope.json
```

Installed releases discover the embedded root under `bootstrap/` when present and otherwise use the source-tree `config/` location. Runtime root replacement is rejected by default. An explicit `--release-root-file` is accepted only when both `--test-only-allow-release-root-override` and `VOID_TOR_BOOTSTRAP_TEST_ONLY=1` are present, so fixture roots cannot silently replace the embedded production root.

The wrapper:

1. rejects a manually supplied expected manifest ID;
2. rejects release-root overrides unless the explicit double test-only gate is present;
3. revalidates root content even when a caller supplies a previously validated-looking object;
4. validates the embedded root, complete manifest contract, and signed envelope before network access;
5. derives the manifest ID from verified content;
6. writes a private temporary manifest file;
7. invokes the existing strict Tor resolver with the derived ID; and
8. removes the temporary file.

## Proof

```bash
node scripts/prove_void_tor_bootstrap_release_root_v1.mjs
node scripts/prove_void_tor_bootstrap_release_root_v1.mjs --full
```

The proof generates fixture-only Ed25519 keys in a temporary directory. Those keys are not production credentials and are deleted after the proof. It verifies:

- content-addressed root validation;
- Ed25519 key-ID derivation;
- threshold signature verification;
- complete signed-manifest contract validation;
- manual manifest-ID removal;
- embedded-root override rejection outside the test-only gate;
- forged prevalidated-root rejection;
- canonical public-key DER enforcement;
- root and manifest substitution rejection;
- duplicate, unknown, and invalid signature rejection;
- synthetic hold-root rejection;
- canonical regular-file and symlink boundaries;
- full release-root-to-Tor-resolver composition; and
- release archive inclusion plus internal checksum binding of the production active root.

Expected marker:

```text
VOID_TOR_BOOTSTRAP_RELEASE_ROOT_V1_PROOF_GREEN
release_root_content_addressed=true
release_root_signature_algorithm=ed25519
signed_manifest_threshold_enforced=true
manual_manifest_id_required=false
production_private_key_generated=false
production_release_root_status=active
production_release_root_threshold=1
production_release_root_key_count=1
manifest_substitution_rejected=true
root_substitution_rejected=true
signature_replay_across_roots_rejected=true
strict_manifest_contract_verified=true
embedded_release_root_override_rejected=true
forged_prevalidated_root_rejected=true
canonical_public_key_der_required=true
dns_resolution_required=false
domain_registrar_required=false
certificate_authority_required=false
cloud_provider_required=false
wallet_signer_validator_wc_money_authority=0
```

## Remaining gates

This lane now binds the reviewed production public key and active root. It still does not access the private key, sign or publish a manifest, alter `run-void-node.sh`, install Tor, create an onion identity, start a service, or perform outside-machine synchronization.

Those remain separate review and authorization gates. PR #1021 continues to own Tor seed installation and qualification. PR #1027 continues to own resolver, adapter, and supervisor integration.
