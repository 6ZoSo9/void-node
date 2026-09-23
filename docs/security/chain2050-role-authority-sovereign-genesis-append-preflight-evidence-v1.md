# Chain-2050 SOVEREIGN genesis append preflight evidence v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_PREFLIGHT_EVIDENCE_V1`

This evidence freezes the exact read-only Precision preflight for the first
`sovereign.zoso` role-authority registry append.

## Live registry

- contract: `0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`
- owner: `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`
- pending owner: zero
- entry count: `0`
- registry root:
  `d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7`
- observation block before/after: `37390`

## Exact append candidate

- identity: `sovereign.zoso`
- role: `SOVEREIGN`
- role-record SHA-256:
  `1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b`
- predicted post-append root:
  `54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041`
- function selector: `0x3fd97432`
- calldata bytes: `452`
- calldata SHA-256:
  `83b9a1fb9a74b7755ed37ee3b945a50fb9d5841d36aa7b26707b5a06eb36f938`
- simulated entry index: `0`
- gas estimate: `371459`

The exact owner `eth_call` simulation returned the expected record/root and
the registry remained unchanged afterward.

Evidence ID:

`voidcrasgap1_a0af95011a1fb726b057fe1ff4ecf0b31b7529a95881821383adafed878f8812`

## Authority boundary

This evidence does not authorize unsigned transaction preparation, private-key
access, signing, broadcast, Chain-2050 write, registry append, or funds action.

The next gate is a separate exact unsigned owner-transaction preparation.
