# Chain-2050 role-authority checkpoint-attestation request evidence v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_CHECKPOINT_REQUEST_PRECISION_EVIDENCE_V1`

This record freezes the successful Precision generation of the exact accepted-
checkpoint attestation request for the deployed role-authority registry.

## Deployment truth

- deployment transaction:
  `0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4`
- deployed registry:
  `0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`
- deployment block:
  `37379`
- deployment block hash:
  `0x2c94849809fa4a6a0d4a4aa939a795d7eb5599ab5ec05d01cd3393ce5e2180cc`
- accepted runtime SHA-256:
  `b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d`
- owner:
  `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`
- initial registry state exact and empty.

## Checkpoint evidence

The exact read-only Precision observation proved:

- checkpoint height: `37390`
- checkpoint hash:
  `0x8cd677775b19867d4e52da25e775b23f6ec8dd2ec8e6d9be925f2d53a0547228`
- 12 confirmations observed;
- the ancestry from deployment block 37379 through checkpoint 37390 is exact;
- protocol-consensus/BFT finality is not claimed.

The current Mainnet-0 policy class remains:

`operator_recognized_accepted_checkpoint`

under:

`mainnet0-checkpoint-finality-v1`

## Exact signing request identity

The generated local request is:

- request ID:
  `voidcracpr1_c6ebb84ea0dace0e16ad310d7826b68acd62ee00fd0d7b0858a3317ae59319f6`
- attestation-body SHA-256:
  `8a715e70b2633656a1f2e611885670a617b9a47fd4431c90cc7640fa875462f8`
- request-file SHA-256:
  `b04f9c072012fddf86d618656db38604f2e3df1f9568669dcad8f25f184aebb2`
- required Sovereign Ed25519 public-key DER SHA-256:
  `23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30`

The request file itself remains local on Precision and is not committed by this
evidence lane.

## Authority boundary

This evidence grants no signature authority.

It performs or authorizes no:

- Sovereign private-key access;
- signing;
- transaction broadcast;
- Chain-2050 write; or
- funds movement.

The next gate is a separate explicit Sovereign decision naming the exact
checkpoint request ID above.
