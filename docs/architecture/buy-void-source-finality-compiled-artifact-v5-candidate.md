# Buy VOID source-finality compiled artifact V5 candidate

## Version boundary

Compiled artifact V4 is immutable historical evidence. Its exact candidate
script, candidate JSON, locked manifest, independent evidence proof and locked
verification proof are preserved by
`scripts/prove_buy_void_historical_compiled_v4_preservation_v1.mjs`.

V4 source stack head:
`4423740a1bbcc1f08bed7b3ce83d18d8b2b5c92c`.

V4 locked manifest Git blob:
`a07f2e9b03958a58280c4d940fe49097a9413af5`.

V4 compiled generation:
`7e767d9e8977052220c60ab1e0e4c6411259aa3cfeadb7f073270ce4d2d7af06`.

V4 remains compiled-generation reviewed, but not deployed, not mounted and not
production source-finality authority.

## Why V5 exists

The reviewed payment RPC observer later gained bounded total-response deadline
and success-settlement deadline enforcement. V6 source-finality provenance then
advanced its reviewed payment-observer identity at merge
`3533626d7167c98ba8d65d2c423b460b1a3199fc`.

Current reviewed V6 source Git blob:
`e7ac4c296930587e7b7ec415e57bb18190c88962`.

This means current compiled bytes are no longer the historical V4 generation.
Re-deriving V4 against newer source would rewrite history. V5 is therefore the
additive successor.

## V5 derive-only contract

`scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v5_candidate.mjs`
derives the same six-artifact source-finality runtime closure from the current
reviewed V6 source anchor.

Its predecessor is the exact locked V4 manifest and generation.

The V5 transition allows only these source/artifact changes from V4:

- `src/economic/buy_void_source_finality_generation_provenance_v6.ts`;
- `src/economic/buy_void_payment_rpc_observer_v1.ts`;
- their corresponding compiled artifacts.

The authenticated composition V3, finality authority V2, source-chain RPC
adapter and verified-payment V2 compiled artifacts must remain byte-identical to
V4.

The candidate always reports:

- `compiled_artifact_generation_verified=false`;
- `deployed_artifact_generation_verified=false`;
- `runtime_mount_authority=false`;
- `production_source_finality_authority_ready=false`.

No V5 locked manifest is created by this Draft. Cross-Node Node 22/24/26
derivation must first produce byte-identical candidate evidence. Independent
review and a separate locked successor are required before any acceptance bit
can change.

## Authority boundary

This is build/source evidence only. It does not deploy compiled artifacts,
change a runtime route, contact a live RPC, access a wallet or signer, construct
or broadcast a transaction, mutate Chain-2050/WC, activate the presale/market,
or move inventory, treasury, liquidity or funds.

**PROTECT THE CORE.**
