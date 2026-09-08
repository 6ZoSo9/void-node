# Chain-2050 Role Authority Registry + Read-Source Binding v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1`

Status: **source-only contract and proof surface**. This lane does not create a live
Chain-2050 registry, write any chain state, add durable storage, publish a route,
activate a session, invoke Apollyon/Ollama, or grant a technical capability.

## Problem

The merged role-authority record primitive defines the canonical authority pair:

`(role_authority_generation, role_record_sha256)`

The merged read adapter can validate and consume a record from a separately
reviewed source. What was still missing was the deterministic registry/query
contract between those layers:

1. how multiple participant histories are appended without rewriting earlier
   authority state;
2. how one registry state receives a content-addressed append-only root;
3. how a read source is pinned to one reviewed registry/query/finality binding;
4. how descriptor drift or registry-root tampering fails closed; and
5. how the existing read adapter consumes that bound source without treating role
   state as a capability grant.

## Registry contract

`src/security/chain2050_role_authority_registry_v1.ts` defines a pure append-only
registry state machine.

The registry contains:

- exact Chain ID `2050`;
- canonical decimal `entry_count`;
- a terminal `registry_root_sha256`; and
- an ordered sequence of content-addressed entries.

Each entry binds:

- exact append index;
- previous registry root;
- the complete validated role-authority record;
- the record's locally derived `role_record_sha256`; and
- the newly derived registry root.

The rolling registry root domain is
`void.chain2050-role-authority-registry-root.v1`. Each new root binds the previous
root, append index, identity ID, authority generation, and complete record digest.
Because the record digest binds the whole closed record, earlier authority content
cannot be rewritten without changing the registry root chain.

### Per-identity continuity

Multiple identities may be interleaved in one append order. For each identity:

- its first accepted entry must satisfy the existing genesis verifier;
- each later accepted entry must satisfy the existing transition verifier against
  that identity's immediately preceding accepted record;
- exact idempotent replay returns the existing state and does **not** append a
  duplicate entry;
- same-generation/different-hash state fails closed;
- generation skips, predecessor mismatch, invalid transition reasons, identity
  rewrite, and generation exhaustion remain governed by the merged role-record
  primitive; and
- revoke -> restore advances authority generation, so an older authority pair is
  never current again merely because status/role later resembles an older state.

Registry validation recomputes every entry root and transition from genesis to the
terminal root. Unknown fields, count drift, entry-index drift, prior-root drift,
record-hash drift, duplicate replay entries, malformed records, and terminal-root
drift fail closed.

## Read-source binding contract

`src/security/chain2050_role_authority_registry_read_source_binding_v1.ts` binds a
registry snapshot provider to the merged read-adapter source interface.

The exact reviewed descriptor contains:

- Chain ID `2050`;
- binding schema/kind and stable binding ID;
- `registry_namespace_sha256`;
- `registry_contract_sha256`;
- `query_contract_sha256`; and
- `finality_policy_sha256`.

The descriptor itself is content-addressed. Source creation requires the provider
and expected descriptor to match exactly. Every read recomputes the provider's
current descriptor digest before accepting a snapshot, so post-creation binding
drift fails closed.

One source read obtains one registry snapshot. The snapshot is cloned, fully
validated against the append-only registry contract, and then the requested
identity's latest record is returned to the existing read adapter. The adapter
still derives `role_record_sha256` locally and still applies expected-pair and
active/revoked checks.

## Canonicality boundary

This contract deliberately does **not** claim that a caller becomes canonical by
setting the right string fields or hashes.

A production binding still needs a separately reviewed implementation proving
that:

- the registry namespace is the authoritative Chain-2050 participant-role
  namespace;
- the query actually observes that namespace at the required finality policy;
- the descriptor hashes identify the deployed/reviewed query and registry
  contracts rather than arbitrary local code; and
- durable storage / recovery preserves the append-only state and trusted root
  across process and host failure.

Until that production deployment/query evidence exists:

`live_chain_registry_bound=false`

The adapter/source contracts are necessary verification surfaces, not a substitute
for deployment evidence.

## Storage collision boundary

This PR intentionally adds **no filesystem, SegStore, JSONL, database, or other
durable storage implementation**. PR #1352 owns the active segmented-storage
recovery/authority lane during moving-week safe mode. This registry remains a
pure state contract so the two lanes do not compete for durable-root authority.

A later integration may consume a reviewed durable store only after its own
storage/recovery authority DoD is complete and an explicit reconciliation lane is
opened.

## Proof coverage

`scripts/prove_chain2050_role_authority_registry_binding_v1.ts` covers:

- deterministic empty root;
- genesis append;
- exact replay as no-op;
- interleaved independent identities;
- revoke/restore ABA protection;
- current-record reads;
- same-generation/different-hash rejection;
- generation-skip rejection;
- predecessor-hash rejection;
- non-genesis first-record rejection;
- terminal and intermediate registry-root tampering;
- entry-count and unknown-field tampering;
- exact binding-descriptor digest;
- adapter-compatible bound reads;
- revoked observation / active fail-closed behavior;
- snapshot tampering;
- descriptor drift;
- mismatched expected binding; and
- provider read failure.

The focused workflow runs on Node 22, 24, and 26, re-proves the underlying
role-authority record and read-adapter contracts on Node 24, self-enforces its own
trigger/proof dependency set, and runs committed-range diff hygiene.

## Non-activation boundary

This source lane does not:

- create or mutate production Chain-2050 state;
- activate a live participant-role registry;
- integrate durable registry storage;
- add an HTTP/RPC route or listener;
- access a private key, wallet, or signer;
- sign or submit a transaction;
- create a session;
- activate `void.capability.node.read_status.v1`;
- designate Apollyon to office;
- invoke an Ollama/model provider;
- restart, enable, or deploy a service;
- mutate validator state or Work Credits; or
- move funds.

`authority_granted=false`
`capability_promoted=false`
`office_designated=false`

## Next gate

After this source contract is independently reviewed, the next separately
authorized step is a production canonical query/deployment binding that proves
where the registry lives on Chain-2050 and how its durable trusted root survives
recovery. Only after that binding is reviewed can the already-qualified Apollyon
read-only sentry consume canonical role state.
