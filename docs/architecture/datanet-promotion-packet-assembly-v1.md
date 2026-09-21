# DataNet Promotion Packet Assembly v1

Marker: `VOID_DATANET_PROMOTION_PACKET_ASSEMBLY_DOC_V1`

Status: source-only local assembly with GET-only DataNet reads. This lane does not mutate DataNet, write Chain-2050, activate validators, access a publisher private key, award Work Credits, restart services, or move funds.

## Purpose

This is the complete mechanical DataNet-to-review membrane for Phase 0.

One bounded assembly requires, in order:

1. exact Local Data Drop receipt;
2. separately pinned, signed publisher provenance;
3. operator-signed provider trust snapshot;
4. two distinct signed corroborators;
5. one third distinct signed reproducer;
6. publisher key distinct from all three external signing keys;
7. live public DataNet weighted/manifest/proof/byte evidence;
8. the eight-dimension evidence map and hard gates; and
9. the Phase-0 promotion candidate.

A green run produces a packet for **operator review only**.

It does not write Chain-2050.

## Atomic output

The output directory must not already exist.

Assembly occurs in a sibling staging directory. The completed directory is renamed into place only after every gate passes and the exact five-file output set is present.

The completed packet contains:

- `external-evidence.json`
- `source-bundle.json`
- `evidence-map.json`
- `promotion-candidate.json`
- `assembly-manifest.json`

If any upstream verification or downstream ranking/admission gate fails, the staging directory is removed and no completed output directory remains.

## Input commitments

The assembly manifest commits to canonical SHA-256 values for:

- Local Data Drop receipt;
- publisher provenance envelope;
- provider trust snapshot; and
- independent attestation set.

It also commits to the generated external evidence, source bundle, evidence map, and promotion candidate.

The signed input files themselves are not copied into the completed packet.

## Live evidence

The assembly calls the merged GET-only promotion evidence collector.

The collector re-fetches and re-hashes the DataNet object by both object ID and content address, verifies manifest/proof/receipt state, derives dedupe and one-replica availability evidence, and binds the signed external evidence.

A stale, suspicious, duplicate, mismatched, or otherwise unqualified live state cannot be repaired by the signed inputs.

## Candidate boundary

The downstream generator must return:

- Phase `0`;
- `PHASE0_OPERATOR_ROOTED`;
- validator admission authority inactive;
- `PHASE0_OPERATOR_REVIEW_ONLY`;
- `canonical_write_authorized=false`; and
- `automatic_promotion=false`.

The assembly independently rechecks these outputs before publishing the packet.

## Authority boundary

The completed assembly manifest states:

- evidence only;
- no DataNet mutation;
- no Chain-2050 write;
- no validator authority;
- no governance mutation;
- no signer/wallet access;
- no WC award;
- no runtime/service action; and
- no funds action.

## Failure examples

The proof requires that no completed packet remain after:

- same-length live byte tampering;
- stale weighted evidence;
- wrong publisher key pin; or
- publisher/external-attester key collision.

## Files

- assembler: `scripts/datanet_promotion_packet_assembly_v1.ts`
- proof: `scripts/prove_datanet_promotion_packet_assembly_v1.ts`
- manifest schema: `schemas/datanet-promotion-packet-assembly-v1.schema.json`
- publisher separation: `scripts/datanet_promotion_publisher_provenance_separation_v1.ts`
- collector: `scripts/datanet_promotion_evidence_source_collect_v1.mjs`
- candidate generator: `scripts/datanet_promotion_candidate_generate_v1.mjs`
