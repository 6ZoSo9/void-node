# DataNet Promotion Evidence Collector v1

Marker: `VOID_DATANET_PROMOTION_EVIDENCE_COLLECTOR_DOC_V1`

Status: source-only, GET-only evidence collection. It does not mutate DataNet, write Chain-2050, access a wallet/signer, mutate validators, award Work Credits, restart services, or move funds.

Parent evidence-map generator:
`VOID_DATANET_PROMOTION_EVIDENCE_MAP_GENERATOR_DOC_V1`

## Purpose

This collector turns existing public DataNet evidence into the exact
`VOID_DATANET_PROMOTION_EVIDENCE_SOURCE_V1` bundle consumed by the promotion-candidate generator.

The path is:

```text
public DataNet routes
+ explicit external corroboration/reproducibility
    -> source bundle
    -> evidence map
    -> Phase-0 promotion candidate
    -> operator review
```

No later hop is implicit.

## Node-derived evidence

The collector reads only:

- `/public-node/local-data-drop/weighted.json`
- `/public-node/local-data-drop/manifest.json`
- `/public-node/local-data-drop/proof/:sha256.json`
- `/public-node/local-data-drop/by-sha256/:sha256`
- `/public-node/local-data-drop/:objectId`

It requires one exact weighted record and one exact manifest record for the requested object ID.

The weighted record and manifest must agree on content SHA-256.

The proof JSON must agree on:

- object ID;
- SHA-256;
- byte length;
- receipt marker and receipt SHA-256;
- current-object receipt validity; and
- public-read-only / operator-local / non-network-truth policy.

The collector fetches the payload both by object ID and by content address. Both byte streams must:

- have the committed byte length;
- hash to the same committed SHA-256; and
- be byte-for-byte identical.

V1 has a narrower collector object-size ceiling of 16 MiB. Larger DataNet objects HOLD until a separately reviewed streaming collector exists.

## Dedupe evidence

V1 derives dedupe state from the exact public manifest generation.

The requested object ID must occur exactly once.

If another manifest object names the same content SHA-256, the collector records:

`duplicate_detected=true`

The collector still emits the source bundle so the downstream generator can preserve the distinction between **observed evidence** and **promotion eligibility**. The generator then HOLDs the candidate.

## Availability evidence

One successfully fetched and locally re-hashed content-addressed object proves one verified replica for this collector generation.

V1 therefore emits:

- `verified_replica_count=1`
- `exact_bytes_verified=true`

This does not claim network-wide redundancy.

## External evidence boundary

A single closed external-evidence bundle supplies only the signals one node cannot honestly prove about itself:

- corroboration by at least two independent sources; and
- at least one independent verifier with replay verification.

Schema:

`schemas/datanet-promotion-external-evidence-v1.schema.json`

The evidence-generation hashes are content-derived. A caller-chosen 64-character digest is insufficient.

External evidence must use bounded `evidence://` locators and carries no Chain, validator, governance, wallet, WC, service, or funds authority.

## Signed independent-attestation source

The source-only `DataNet Promotion Independent Attestation Set v1` can materialize this collector's external-evidence bundle from three registry-resolved Ed25519 attestations:

- two distinct corroborators; and
- one third, distinct reproducer.

It reuses the existing operator-signed provider trust snapshot for identity provenance only and does not expand provider quote authority.

See `docs/architecture/datanet-promotion-independent-attestation-set-v1.md`.

## Neutral requester weights

The collector is not a requester-specific ranking policy.

It therefore emits equal neutral weights:

```text
8 dimensions × 1250 bps = 10000 bps
```

A later requester may apply a separately explicit overlay without changing the baseline evidence.

## Determinism

The caller supplies `--observed-at` explicitly.

Given the same:

- public route responses;
- external evidence bundle;
- object ID; and
- observation timestamp,

the source bundle is deterministic.

## Network boundary

V1 accepts only root `http://` or `https://` bases.

It rejects:

- embedded username/password credentials;
- query strings;
- URL fragments; and
- non-root base paths.

Redirects are not followed.

JSON responses are bounded to 2 MiB and object bodies to 16 MiB.

## HOLD boundary

The collector exits `3` and writes no source bundle when required evidence cannot be trusted, including:

- missing external evidence;
- route fetch failure or non-200 status;
- invalid route markers;
- non-unique requested object identity;
- weighted/manifest SHA mismatch;
- proof identity, SHA, byte-length, receipt, or policy mismatch;
- fetched byte-length or SHA mismatch;
- disagreement between object-ID and content-addressed fetches;
- external object/SHA mismatch;
- external evidence-generation hash mismatch;
- insufficient corroboration;
- external conflict;
- missing independent reproducer; or
- authority escalation.

Malformed invocation or local output/write failure exits `2`.

## Authority boundary

The collector emits:

- Phase 0 only;
- `PHASE0_OPERATOR_ROOTED`;
- validator admission authority inactive;
- source-only;
- public-read-only;
- no Chain-2050 write;
- no validator mutation;
- no governance mutation;
- no wallet/signer access;
- no WC award;
- no runtime/service action; and
- no funds action.

## Files

- collector: `scripts/datanet_promotion_evidence_source_collect_v1.mjs`
- proof: `scripts/prove_datanet_promotion_evidence_collector_v1.mjs`
- external evidence schema: `schemas/datanet-promotion-external-evidence-v1.schema.json`
- example external evidence: `fixtures/architecture/datanet-promotion-external-evidence-v1.green.json`
- downstream generator: `scripts/datanet_promotion_candidate_generate_v1.mjs`
