# Chain-2050 SOVEREIGN genesis append request evidence v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_REQUEST_EVIDENCE_V1`

This freezes the exact unsigned owner transaction prepared for the first
Chain-2050 role-authority registry entry.

## Exact transaction

- signer/owner:
  `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`
- registry:
  `0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`
- nonce: `0`
- value: `0 wei`
- gas limit: `445751`
- max fee: `1000000014 wei/gas`
- max priority fee: `1000000000 wei/gas`
- calldata SHA-256:
  `83b9a1fb9a74b7755ed37ee3b945a50fb9d5841d36aa7b26707b5a06eb36f938`
- unsigned transaction hash:
  `0x568f531f93d6949adc0767cf4384a279b471edb389e18268511182ca6c51de34`

Append request:

`voidcrasgar1_e97b68fcbb085aec3b0e502d4e00b5e662d3a13374a87cbe51e0a8a687e27481`

Evidence:

`voidcrasgare1_1bb67737a3af758f1be51474ddced95c6b366b3b5e7ee04994841021238c804d`

## Exact resulting authority state

If separately authorized, signed, and successfully executed, this exact
transaction is expected to append entry 0 for:

- identity `sovereign.zoso`
- role `SOVEREIGN`
- generation `0`
- role-record SHA-256
  `1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b`
- resulting registry root
  `54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041`

## Authority boundary

This evidence explicitly records:

`registry_append_authorized=false`

It grants no owner-key access, signing, broadcast, Chain-2050 write, gas spend,
automatic retry, or replacement transaction.

The next gate is explicit Sovereign authorization of the exact unsigned
transaction hash.
