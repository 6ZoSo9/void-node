# Chain-2050 SOVEREIGN genesis append authorization v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_AUTHORIZATION_V1`

The Sovereign explicitly authorized the exact first role-authority registry
append transaction.

Authorization ID:

`voidcrasgaa1_fb46e3048b5921da3856de4548823b61f32e64f423bf5e7fd4758b9e04e27355`

## Exact transaction

- owner/signer:
  `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`
- registry:
  `0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`
- nonce: `0`
- value: `0 wei`
- maximum gas liability:
  `445751006240514 wei`
- unsigned transaction hash:
  `0x568f531f93d6949adc0767cf4384a279b471edb389e18268511182ca6c51de34`

Append request:

`voidcrasgar1_e97b68fcbb085aec3b0e502d4e00b5e662d3a13374a87cbe51e0a8a687e27481`

## Exact state transition

- identity: `sovereign.zoso`
- role: `SOVEREIGN`
- generation: `0`
- role-record SHA-256:
  `1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b`
- expected post-append registry root:
  `54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041`

## Exact authority

This authorization permits only:

- access to the private key that derives exactly to the registry owner address;
- signing this exact unsigned transaction;
- the required gas spend, up to the frozen maximum liability;
- exactly one raw transaction submission attempt;
- the single `sovereign.zoso` genesis registry append above.

It does not authorize:

- ETH/value transfer beyond gas;
- another registry entry;
- another Chain-2050 mutation;
- the Sovereign Primary governance-attestation key as a substitute;
- the deployment-only signer as a substitute;
- a node key as a substitute;
- automatic retry;
- replacement transaction.

The owner key must be independently derived to the exact owner address before
any signature is created. Authorization must be consumed before the sole send
attempt, followed by receipt and storage reconciliation.
