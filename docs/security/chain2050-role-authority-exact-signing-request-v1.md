# Chain-2050 role-authority exact signing request v1

## Purpose

Freeze the exact role-authority registry deployment transaction that may later
be presented to the offline Nimo deployer signer.

This source gate does **not** authorize or perform signing.

## Exact transaction

- chain ID: `2050`
- deployer: `0x4d0a1149d13b03448c56ee6582d161159c5e537f`
- nonce: `0`
- to: contract creation
- value: `0`
- gas limit: `2402981`
- max fee: `3000000000` wei/gas
- max priority fee: `1000000000` wei/gas
- predicted registry:
  `0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`
- unsigned transaction hash:
  `0xc5982072b34a49c3f8ead20cd8e358e8711a620f91ff4aeae0e9a7072d600f25`
- candidate fingerprint SHA-256:
  `a67c90c030cc3a728ca611b620fe4ae8598a47284b2ca69238717583062c6c42`

## Funding evidence

The deployer was funded by:

`0x5ac002fc33cbb02500b4be35aa875a4676848cf01892f3944c60fc58ec81002a`

at block `37378`, with exactly `7208943000000000 wei`.

## Fresh pre-sign evidence

At block `37378`:

- deployer nonce remained 0;
- deployer balance equaled the exact maximum candidate gas liability;
- predicted registry address remained empty;
- exact deployment gas estimate remained `2002484`;
- 120% gas limit remained `2402981`;
- current fee observations remained within the reviewed fee caps;
- the unsigned transaction hash and candidate fingerprint remained unchanged.

## Authority boundary

This packet remains:

`HOLD_PENDING_EXPLICIT_SOVEREIGN_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION`

It does not read a private key, sign, broadcast, deploy, append a registry
record, activate production, or move funds.

An explicit Sovereign authorization must identify this exact unsigned
transaction hash (or the generated signing-request ID) before the offline Nimo
signer may act. Broadcast remains a later, separate authorization even after a
signature exists.
