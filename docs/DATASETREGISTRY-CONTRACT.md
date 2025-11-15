# VOID Network – DatasetRegistry Contract Spec (v1)

DatasetRegistry is the on-chain registry for datasets used by VOID agents and models.

- Tracks: owner, metaHash, active, trusted.
- Anyone can register a dataset (subject to basic validation).
- Owners can update their own dataset metadata and active flag.
- Governance/master can flip the trusted flag and override active in emergencies.
- Off-chain infra (agents, schedulers, wallets) read this registry to decide
  which datasets are allowed for a given job or model.

This spec mirrors the intent of `DatasetRegistry.t.sol` tests:
- master controls `trusted` + ownership,
- owner can update metadata + active,
- registration sets all fields.

---

## 1. Responsibilities

DatasetRegistry MUST:

- Let anyone register a dataset (EOA or contract owner).
- Track, per dataset:
  - `owner`
  - `metaHash` (hash or URI describing the dataset manifest/policy)
  - `active` flag
  - `trusted` flag (set by governance/master)
- Let owners update metadata + `active` for their own dataset(s).
- Let governance flip `trusted` for any dataset.
- Expose read APIs so off-chain infra can filter datasets.

DatasetRegistry MUST NOT:

- Store raw dataset content on-chain (only hashes / URIs / short fields).
- Execute AI or jobs.
- Hard-code any particular model, dataset provider, or storage backend.

## 2. Notes

- This is a v1 stub spec; the Solidity contract + tests are the authoritative
  source of behavior until this document is expanded.
- Future versions may add fields for licensing, provenance, and policy hashes.
