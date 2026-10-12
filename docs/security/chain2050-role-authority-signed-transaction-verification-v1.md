# Chain-2050 role-authority signed transaction verification v1

## Purpose

Preserve the independent Precision verification result for the exact signed
role-authority registry deployment transaction without committing, exposing,
or broadcasting the raw signed transaction.

## Exact lineage

- signing request:
  `voidcrasr1_2eef907499d684facb777d42c754e23207a02c646dd5e55923e0e0204eeadf2a`
- signing authorization:
  `voidcrasta1_e036437731cfe4bea160f3de3542fd60d6809d0ca773128a01f2bdd0bbc88d20`
- signer:
  `0x4d0a1149d13b03448c56ee6582d161159c5e537f`
- unsigned transaction hash:
  `0xc5982072b34a49c3f8ead20cd8e358e8711a620f91ff4aeae0e9a7072d600f25`
- signed transaction hash:
  `0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4`
- local signed-file SHA-256:
  `96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d`
- predicted registry:
  `0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`

The independent verifier recovered the exact signer and bound the signature to
the exact authorized unsigned transaction.

## Raw signed transaction custody

The raw signed transaction is deliberately **not committed** to GitHub.

Only its cryptographic identities and the verification result are preserved in
the repository. The local signed artifact remains outside this source lane.

## Authority boundary

This gate performs no RPC call, private-key access, wallet/signer access,
signing, broadcast, deployment, Chain-2050 mutation, or funds action.

Its decision is:

`HOLD_PENDING_FRESH_PRECISION_PRE_BROADCAST_REVALIDATION`

## Next gate

A separate Precision-only read-only observer must consume the exact local
signed artifact and freshly revalidate:

1. Chain ID remains 2050.
2. latest and pending deployer nonce remain 0.
3. the predicted registry address remains vacant.
4. deployer balance remains sufficient for the exact signed gas envelope.
5. current base/priority fee requirements remain within the signed fee caps.
6. an exact deployment gas estimate remains within gas limit 2402981.
7. signed transaction hash and local file SHA-256 remain exact.

That observer must not call any transaction-submission RPC method.

A GREEN observation still does not authorize broadcast. Broadcast/deployment
requires a later explicit Sovereign authorization for this exact signed
transaction.
