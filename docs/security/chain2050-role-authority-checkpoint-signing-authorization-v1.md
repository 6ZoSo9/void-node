# Chain-2050 role-authority checkpoint signing authorization v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_CHECKPOINT_SIGNING_AUTHORIZATION_V1`

This gate records the Sovereign's explicit authorization to create one detached
Ed25519 accepted-checkpoint attestation signature for the exact already-frozen
role-authority deployment checkpoint request.

## Exact authorization

Authorization ID:

`voidcracsa1_1a038fbf89eedf710f02024b2cd9f49bc12af719c00435197929942ffb55fde4`

Checkpoint request:

`voidcracpr1_c6ebb84ea0dace0e16ad310d7826b68acd62ee00fd0d7b0858a3317ae59319f6`

Attestation body SHA-256:

`8a715e70b2633656a1f2e611885670a617b9a47fd4431c90cc7640fa875462f8`

Request-file SHA-256:

`b04f9c072012fddf86d618656db38604f2e3df1f9568669dcad8f25f184aebb2`

Required signer public-key DER SHA-256:

`23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30`

That fingerprint is the dedicated Sovereign Primary USB high-assurance
governance-attestation key. The Recovery USB, premine key, ordinary node key,
and offline Nimo continuity key are not substitutes.

## Scope

Authorized:

- access to the exact Sovereign Primary private key for this signing ceremony;
- creation of at most one detached Ed25519 signature for the exact request;
- local self-verification and public attestation-envelope materialization.

Not authorized:

- Ethereum/Chain-2050 transaction signing;
- transaction broadcast;
- registry append or contract call;
- any Chain-2050 write;
- wallet or treasury action;
- funds movement;
- automatic retry or signing of a modified request.

The signature is governance evidence only. It does not itself execute a runtime
or chain action.

## Next gate

After the offline signature is returned, verify the detached envelope against
the pinned public fingerprint and exact request bytes, then freeze the verified
attestation evidence separately.
