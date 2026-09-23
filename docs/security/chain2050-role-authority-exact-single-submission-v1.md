# Chain-2050 role-authority exact single submission v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_EXACT_SINGLE_SUBMISSION_V1`

This is the broadcaster boundary for the already-authorized role-authority
registry deployment.

It is bound to:

- broadcast authorization:
  `voidcraba1_66779fab9c8657d7f038585525dfc2ac688adfe33cf10a5d5827abb140e04c85`
- signed file SHA-256:
  `96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d`
- signed transaction hash:
  `0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4`
- predicted contract:
  `0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`

## Ordering

The executor requires the immutable durable authorization-consumption record
from the prior gate and verifies its exact state-store realpath binding.

Only after that record is verified may it read the raw signed transaction file.

The raw file is re-hashed and must match the exact independently verified
SHA-256 before any submission intent is created.

The executor then atomically publishes an immutable submission-intent record.
If that record already exists, the executor refuses to call the broadcaster.

Only after durable intent does the executor invoke
`eth_sendRawTransaction`, at most once.

## No retry

There is no retry loop, replacement transaction, nonce bump, fee bump, or
second send path.

An RPC error does not release or recycle the authorization.

After the one submission invocation, the executor performs only read-only
reconciliation by exact transaction hash, receipt, nonce, and predicted-address
code state. Ambiguous outcomes remain reconciliation work; they never trigger
another send automatically.

## Receipt-success boundary

A receipt with status `0x1` and the exact predicted contract address is not
the final deployment attestation.

The next gate must independently fetch deployed runtime bytecode and verify its
SHA-256 against the Sovereign-accepted runtime identity:

`b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d`

Only then should the registry deployment be treated as exact deployment truth.

## Repository safety

The real raw signed transaction is not committed to this repository.

CI exercises the same durable-intent/single-send/duplicate-refusal control flow
with an internal synthetic transaction fixture and fake RPC.

This source lane performs no live broadcast by itself.
