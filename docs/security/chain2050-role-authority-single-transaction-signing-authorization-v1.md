# Chain-2050 role-authority single-transaction signing authorization v1

This record captures the explicit Sovereign authorization given after the
fresh Precision pre-sign revalidation.

The authorization is **only** for signing the exact transaction identified by:

- signing-request ID:
  `voidcrasr1_2eef907499d684facb777d42c754e23207a02c646dd5e55923e0e0204eeadf2a`
- unsigned transaction hash:
  `0xc5982072b34a49c3f8ead20cd8e358e8711a620f91ff4aeae0e9a7072d600f25`
- deployer:
  `0x4d0a1149d13b03448c56ee6582d161159c5e537f`
- nonce: `0`
- predicted contract:
  `0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`

The signer must be the offline Nimo deployer key already verified for that
address.

This authorization permits generation of the raw signed transaction for
independent verification. It does **not** authorize broadcast, deployment,
registry append, production activation, or any additional funds action.

Any change to chain ID, nonce, bytecode, constructor owner, gas limit, fee caps,
or unsigned transaction hash invalidates this authorization.
