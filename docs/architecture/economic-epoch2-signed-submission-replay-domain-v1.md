# VOID Epoch-2 Signed Submission Replay Domain v1

Marker: `VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_REPLAY_DOMAIN_DOC_V1`

Status: **source primitive only — runtime gateway not integrated**

## Purpose

Epoch-2 remains Chain ID 2050. Chain ID alone therefore cannot distinguish an
Epoch-1 raw EVM transaction from an Epoch-2 raw EVM transaction.

This source primitive defines the signature domain required for a future
bounded public submission gateway. It does not activate that gateway.

## Signed intent binding

The EIP-712 signature binds all of the following:

- Chain ID 2050 in the EIP-712 domain;
- execution epoch 2 in the signed value;
- the exact VOID Epoch-2 gateway identity;
- policy generation;
- signer address;
- signer nonce;
- issue time;
- expiry time;
- exact target;
- native value, which must be zero;
- bounded gas limit; and
- exact calldata Keccak-256.

The verifier also requires an external target allowlist and an external
consumed-digest set. A successful verification returns a digest that the real
gateway must atomically consume before any transaction effect can occur.

## Replay rules

A future executable consumer must fail closed on:

1. wrong Chain ID signature domain;
2. execution epoch other than 2;
3. wrong gateway identity;
4. wrong policy generation;
5. non-canonical nonce/timestamp/gas encodings;
6. expired or not-yet-valid intents;
7. TTL over 300 seconds;
8. nonzero native value;
9. gas limit over the policy maximum;
10. target outside the active allowlist;
11. calldata hash mismatch;
12. signer/signature mismatch; and
13. a previously consumed typed-data digest.

Replay consumption must be atomic with admission. A verifier check followed by
a later non-atomic write is not sufficient.

## Raw EVM transaction boundary

This primitive **does not** make raw Ethereum transactions epoch-aware.

A legacy EIP-155 transaction signed for Chain ID 2050 has no
`execution_epoch` field. If such a transaction remains valid under successor
account nonce/state rules and reaches Besu through any raw submission path, the
HTTP intent envelope cannot retroactively protect it.

Therefore these migration gates remain separate and false until independently
proved:

- `execution_epoch_bound_in_public_gateway`;
- `privileged_signer_nonce_or_key_replay_fence_proven`;
- `pending_legacy_signed_transaction_census_complete`; and
- `cross_epoch_replay_protection_proven`.

The production design must keep raw public RPC disabled and must also establish
a consensus-valid/account-nonce fence or equivalent protection for any legacy
raw Chain-2050 transaction that could bypass the bounded gateway.

## Authority boundary

The source primitive:

- does not open a route;
- does not read a wallet or private key;
- does not construct an Ethereum transaction;
- does not call RPC;
- does not submit or broadcast a transaction;
- does not write authoritative Chain-2050;
- does not move VOID or funds;
- does not authorize migration; and
- does not authorize public activation.

The proof uses only fresh ephemeral test signers in memory and never emits their
private keys.
