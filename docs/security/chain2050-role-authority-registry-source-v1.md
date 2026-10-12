# Chain-2050 role-authority registry source v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_SOURCE_V1`

Status: **source/proof only; not deployed**.

## Purpose

This lane supplies the missing deployable/readable authority source required by
the authenticated participant-session work in #1648.

It does not add a login route, create a session, deploy a contract, append a
role record, access a signer, or mutate the running Chain-2050 service.

The contract and projection layer deliberately reuse the existing authority
semantics in:

- `chain2050_role_authority_record_v1.ts`;
- `chain2050_role_authority_registry_v1.ts`;
- `chain2050_role_authority_read_adapter_v1.ts`; and
- `chain2050_role_authority_registry_read_source_binding_v1.ts`.

There is one authority model, not an on-chain format plus a separate application
format.

## Contract

`contracts/mainnet0/VoidChain2050RoleAuthorityRegistryV1.sol` is pinned to
Chain ID 2050 at construction.

The registry is owner-written and append-only. Ownership uses a two-step
`owner -> pendingOwner -> acceptOwnership` transition.

The contract accepts the generic closed role syntax already used by the
TypeScript record contract. Current unified-login policy uses the canonical
roles `AGENT`, `VALIDATOR`, and `SOVEREIGN`. The product word
“participant” does not create a fourth role.

### Exact canonical record identity

The contract computes SHA-256 over the same canonical JSON bytes used by
`computeChain2050RoleRecordSha256V1`.

For example, the reviewed AGENT genesis vector:

```text
identity_id                  participant.alice
role                         AGENT
authority_status             active
role_authority_generation    0
subject_binding_sha256       11...11
authority_policy_sha256      22...22
predecessor                  null
transition                   genesis_grant
```

must produce:

```text
role_record_sha256 =
a5c68c57f369e46923a2123330ad03b055361d1005447f6364b612bf5ab5d2ff
```

The Foundry proof checks that literal value.

The caller cannot supply a record digest.

### Exact rolling registry root

The empty registry root is the existing TypeScript value:

```text
d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7
```

Each appended entry computes SHA-256 over the existing canonical registry-root
domain and fields:

```text
chain_id
domain
entry_index
identity_id
previous_registry_root_sha256
role_authority_generation
role_record_sha256
```

The caller cannot supply a registry root.

The AGENT genesis vector above at entry 0 must produce:

```text
registry_root_sha256 =
7d1d4d79c64fbcb8269b56dafcc8ecc573f23683f9989a548208f27f270fd975
```

The Foundry proof checks that literal value as well.

## Transition semantics

Genesis requires:

- generation 0;
- active authority;
- null predecessor;
- `genesis_grant`.

For an existing identity:

- generation must increment by exactly one;
- predecessor must equal the current role-record SHA-256;
- exactly one authority field may change:
  role, status, subject binding, or policy;
- the transition reason must match the changed field.

Status transitions are only:

```text
active  -> revoked : revoke
revoked -> active  : restore
```

An exact same-generation/same-hash replay is accepted as idempotent and
performs no append, event, or root change.

A same-generation/different-hash candidate fails closed.

## Read surface

The contract exposes:

- entry count;
- current registry root;
- exact empty root;
- ordered entry lookup; and
- current entry lookup for one exact identity.

The complete ordered entry includes all record fields plus:

- entry index;
- previous registry root;
- role-record SHA-256; and
- resulting registry root.

This is sufficient for an outside read adapter to reconstruct and independently
validate the canonical append-only state.

## Canonical projection/provider

`chain2050_role_authority_contract_projection_v1.ts` does not trust contract
output merely because it came from the configured address.

A raw snapshot must bind:

- Chain ID 2050;
- exact lowercase contract address;
- exact runtime-code SHA-256;
- exact reviewed empty root;
- exact entry count;
- exact ordered entries; and
- terminal registry root.

The projection reconstructs the existing
`Chain2050RoleAuthorityRegistryV1` object and calls the existing registry
validator. That validator recomputes every role-record digest, predecessor
transition, rolling root, and terminal root.

Only a valid projection may enter the existing registry binding/read adapter.

## Deployment namespace

The projection layer derives:

```text
SHA256(canonical JSON {
  schema: "void.chain2050-role-authority-contract-namespace.v1",
  chain_id: 2050,
  contract_address: <exact lowercase address>,
  runtime_code_sha256: <exact runtime code digest>
})
```

The reviewed registry binding descriptor must carry that value as
`registry_namespace_sha256`.

A changed address or changed runtime code therefore cannot silently retain the
old identity binding.

The existing descriptor separately pins:

- registry contract/source generation;
- query contract/source generation; and
- finality policy generation.

## Proof

Focused source proof:

```bash
npx --no-install tsx \
  scripts/prove_chain2050_role_authority_contract_projection_v1.ts
```

Foundry proof:

```text
test/mainnet0/VoidChain2050RoleAuthorityRegistryV1.t.sol
```

The dedicated workflow checks Solidity 0.8.20 under Foundry v1.7.1 and runs the
TypeScript projection proof plus repository typecheck.

## Activation boundary

This PR does **not**:

- deploy the registry;
- choose or access an owner/deployer key;
- append a role record;
- alter private Chain-2050 RPC state;
- create a public/private HTTP route;
- issue a session;
- enable participant login;
- access a wallet or signer;
- mutate validators or Work Credits;
- sign/broadcast a transaction; or
- move funds.

Production activation requires a separate deployment lineage with exact
contract address/runtime-code evidence, an accepted finality/query transport,
a complete reviewed binding descriptor, and independent host/runtime evidence.

Until that exists, #1648 must keep
`production_session_issuance=false`.
