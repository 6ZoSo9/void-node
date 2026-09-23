# Chain-2050 SOVEREIGN genesis append reconciliation evidence v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_RECONCILIATION_EVIDENCE_V1`

The first canonical role-authority registry append has been independently
reconciled after the one permitted raw submission.

## Transaction and receipt

- transaction:
  `0xd6f2eea882fc9351644072e23c8a5279fbdc085a0ee153d6b9fa73aef247e6e7`
- receipt status: `1`
- block: `37392`
- block hash:
  `0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52`
- gas used: `371459`
- effective gas cost: `371459002600213 wei`
- transaction occurrence in receipt block: exactly `1`

## Post-state

- owner nonce at receipt block: `1`
- owner latest nonce: `1`
- owner pending nonce: `1`
- owner balance: `128540997399787 wei`
- registry entry count: `1`
- registry root:
  `54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041`

Entry 0 is exact:

- identity: `sovereign.zoso`
- role: `SOVEREIGN`
- generation: `0`
- role record:
  `1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b`
- previous root: exact empty root
- resulting root: exact predicted root

## Stale nonce reconciliation

The original broadcaster's immediate post-send provider read reported nonce
`0`. Independent raw JSON-RPC reconciliation at the receipt block, latest,
and pending tags all returned nonce `1`.

The stale read caused the broadcaster to fail closed after its one send. It did
not cause a second submission. The authorization was already consumed, no retry
or replacement occurred, and the single successful transaction is the only
matching transaction in block 37392.

Evidence ID:

`voidcrasgarce1_31f02a7a3da637eab8813ca1224b165575d4608265bed9be0efda0e2a552c162`

No further submission or additional registry append is authorized by this
evidence.
