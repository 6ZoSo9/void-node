# Buy VOID frozen original V1 witness identity restoration

## Why restore the old source, rather than change its ID or SHA

The original V1 Nimo witness source qualifier was committed under Git object
`d2e84643c9f4d76c642c7e07d4ea2bf1634035e4` at
`f627cad6bc07a6ad3ebe7cbd946723316fcd0567`.
Its immutable `voidwfb1_2a729...` manifest ID, digest
`sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2`,
source commit `e390424c1d31cd87dcf3551cc0d2d610a24e12f8`,
and auto-fulfillment compiled SHA256
`ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6`
together identify one frozen V1 executable generation.

The integrated V1 contract blob
`d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56`
mistakenly retains that **same historic manifest ID and digest** but
changes the recorded commit to `f627cad6...` and the executable hash to
`119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c`.
Those are different program bytes. Independent [Draft #2730](https://github.com/6ZoSo9/void-node/pull/2730)
proved the collision with terminal 15/15 GitHub CI and seven adversaries.

This Draft restores the V1 source file **byte-for-byte** to its Git object
`d2e84643c9f4d76c642c7e07d4ea2bf1634035e4`.
It does not reconstruct an invented hybrid or silently reinterpret
the historic V1 manifest. Current hardened auto-fulfillment remains distinct
at source blob `b7c963b1d55f000d82ad82289b31107b432503de`.
A future separately named V2 witness generation must attest those actual
current compiled bytes before it can claim current-generation or Nimo
installed authority.

## Proof and limits

A pure Node builtins proof reads the exact original Git tree and Git blob
from the archived commit; independently recomputes SHA-1 Git blob identity;
requires the checked-out V1 file to equal those original bytes; binds the
canonical main V1 blob and source ancestry; identifies precisely changed
historical lines 13 and 57 in the rewritten integrated qualifier; and
falsifies seven synthetic altered V1 records. Node 22, 24 and 26 independently
run the proof on their exact Draft head, then compare emitted proof JSON bytes.
No npm build, host deployment, Nimo SSH, payment RPC, or ledger access occurs.

The historical Nimo operator terminal census reported eight root-owned
mode 0444 runtime files whose digests match the **original frozen V1**
generation. That is operator-provided observed file congruence, not
authenticated Nimo service identity, V2 executable deployment, authorized
current production allocation, or permission to accept money.

All evidence retains
`original_v1_receipt_authorizes_current_runtime=false`,
`source_v2_accepted=false`,
`installed_nimo_witness_authenticated=false`,
`production_allocation_mutation_ready=false`,
`presale_activation=false`, and `funds_movement=false`.

## Still required before Buy VOID launch

V2 source and compiled witness acceptance, Nimo installed UID/IPC/transport
qualification, immutable high-water antirollback, authenticated original
payment, serialized payment-to-allocation append and crash recovery,
operational coupled WC/VOID opening and production presale launch approval
remain independently HOLD. Historical acceptance cannot be created by
satisfying an old V1 check with new module bytes.

No merge/Ready, installed service changes, wallet/signer/key,
customer file, transaction, market, inventory, treasury/liquidity
or funds movement. **PROTECT THE CORE.**
