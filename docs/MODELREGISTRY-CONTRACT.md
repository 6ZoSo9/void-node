# VOID Network – ModelRegistry Contract Spec (v1, minimal)

ModelRegistry is the on-chain directory of AI models used by VOID agents.
It does NOT run models or verify outputs. It only tracks:
- Which models exist
- Who owns them
- What hash/URI describes them
- Whether they are active

Nodes and agents may treat this registry as a policy source, but it is not
a consensus rule by itself.

---

## 1. Responsibilities

ModelRegistry must:
- Store entries keyed by a human-readable modelId (string).
- Track owner, hash, uri, active flag, createdAt, updatedAt, version.
- Emit events when models are registered or updated.
- Allow deactivating a model without deleting its history.
- Be controlled by an admin address (AdminGate or master-key-governed contract).

ModelRegistry cannot:
- Guarantee that off-chain model code matches the stored hash.
- Force nodes or agents to use only registered models.
- Perform heavy on-chain checks of AI outputs.

---

## 2. Data Model (intent)

For each modelId, the registry stores:

- owner: address
- hash: bytes32 (content hash or manifest root)
- uri: string (IPFS / HTTPS / VOID manifest, etc.)
- active: bool
- createdAt: uint64
- updatedAt: uint64
- version: uint64 (monotonically increasing)

The Solidity implementation in contracts/ModelRegistry.sol exposes a Model
struct and a mapping from modelId (string) to Model.

---

## 3. Roles and Permissions

- Admin (immutable admin address):
  - Can register new models.
  - Can transfer model ownership.
  - Can deactivate or reactivate models.

- Owner (per-model address):
  - Can update hash, uri, active flag for that model.
  - Can voluntarily deactivate their own model.

Exact function names and signatures are defined in contracts/ModelRegistry.sol;
this document describes the intended behavior and responsibilities only.
