# Bakery-lock downstream V2 attestations

## Purpose

This lane accepts two exact, independently derived successor identities caused
only by the repaired bakery-lock source in #2683. Historical V1 evidence remains
immutable.

The derive-only parent #2689 produced byte-identical candidate evidence across
Node 22, 24 and 26.

### Accepted custody runtime-bundle V2 identity

- candidate evidence SHA-256:
  `6647673c5c23cb8c90a89acaf31dee85da1cea546ab377dec127bf7217252141`
- candidate derivation script Git blob:
  `f2ae443062d5d87670c5fab9aaf2e2fb1caa6510`
- manifest ID:
  `voidwfb2_7d7573c8a105473997c0fb7442842ec58f010cebab0c9497c86bd9dcb62c248f`
- manifest SHA-256:
  `sha256:ec3b126d0c4c406d60f2bce01d08d463a0e06553e2980bc2812e5e487a42ad0d`
- repaired bakery artifact:
  `sha256:47e80dfffa0cd1fd97169f9d63e836c9dbf52461aaafafdf10499b5cf91fd3ca`

Exactly one runtime artifact differs from V1:
`dist/economic/buy_void_filesystem_bakery_lock_v1.js`.

The eight-file closure, eleven relative import edges, zero dynamic imports and
zero CommonJS require calls remain exact.

### Accepted native-gas custody source-binding V2 identity

- candidate evidence SHA-256:
  `9842d29130e2cd0ff7b1597ca2f20b721dc069440f21cf38d24f228e99a454e3`
- candidate derivation script Git blob:
  `6e9e55bba6ba371c721562b664fe16cfdcfae138`
- reviewed-source manifest SHA-256:
  `4e3c83de580ee12803ce122f0df34194d3594c4dd49eee56a9fa8184b4353144`
- repaired bakery source Git blob:
  `9bd47abb857368d928c0ca289766cdf3571629ba`

Exactly one reviewed source differs from V1:
`src/economic/buy_void_filesystem_bakery_lock_v1.ts`.

## Proof model

The locked proof does not trust copied constants alone. It Git-blob pins both
derive-only candidate scripts and executes the **authenticated bytes
themselves** with a scrubbed child environment; it never reopens the candidate
pathname as the child entrypoint after verification. The original scripts
directory is retained as the ESM import base so the reviewed `../dist` and
`../tools` dependencies resolve exactly as authored. The proof then requires
the full candidate JSON bytes to match the reviewed cross-Node evidence
SHA-256, rechecks the single-file delta and all authority-false fields, and
requires the committed V2 attestation JSON bytes to equal the derived locked
objects exactly.

The focused workflow performs a locked install and repository build on Node
22, 24 and 26 before running the same locked proof, uploads both attestation
files, and requires byte equality across all three Node majors.

## Authority boundary

Acceptance here means only that the new source/build identities are reviewed
successors to their historical V1 identities. It does **not** mean either
successor is installed or active.

The locked attestations keep:

- live Nimo installation false;
- runtime integration false;
- protected high-water custody false;
- deployed artifact generation false for the native-gas source binding;
- trusted collector false;
- live host qualification false;
- payment acceptance false;
- production gate ready false;
- funds movement false.

No host/service deployment, Nimo mutation, protected-root write, customer
payment/allocation read or write, credential/key/wallet/signer access,
transaction construction/broadcast, Chain-2050/WC mutation, presale/market
activation, treasury/liquidity action, or funds movement occurs in this lane.

**PROTECT THE CORE.**
