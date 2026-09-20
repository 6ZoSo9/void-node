# VOID Node Provenance Baseline V1

**Baseline date:** 2026-09-20  
**Repository:** `6ZoSo9/void-node`  
**Accepted main:** `1de4f02e428b6356f2b7d06adf8b260ad9f8f567`  
**Tree:** `549a24df83d84bf8ec8dd113a833bc52a11bb9f8`

## Purpose

This is a fixed attribution and fingerprint baseline for future public-source
comparisons involving VOID Network.

It does not declare that another project has copied VOID. It preserves exact
identity, chronology, and source fingerprints so a later comparison can start
from evidence instead of memory.

The companion machine-readable record is
`docs/legal/void-node-provenance-baseline-v1.json`.

## Whole-repository anchor

The Git tree
`549a24df83d84bf8ec8dd113a833bc52a11bb9f8`
anchors the complete tracked `void-node` repository state at this baseline.

That tree is the broad fingerprint. The companion JSON separately surfaces
high-value legal and network-identity files for fast comparison.

## Canonical identity facts at baseline

- project: **VOID Network**
- chain ID: **2050**
- official public network name: **VOID Mainnet-0**
- immutable legacy genesis label: **VOID-DEV**
- genesis SHA-256:
  `22f42ef6cfa8e4ebfbc5ea98cdc536ec04c1bb4ddb15885b45b1ac02d0f122ab`
- identity schema: `void.official-network-identity.v1`
- authenticity marker: `VOID_OFFICIAL_NETWORK_AUTHENTICITY_WALL_V1`
- identity revision: `v2.1`
- identity status at this snapshot: **draft_unsealed**
- license identifier: `VCL-1.0`
- forensic registry canonical SHA-256:
  `5dce889d62623b88ad2c294d4c2c941e2ec9b81e9d46a7c89269264a241408ff`

The `draft_unsealed` state is recorded deliberately; this baseline does not
turn an unsigned identity payload into a signed official identity.

## Distinctive fingerprint markers

The existing source-forensic registry and authenticity system expose
non-secret identifiers suitable for comparison, including:

- `VOID_SOURCE_FORENSIC_FINGERPRINT_REGISTRY_V1`
- `VOID_OFFICIAL_NETWORK_AUTHENTICITY_WALL_V1`
- `void.official-network-identity.v1`
- `void.authenticity.identity.v1`
- `void.provenance.release.v1`
- `void.receipt.buy-fulfillment.v1`
- `void.receipt.work-credit-issuer.v1`
- `void.receipt.agent-credential.v1`
- `void.receipt.datanet-attestation.v1`

Project/source identifiers additionally include VOID Network, Chain-2050,
Obelisk Wallet, VoidStones ($VOID), Work Credits ($WC), NullFeed, and VOID
Mainnet-0.

A single generic word or concept is not sufficient evidence. Exact identifiers,
source structures, multiple linked markers, and chronology matter.

## Key immutable file fingerprints

| Path | Git blob SHA-1 |
| --- | --- |
| `genesis.json` | `58d3fa21d6ab95443488ffc8009a70c729ce5061` |
| `LICENSE` | `47f71239e4f5f3ffbb76d59d06ff2b2e6d65f120` |
| `.ci/VCL_LICENSE.txt` | `47f71239e4f5f3ffbb76d59d06ff2b2e6d65f120` |
| `config/source-forensic-fingerprint-registry-v1.json` | `15d59f075bd1f28bfd3a17f6b2c1a2bad610238e` |
| `config/official-network-identity-v1.json` | `62150716534566ef4de7cd4d6e9a029e2ca5c8e4` |
| `schemas/official-network-identity-v1.schema.json` | `bc4dfcd706eff9a98108241befc80e6ebe9c658d` |
| `src/security/official_network_identity_v1.ts` | `5356be5be46547b00c5f891d347430ee046e8172` |
| `scripts/prove_official_network_authenticity_wall_v1.mjs` | `59d7ee3ea04301e00fd3b33fb45d87ccf51bc3ea` |
| `docs/legal/OFFICIAL_NETWORK_AUTHENTICITY_WALL_V1.md` | `680c07210979ae1edbfc6f28c4e9325617ba2cf1` |
| `docs/legal/INFRINGEMENT_EVIDENCE_V1.md` | `bea9af087e7999a6ef873d70e52f48c2e9696393` |
| `docs/legal/TRADEMARKS.md` | `7205d69c874a9db3f5371fed29d534393d15b6d0` |

The root `LICENSE` and `.ci/VCL_LICENSE.txt` have the same Git blob identity
at this baseline.

## Dated public evidence anchors

| Subject | Commit | UTC | Recorded author |
| --- | --- | --- | --- |
| canonical VOID Community License v1.0 and trademark stubs | `6437299c99ad1bef16d759f00b9531af67610e4f` | 2025-10-29T23:07:10Z | 6ZoSo9 / ZoSo |
| genesis.json public repository history | `da5c44a772164953971a31cac178fe48ffe9d009` | 2025-10-31T14:53:26Z | 6ZoSo9 |
| official network authenticity wall, identity schema, fingerprint registry, and infringement evidence format | `48c8413d6dc6f737532e71dc86d80dca91d1eec7` | 2026-07-24T21:10:19Z | 6ZoSo9 |

These are public Git-history anchors, not claims that every underlying idea was
invented at that exact instant.

## Future comparison protocol

When a public project appears materially similar:

1. Capture its public URL, exact commit/revision, timestamp, and relevant bytes.
2. Compare exact blobs and distinctive markers against this baseline.
3. Use the fixed VOID tree to reconstruct any other tracked file when needed.
4. Separate copied expression/identifiers from generic ideas and industry
   conventions.
5. Establish chronology and actual copyright/license ownership.
6. Check whether required VCL/copyright/trademark notices were retained.
7. Record uncertainty and alternative explanations.
8. Escalate only strong evidence for qualified human/legal review.

Strong signals include exact files, exact schemas/markers, the same
Chain-2050/genesis/fingerprint identity represented as another origin, copied
VCL language with attribution stripped, distinctive receipt/gate/proof
structures, or several independent VOID-specific similarities appearing
together.

Generic blockchain, AI-agent, wallet, validator, token, market, EIP-712,
storage, recovery, CI, or networking concepts are weak signals by themselves.

## Existing enforcement boundary

`docs/legal/INFRINGEMENT_EVIDENCE_V1.md` remains controlling for suspected
copying, license breach, or brand impersonation.

Evidence collection is read-only. No automatic complaint, infringement
determination, third-party probing, disruption, credential collection, DMCA
submission, trademark complaint, or legal filing is authorized by this
baseline.

## Integrity

This baseline supplements rather than replaces:

- the VCL v1.0;
- the canonical VCL copy in `.ci/VCL_LICENSE.txt`;
- the official-network authenticity wall;
- the source forensic fingerprint registry;
- the identity schema and verifier;
- the trademark notice; and
- the infringement-evidence procedure.

Its purpose is to preserve a dated, reproducible source-and-identity baseline so
future credit disputes can be evaluated against exact evidence.
