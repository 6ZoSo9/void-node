# Economic Epoch-2 QBFT validator binding v1

Status: source-only HOLD boundary.

This document separates two validator identity domains that must not be conflated during the Epoch-2 Besu transition.

## Economic validator roster

The migrated Epoch-2 staking state contains 126 active VOID validator records with an exact total power of 126,000 VOID. Their ordered roster commitment is:

`0x55ea66fcd73d8e74c0e6baeaa54da5b399c7c3256b5cc9bd296e5540e9079c00`

That roster preserves stake/accounting obligations and VOID validator identity. It does not, by itself, define Besu QBFT validator node addresses.

The offline roster proof is content-addressed by:

- ordered roster material SHA-256: `aa69c4c9e353fe0c7a62d80fdd31554debfc9632e8f19498e3584d68b327f4fc`;
- receipt file SHA-256: `18826de09a3d9513be389b6fa13e82ff73c3b1fff7467845a54df0387598b979`.

The legacy Epoch-1 RPC remains archived and must not be thawed merely to reconstruct this roster.

## VOID consensus identity is not a Besu validator address

The legacy staking contract stores a public `bytes32 consensusKey` value. The newer public-candidate lane instead stores a domain-separated commitment to the VOID node ID:

`keccak256("void:mainnet0:validator-candidate-consensus-key-v1:" + normalizedNodeId)`

For the recorded `candidate-validator-01` node ID:

`53a5268cd87aa0ed5b5cedb24f7ac734`

the modern commitment is:

`0x0abdd5971fcfa405fb29076dbd64540471f35b5418e7e546451d084269e9eea9`

while the legacy public consensus key is:

`0x67a0e5bb8887982681cd0fef8d35ec9a02fc74ac2224dd5fef0e97e101800540`

They are not equal. The repository does not define a lossless conversion from the legacy 32-byte value into a Besu validator address.

Automatic truncation, reinterpretation, hashing, or other conversion of legacy VOID consensus keys into Besu validator addresses is forbidden.

## Besu QBFT identity

For Besu QBFT block-header validator selection, a validator is identified by its Besu node address. The production binding must therefore be built from actual Besu node public keys and addresses, not from the migrated VOID staking fields.

The current four addresses in the client candidate are proof-only placeholders and must never ship:

- `0x1000000000000000000000000000000000000001`
- `0x2000000000000000000000000000000000000002`
- `0x3000000000000000000000000000000000000003`
- `0x4000000000000000000000000000000000000004`

## Required production binding entry

Every production QBFT validator entry must bind, at minimum:

- a stable machine role;
- the VOID node identity;
- the Besu validator address;
- the corresponding Besu public key;
- proof that Besu public-key address export reproduces the exact validator address; and
- a content-addressed node-identity attestation.

No private Besu node key belongs in the repository.

The same Besu validator address, public key, or VOID node ID may not appear twice.

## Minimum set

The binding cannot be promoted with fewer than four independently attested live Besu validator identities.

This is a minimum availability/safety gate, not a claim that four validators are the final desired decentralization level.

The migrated 126-validator economic roster and the initial Besu QBFT block-producing set are separate layers unless a later explicit, proven mapping states otherwise.

## Gate

Until the required real identities exist and production QBFT `extraData` is generated from those exact addresses:

- `qbft_live_identity_manifest_ready=false`
- `qbft_minimum_live_nodes_attested=false`
- `qbft_public_key_address_derivations_verified=false`
- `qbft_production_extra_data_built=false`
- `production_validator_set_bound=false`
- `offline_successor_equivalence_proven=false`
- `migration_authorized=false`
- `public_activation_authorized=false`

This document authorizes no key generation, validator mutation, service action, transaction, migration, or activation.
