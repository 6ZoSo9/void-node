# DataNet Phase-0 Canonical Preparation Intent v1

Marker: `VOID_DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_DOC_V1`

Status: source-only preparation intent. It does not deploy a contract, select a deployment address, construct calldata or a transaction, access a signer/wallet, broadcast, mutate Chain-2050, or move funds.

## Purpose

The merged Sovereign review gate can explicitly approve one exact Phase-0 promotion packet for **separate canonical preparation**.

This lane defines what that preparation means without letting approval collapse directly into execution.

A valid intent requires the exact signed approval and binds the candidate's canonical commitment tuple to the reviewed source contract:

`DatanetContentCommitmentRegistryV1.commit(bytes32,bytes32,uint64)`

The commitment tuple is:

- `object_id_sha256`
- `content_sha256`
- `byte_length`

## Required approval

The verifier re-runs the signed Sovereign review decision over the exact packet.

`HOLD` and `REJECT` cannot produce a preparation intent.

The production wrapper pins the existing Sovereign Primary governance-attestation fingerprint. CI/proof uses only an ephemeral test key and proves that the production wrapper rejects it.

## Source contract binding

The intent binds the reviewed source path and exact source SHA-256 for:

`contracts/mainnet/DatanetContentCommitmentRegistryV1.sol`

The source is checked for the existing v1 invariants:

- registry version 1;
- 256 MiB object ceiling;
- publisher-only `commit`;
- one-shot predecessor-aware `isCommitted` rejection; and
- `ContentCommitted` event surface.

Source binding is not deployment binding.

## Deliberately unresolved deployment fields

V1 emits:

`deployment_binding.status = UNBOUND_REQUIRED`

and leaves these null:

- registry address;
- publisher address;
- predecessor address.

It also keeps these unverified:

- exact Chain-2050 deployment;
- deployed-code match;
- publisher binding;
- predecessor lineage;
- current object-uncommitted state.

A later reviewed gate must fill those facts using read-only Chain-2050 evidence.

## No transaction construction

The intent names the ABI function signature and arguments but does not emit:

- destination address;
- calldata;
- nonce;
- gas;
- fee fields;
- signer;
- signed transaction; or
- broadcast request.

`calldata_construction_authorized=false`

`transaction_construction_authorized=false`

## Fresh one-shot preflight

Because the registry is one-shot across its selected predecessor lineage, a future construction gate must perform a fresh read-only:

`isCommitted(object_id_sha256) == false`

against the exact deployment immediately before transaction construction becomes eligible.

An old observation cannot substitute for that gate.

## Post-commit truth

Even a future successful broadcast is not canonical truth by itself.

The intent preserves mandatory post-commit requirements for:

- `ContentCommitted` event receipt membership;
- receipt revalidation;
- canonical block binding;
- accepted-checkpoint membership; and
- Chain-2050 finality under the reviewed policy.

## Authority boundary

This lane grants no deployment, address selection, publisher selection, predecessor selection, calldata construction, transaction construction/signing/broadcast, Chain write, validator authority, governance mutation, service action, wallet/signer access, WC award, funds action, or automatic promotion.

The next gate is:

`REVIEWED_DEPLOYMENT_AND_LINEAGE_BINDING_REQUIRED`
