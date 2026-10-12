# DataNet Promotion Independent Attestation Set v1

Marker: `VOID_DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_DOC_V1`

Status: source-only evidence qualification. It does not create a new identity root, expand provider quote authority, mutate a provider registry, write Chain-2050, mutate validators, access wallets/signers, award Work Credits, restart services, or move funds.

## Purpose

The promotion evidence collector requires external corroboration and independent reproducibility, but a numeric count alone does not prove that the observations came from distinct identities.

This gate converts three signed, registry-resolved external attestations into the existing `VOID_DATANET_PROMOTION_EXTERNAL_EVIDENCE_V1` bundle.

V1 deliberately requires:

- exactly two distinct corroborators; and
- exactly one distinct reproducer.

All three provider identities, provider key bindings, and Ed25519 signing keys must be different.

## Existing trust source

V1 reuses the existing **operator-signed provider trust registry snapshot** implementation.

The provider registry is used here for **identity provenance only**:

- the signed snapshot must be live/operator-approved;
- the separately pinned expected trust-root ID must verify;
- each provider must resolve to exactly one active, non-revoked Ed25519 binding at the attestation time; and
- the attestation must reference that exact provider binding and key ID.

This does **not** broaden `provider_quote_response_authenticate` authority. The registry answers only “which approved Ed25519 identity key belongs to this provider at this time?” The separate promotion evidence policy decides whether a correctly signed observation may count as external evidence.

## Attestation binding

Each attestation binds:

- attestation kind: corroboration or reproducibility;
- provider identity;
- provider key binding ID;
- Ed25519 signing-key ID;
- object ID;
- content SHA-256;
- byte length;
- second-precision UTC attestation time;
- verification-run ID;
- evidence SHA-256;
- exact-byte verification;
- conflict state;
- replay-verification state;
- signature domain and canonicalization; and
- unique nonce.

The signature domain is:

`void.datanet.promotion.independent-attestation.v1`

The canonicalization rule is:

`void.canonical-json.sorted-keys.v1`

The attestation ID is content-derived from the complete signed envelope.

## Independence rule

V1 accepts exactly three attestations.

Two must be `corroboration`; one must be `reproducibility`.

Across all three, these values must each be unique:

- provider ID;
- provider key binding ID;
- Ed25519 signing-key ID;
- verification-run ID;
- nonce; and
- attestation ID.

The reproducer therefore cannot also fill either corroborator slot in v1.

## Reproducibility rule

The reproducibility attestation requires:

`replay_verified=true`

All attestations require:

- `exact_bytes_verified=true`
- `conflict_detected=false`

A signature over a mismatched object, SHA-256, or byte length is still rejected.

## Output

A green set emits the existing collector input:

`VOID_DATANET_PROMOTION_EXTERNAL_EVIDENCE_V1`

Corroboration reports exactly two independent sources.

Reproducibility reports exactly one independent verifier with replay verification.

The evidence source locators include the deterministic attestation-set ID.

## Limits of v1

This gate proves that the three external observations are signed by three distinct provider identities resolved from one approved provider trust snapshot.

It does not yet prove cryptographic separation between those external providers and the original DataNet publisher, because the current Local Data Drop source record does not carry a publisher root-key binding.

That limitation remains explicit rather than being guessed away.

## Publisher-key separation

The source-only `DataNet Promotion Publisher Provenance + Separation v1` verifies a separately signed Local Data Drop publisher provenance envelope and rejects the external evidence if any of the three external Ed25519 keys equals the separately pinned publisher key.

This closes the key-level publisher/attester separation gap while keeping publisher private-key use outside the verifier.

See `docs/architecture/datanet-promotion-publisher-provenance-separation-v1.md`.

## Authority boundary

This gate grants no:

- Chain-2050 write;
- validator vote or validator mutation;
- governance mutation;
- provider registry mutation;
- provider selection;
- quote authority expansion;
- wallet/signer access;
- Work Credit award;
- runtime/service action;
- automatic promotion; or
- funds action.

## Files

- verifier/materializer: `scripts/datanet_promotion_independent_attestation_set_v1.ts`
- proof: `scripts/prove_datanet_promotion_independent_attestation_set_v1.ts`
- schema: `schemas/datanet-promotion-independent-attestation-set-v1.schema.json`
- downstream collector: `scripts/datanet_promotion_evidence_source_collect_v1.mjs`
