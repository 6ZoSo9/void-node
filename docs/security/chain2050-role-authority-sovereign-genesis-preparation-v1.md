# Chain-2050 SOVEREIGN genesis preparation v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_PREPARATION_V1`

This lane prepares the first canonical role-authority registry record without
authorizing or performing a Chain-2050 write.

## First registry identity

The intended first identity is:

`sovereign.zoso`

with role:

`SOVEREIGN`

This matches the existing unified-login role vocabulary and the canonical
Sovereign identity used by role-authority sentry proofs.

The account identifier is also `sovereign.zoso`; no extra alias is invented.

## Ordinary authentication subject

The role subject uses the existing generic participant subject-binding schema:

`void.participant-subject-binding.v1`

The ordinary authentication key is the existing main VOID node identity key,
not the Sovereign Primary governance-attestation USB.

Existing externally verified Precision public binding:

- node ID:
  `9d89483769e469e0473b489dc50dba96`
- Ed25519 public-key DER SHA-256:
  `2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b`
- JWK `x`:
  `ejYyFziUrf8A2eRhz9_LJMM2SsMFvrEqVN1iC7m_G4g`
- source:
  `public/public-node/evidence/void-node-onion-binding-v1-nimo-verified.json`

Canonical subject-binding SHA-256:

`7945ba03feac32e5268382a8b995eb7c927a084d9dd1d44598ffb340a12a770e`

## SOVEREIGN authority policy

The exact policy body is stored in:

`ops/mainnet0/chain2050-role-authority-sovereign-policy-v1.json`

Its canonical body SHA-256 is:

`9a8ee80c68cb026b88117710c7d78e8b3063a1c5c2fe1cf6cb555ca80d8f1e75`

The policy preserves existing boundaries:

- a role record proves identity/role authorization state only;
- technical capability is not implied;
- validator, wallet/signer, transaction, WC, treasury, and funds authority are
  not implied;
- the existing main node key remains the ordinary authentication anchor;
- the Sovereign Primary USB remains separate high-assurance governance
  attestation material and is not the routine login key;
- Recovery, premine, and Nimo continuity roles remain separate;
- constitutional authority remains Sovereign-held until a separately
  authenticated explicit handoff;
- a registry append requires a separate explicit Sovereign Chain-2050 write
  authorization.

## Exact genesis candidate

Generation:

`0`

Status:

`active`

Transition:

`genesis_grant`

Predecessor:

`null`

Role-record SHA-256:

`1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b`

Starting empty registry root:

`d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7`

Predicted registry root after exact entry 0:

`54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041`

Preparation ID:

`voidcrasgp1_4aac5c1bb4b7500c9dc15df53f36722a44471b9d52b61063528d49602a2348ee`

## HOLD boundary

The candidate is deliberately:

`append_eligible=false`

until Precision independently proves that the currently running main node is
still using the exact published Ed25519 identity above.

This source lane performs no private-key read, signing, calldata
materialization, nonce/gas selection, transaction broadcast, registry append,
Chain-2050 write, or funds action.

## Next gate

Run the read-only Precision main-node identity observer. If it proves the live
service key derives to the exact published node ID/public identity, freeze that
host evidence and build the genesis append preflight. The append itself remains
a separate explicit Sovereign write gate.
