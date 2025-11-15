# VOID Network – ModelRegistry Contract Spec (v1)

ModelRegistry is the on-chain registry for AI models used by VOID agents and apps.

- Tracks: owner, metaHash, active, trusted.
- Anyone can register a model (subject to basic validation).
- Owners can update their own model metadata and active flag.
- Governance/master can flip the trusted flag and override active in emergencies.
- Off-chain infra (agents, schedulers, wallets, dApps) read this registry
  to decide which models are allowed for a given job or use case.

This spec mirrors the intent of `ModelRegistry.t.sol` tests:
- master controls `trusted` + ownership,
- owner can update metadata + active,
- registration sets all fields.

---

## 1. Responsibilities

ModelRegistry MUST:

- Let anyone register a model (EOA or contract owner).
- Track, per model:
  - `owner` (who controls updates)
  - `metaHash` (hash or URI for model manifest: arch, version, license, etc.)
  - `active` flag (owner- or governance-controlled)
  - `trusted` flag (set by governance/master)
- Let owners update `metaHash` and `active` for their own model(s).
- Let governance flip `trusted` for any model.
- Expose read APIs so off-chain infra can filter models.

ModelRegistry MUST NOT:

- Store raw model weights or large blobs (only hashes / URIs / short fields).
- Execute inference on-chain.
- Hard-code any particular provider, format, or storage backend.

## 2. Notes

- This is a v1 stub spec; the Solidity contract + tests are the authoritative
  source of behavior until this document is expanded.
- Future versions may add:
  - explicit versioning fields,
  - evaluation/provenance references,
  - linkage to DatasetRegistry entries and JobQueue receipts.
