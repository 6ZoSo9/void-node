# DataNet Promotion Publisher Provenance + Separation v1

Marker: `VOID_DATANET_PROMOTION_PUBLISHER_SEPARATION_DOC_V1`

Status: source-only verification/composition. This lane does not read or use the publisher private key. It verifies a separately produced Ed25519 signature.

## Purpose

The independent-attestation set proves that two corroborators and one reproducer are distinct from each other.

This gate adds the missing publisher-side comparison:

1. verify an exact signed publisher-provenance envelope against a separately pinned expected Ed25519 key;
2. bind that signature to the exact Local Data Drop receipt, object ID, SHA-256, byte length, and import time;
3. materialize the existing independent-attestation set; and
4. reject the external evidence if any of the three external signing keys equals the publisher signing key.

A green result proves key-level separation between the publisher and every external corroborator/reproducer.

## Publisher key handling

The repo tool receives only:

- the Local Data Drop receipt;
- the publisher public key;
- a separately pinned expected publisher key ID;
- the signed provenance envelope.

It does not open, locate, derive, request, or use a publisher private key.

The signing domain is:

`void.datanet.promotion.publisher-provenance.v1`

The key ID is the existing VOID Ed25519 SPKI SHA-256 identity form:

`ed25519:<sha256(spki-der)>`

## Local receipt binding

The provenance envelope binds the exact V1 Local Data Drop receipt fields:

- marker;
- object ID;
- byte length;
- SHA-256;
- import time;
- storage class;
- public-upload false;
- operator-local-import-only true; and
- trusted-as-network-truth false.

The canonical Local Data Drop receipt SHA-256 is included in the signed provenance payload.

## Publisher separation

The composition gate obtains the three registry-resolved external signing-key IDs from the merged independent-attestation-set verifier.

It HOLDs if the publisher key ID appears among those external keys.

This closes the key-level publisher/attester independence gap that remained explicit in the previous gate.

## What this does not prove

V1 proves possession of the separately pinned publisher key and binds that key to a signed claim over the exact import receipt.

It does not mutate the Local Data Drop import helper or claim that every historical Local Data Drop receipt was signed at import time.

A later runtime integration can require this provenance receipt at import/publication time without changing this verification contract.

## Complete Phase-0 packet assembly

The source-only `DataNet Promotion Packet Assembly v1` composes this publisher-separation gate with the GET-only live evidence collector, evidence map, hard gates, and Phase-0 candidate generator.

It publishes an atomic five-file local packet only when the complete chain is green. A completed packet remains operator-review-only and carries no Chain-2050 write authority.

See `docs/architecture/datanet-promotion-packet-assembly-v1.md`.

## Authority boundary

No:

- publisher private-key access;
- DataNet mutation;
- Chain-2050 write;
- validator vote or mutation;
- governance mutation;
- provider-registry mutation;
- wallet/signer access;
- Work Credit award;
- runtime/service action;
- automatic promotion; or
- funds action.

## Files

- verifier/composer: `scripts/datanet_promotion_publisher_provenance_separation_v1.ts`
- proof: `scripts/prove_datanet_promotion_publisher_provenance_separation_v1.ts`
- schema: `schemas/datanet-promotion-publisher-provenance-v1.schema.json`
- upstream attestation set: `scripts/datanet_promotion_independent_attestation_set_v1.ts`
