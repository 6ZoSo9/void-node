# WC/VOID market-vault at-use revalidation v1

Marker: `VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1`

Status: read-only evidence collection and source-only re-verification. This lane
does not deploy, fund, activate, sign, broadcast, grant roles, or update
canonical candidates.

## Purpose

A historical market-vault runtime attestation can prove what was observed when
it was collected, but it must not become fresh again merely because a later
canary envelope gives it a new timestamp.

This contract therefore reuses the existing reviewed market-vault runtime
attestation engine at the time the evidence is needed and produces a separate
content-addressed **at-use** artifact.

The current coupled launch is bound in both representations:

```text
opening_domain_coupled_launch_id=
sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26

vault_coupled_launch_id=
0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26
```

## Read-only collection

`collectWcVoidMarketVaultAtUseRevalidationV1(...)` accepts only:

- the reviewed compiled-identity acceptance packet;
- exact deployment/role/launch bindings;
- minimum finality confirmations; and
- the existing injected read-only RPC transport.

It does **not** accept an observation timestamp.

The collector records its own UTC start and completion time with `Date.now()`
around the existing runtime attestation. The wrapped transport also requires
the exact attested head-block responses to expose a block timestamp.

No new RPC method is introduced. The underlying attestation remains limited to:

- `eth_chainId`;
- `eth_getTransactionReceipt`;
- `eth_blockNumber`;
- `eth_getBlockByNumber`;
- `eth_getCode`; and
- `eth_call`.

## Freshness model

The source maximum age is 600 seconds.

Freshness is anchored to the **attested Chain-2050 head block timestamp**, not
to the later canary wrapper:

```text
valid_until = attested_head_block_timestamp + 600 seconds
```

The collector requires:

- both reads of the exact attested head number/hash to carry the same timestamp;
- collection duration at most 30 seconds;
- the head timestamp not more than 30 seconds ahead of the collector wall clock;
- the head timestamp not already older than 600 seconds when collection
  completes; and
- collector completion to remain inside the head-derived validity window.

Re-running the collector around an old/stalled head therefore cannot extend that
head's validity window.

## Semantic revalidation

The artifact embeds the complete reviewed compiled-identity acceptance packet,
the complete runtime attestation, and an exact expected binding. Source-only
re-verification first reconstructs the deployed runtime from the acceptance
packet plus the attested immutable deployment bindings and requires exact
runtime byte length, SHA-256, and Keccak-256 equality. It then passes the
attestation through `importWcVoidMarketVaultRuntimeAttestationV1`, which
independently rechecks:

- Chain 2050 / execution epoch 2;
- deployment transaction and deployment block;
- current accepted compiled identity;
- reconstructed deployed runtime;
- canonical VoidToken and token runtime;
- launch controller, settlement executor, and closeout controller;
- reviewed coupled launch ID;
- exact 10,000,000 VOID opening inventory in both vault reserve and token
  balance;
- inventory lock;
- preactivation state;
- deployment finality; and
- all no-activation/no-funds authority fields.

The existing runtime import intentionally still reports
`production_candidate_binding_ready=false` and
`freshness_revalidation_required=true`. This at-use layer does not weaken that
contract; it supplies the missing fresh semantic evidence for later consumers.

## Content identity

The at-use material is content-addressed. One SHA-256 identity is exposed in the
shape already required by the bounded-canary candidate:

```text
at_use_evidence_sha256=sha256:<digest>
market_vault_runtime_verification_evidence_id=sha256:<same digest>
inventory_lock_evidence_id=sha256:<same digest>
revalidation_id=voidwcmvau1_<same digest>
```

The digest covers the embedded runtime attestation, semantic import binding,
observed head, chain-head timestamp, collector interval, validity deadline,
launch identity, deployment identity, and authority boundary.

## Source-only later verification

`verifyWcVoidMarketVaultAtUseRevalidationV1(...)` performs no RPC. It
recomputes the artifact identity, reruns the semantic runtime-attestation
import over the embedded bytes/object, checks timing consistency, and requires
the supplied evaluation time to be between collector completion and the
head-derived validity deadline.

Issue #2199 may consume this artifact only after it independently verifies its
real serialized bytes and SHA-256. A green at-use artifact is still **not**
`bounded_canary_green=true` by itself.

## Authority

```text
read_only_rpc_collection=true
injected_transport_required=true
collector_wall_clock_read=true
chain_head_timestamp_bound=true
source_only_reverification=true

filesystem_write=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
inventory_funding=false
inventory_movement=false
market_activation=false
public_presale_activation=false
candidate_mutation=false
funds_movement=false
```

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_at_use_revalidation_v1.mjs
```
