# Chain-2050 role-authority verified checkpoint-attestation evidence v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_CHECKPOINT_VERIFIED_ATTESTATION_EVIDENCE_V1`

This evidence closes the deployment-finality lane for the Chain-2050
role-authority registry under the explicit Mainnet-0 operator-recognized
checkpoint policy.

## Verified chain

The following exact chain of evidence is bound:

1. Deployment transaction:
   `0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4`
2. Deployment block:
   `37379`
3. Deployment block hash:
   `0x2c94849809fa4a6a0d4a4aa939a795d7eb5599ab5ec05d01cd3393ce5e2180cc`
4. Checkpoint:
   `37390`
5. Checkpoint hash:
   `0x8cd677775b19867d4e52da25e775b23f6ec8dd2ec8e6d9be925f2d53a0547228`
6. Confirmation count:
   `12`
7. Exact ancestry from the deployment block through the checkpoint:
   verified.
8. Sovereign Primary DER SHA-256:
   `23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30`
9. Detached Ed25519 checkpoint signature:
   independently verified.

## Exact attestation identities

Authorization:

`voidcracsa1_1a038fbf89eedf710f02024b2cd9f49bc12af719c00435197929942ffb55fde4`

Checkpoint request:

`voidcracpr1_c6ebb84ea0dace0e16ad310d7826b68acd62ee00fd0d7b0858a3317ae59319f6`

Checkpoint attestation:

`voidcraca1_25d9de92520f6e1f5d230bec8ea9fcbb0de1456e0a74c9bbfaf901eff688a414`

Verified-attestation evidence:

`voidcracve1_db9f9f06c2de57efb90c82da6020cf71e11d9229316394a07941ffe167ea9bfd`

Request-file SHA-256:

`b04f9c072012fddf86d618656db38604f2e3df1f9568669dcad8f25f184aebb2`

Attestation-body SHA-256:

`8a715e70b2633656a1f2e611885670a617b9a47fd4431c90cc7640fa875462f8`

Detached-envelope SHA-256:

`411035b72fc0ac3f7caa3762693b8a16d5b27515cfadd506e5d74c73fe10848b`

The local detached envelope is intentionally not committed. The repository
binds it by its exact cryptographic identity and records the successful
independent verification.

## Finality semantics

This evidence establishes:

- `operator_recognized_canonical_checkpoint_verified=true`
- `chain_finality_verified_under_mainnet0_policy=true`
- `protocol_consensus_finality_claimed=false`

Mainnet-0 does not claim that this operator checkpoint is validator-quorum or
BFT hard finality.

## Authority boundary

This evidence gate performs and authorizes no:

- private-key access;
- new signature;
- transaction signing or broadcast;
- Chain-2050 write;
- role-authority registry append;
- wallet, treasury, or funds action.

The one Sovereign signature is a historical fact already completed and
verified. This evidence does not authorize another signature.

## Next gate

The deployment-finality prerequisite is closed. A future lane may prepare the
first role-authority registry genesis record or bind the deployed registry into
participant role/session activation. Any Chain-2050 state write remains a
separate explicit authority gate.
