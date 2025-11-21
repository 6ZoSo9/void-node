# VOID Network – Mainnet Genesis Spec (v0.1)

This document defines the **human-readable** specification for the VOID mainnet
genesis block (chainId 2050). It is the canonical description of what MUST be
frozen into `genesis.json` and any equivalent on-disk format used by void-node.

This spec is **normative**; generated JSON/YAML/TOML is a _mechanical_ view.

---

## 1. Scope and goals

Mainnet genesis must:

- Fix the chain identifier to `2050` (VOID mainnet).
- Define the initial set of system contracts and their roles.
- Define the initial validator set (if any) and consensus params.
- Define the initial token state and key balances.
- Be stable: once published and signed, it is never edited in place.
- Be verifiable: every on-disk `genesis.json` can be hashed and checked against
  a signed **Genesis Manifest**.

Out of scope:

- Future protocol upgrades (handled by UpdateGate + Update Manifest).
- Devnet/testnet parameters (covered in separate docs).
- Off-chain deployment pipelines.

---

## 2. Chain identifiers

- `name`: `VOID-MAINNET`
- `chainId`: `2050`
- `networkId`: `2050` (must match chainId for EVM tooling sanity)
- `genesisVersion`: `v0.1`
- `specFile`: `docs/VOID-MAINNET-GENESIS-SPEC.md`
- `manifestFile`: `docs/VOID-MAINNET-GENESIS-MANIFEST.json` (planned)
- `updateGateChain`: `mainnet-core` (matches mainnet-core pillar in Prometheus)

---

## 3. Genesis time and block 0

- `genesisTime`: **TBD** – must be a precise UTC timestamp chosen before launch.
- `blockNumber`: `0`
- `blockHash`: computed from finalized genesis header (not predeclared here).
- `extraData`: MUST contain a human-readable marker, e.g.:

  - `extraData.human`: `"VOID mainnet genesis v0.1 (chainId 2050)"`
  - `extraData.versionTag`: `"v0.1"`
  - `extraData.commit`: `<git commit hash at freeze>`

Constraints:

- Once `genesisTime` and `commit` are fixed, they are never changed.
- Any future re-genesis requires a **new** spec file with a bumped version.

---

## 4. System contracts at genesis

The following contracts are considered **system core** and MUST exist at or
immediately after genesis. Exact addresses are determined by the deployment
pipeline but MUST be fixed and documented in the Genesis Manifest.

Core contracts:

- `AdminGate`
- `UpdateGate`
- `VoidToken` (native ERC-20 representation / accounting)
- `JobQueue` (AI/off-chain job registry)
- `ReceiptRegistry`
- `AgentRegistry`
- `ModelRegistry`
- `DatasetRegistry`
- `WalletOracle` / `ObeliskAgent` bridge (name TBD but role fixed)
- `UpdateRegistry` or equivalent index of accepted update manifests

For each, the manifest will record:

- `name`
- `address`
- `deployer`
- `admin` (typically AdminGate)
- `implementationHash` (code hash or bytecode hash)
- `sourceTag` (git commit / release tag for the contracts repo)

None of these contracts may be **upgradeable via proxies** unless the upgrade
path is explicitly controlled by UpdateGate + AdminGate and documented.

---

## 5. Governance and admin keys at genesis

Main roles:

- **Master Key / AdminGate owner**
  - A single EOA or multi-sig that controls AdminGate at launch.
  - Mapped to the sentinel USB / master-key process on the ops side.
- **Update Signers (M-of-N) for UpdateGate**
  - A fixed list of signer addresses.
  - Threshold `M` and set `N` are encoded in UpdateGate storage.

Constraints:

- AdminGate owner MUST be able to:
  - Add/remove Update Signers (subject to policy).
  - Freeze or unfreeze specific system contracts.
- UpdateGate MUST be the only on-chain source of truth for:
  - Current protocol version.
  - Active Update Manifest hash.
  - Activation heights / windows.

Genesis spec MUST include:

- `admin.masterKey`: `<EOA or multi-sig address>`
- `updateSigners`: list of addresses
- `updateThresholdM`: integer
- `updateSignerCountN`: integer

Values remain `TBD` here and are filled in at freeze time.

---

## 6. Monetary policy at genesis

VoidStones (`$VOID`) token parameters:

- `symbol`: `VOID`
- `name`: `VoidStones`
- `decimals`: `18`
- `initialSupply`: **TBD**, but must be encoded explicitly as a uint256.
- `mintable`: yes/no (policy decision; if yes, mint authority must be AdminGate).
- `burnable`: yes, with on-chain events and clear accounting.

Genesis allocations must specify:

- Foundation / treasury allocation.
- Team / contributor allocations (with optional vesting contracts).
- Ecosystem / community pools.
- Any reserved pools for AI agent incentives, datasets, and validators.

All balances must sum exactly to `initialSupply`. This doc does **not**
hardcode numbers; they are filled out in the manifest and cross-checked by CI.

---

## 7. Validator / consensus parameters

At v0.1 we treat consensus parameters abstractly, since void-node is custom.

Genesis spec MUST cover:

- `consensusEngine`: `"VOID"` (custom).
- Initial validator set:
  - `validators[]` entries with:
    - `pubkey` (node public key / identity)
    - `power` or weight
    - `rewardAddress` (where rewards accrue)
- Block parameters:
  - `targetBlockTimeMs`: `2000` (example; final value TBD)
  - `maxGasPerBlock`: value tuned for AI workloads (TBD)
  - `maxTxPerBlock`: value tuned for safety (TBD, currently small on devnet)
- Finality / epoch structure:
  - `epochLengthBlocks`: integer (TBD)
  - `checkpointIntervalBlocks`: integer (TBD)

This spec intentionally leaves concrete numbers to the `GENESIS-MANIFEST` but
forces them to exist and be validated.

---

## 8. Storage and data layout expectations

Genesis must encode:

- Initial `SegStore` shard layout expectations (e.g. segments per shard).
- WAL settings at block 0 (durability policy).
- Whether the node MUST start with erasure-coding enabled for blobs.

Nodes that see a `genesis.json` that does not meet the minimum constraints
(incorrect chainId, missing system contracts, missing UpdateGate, etc.)
MUST refuse to start.

---

## 9. Hashing and Genesis Manifest

For mainnet, we will publish a **Genesis Manifest**:

- `docs/VOID-MAINNET-GENESIS-MANIFEST.json`

It will contain:

- `genesisSpecVersion`: `"v0.1"`
- `genesisFileHash`: SHA-256 (or stronger) of the exact `genesis.json`.
- `codeHashSet`: list of bytecode hashes for system contracts.
- `systemContractMap`: names → addresses.
- `adminConfig`: admin / update signer addresses and thresholds.
- `timestamp`: manifest creation time (UTC).
- `signatures`: list of signatures from Update Signers / Master Key.

Nodes SHOULD:

- Verify `genesis.json` hash against the manifest.
- Verify signatures before accepting the manifest as canonical.
- Expose a Prometheus gauge that reflects manifest health for mainnet-core.

---

## 10. Invariants and CI checks

The following invariants MUST hold and be enforced by CI before launch:

1. `chainId == 2050` and `networkId == 2050`.
2. All system contracts in §4 are present and wired to AdminGate / UpdateGate.
3. All admin/update addresses in §5 are non-zero and unique where required.
4. Token allocations sum exactly to `initialSupply`.
5. Genesis Manifest hash of `genesis.json` matches what UpdateGate points to.
6. At least one Update Signer and threshold `1 <= M <= N`.

Any violation should fail the **mainnet-core** health gates and block release.

---

## 11. Versioning

- This file: `VOID-MAINNET-GENESIS-SPEC.md` version `v0.1`.
- Changes that alter consensus or genesis layout MUST bump the version and
  create a new spec file (e.g. `v0.2`) instead of editing this one in place.
- Historical specs remain in the repo for auditability.

