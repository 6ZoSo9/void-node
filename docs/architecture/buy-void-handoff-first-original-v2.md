# Buy VOID handoff first-original buyer V2 source qualification

## Narrow launch-critical problem

This **source-only, unmerged V2 proof** is stacked on
[Draft #2743](https://github.com/6ZoSo9/void-node/pull/2743), exact head
`f2d62f6a3ee333f584a542980fb113faeecbf115`.
It addresses the different failure in the historical
[verified payment → allocation handoff V1](https://github.com/6ZoSo9/void-node/actions/runs/37990357408):
the original handoff's real temporary filesystem proof passed, but its
inherited hypothetical crash-matrix V1 correctly rejected the newer
first-original buyer replay source `0a74a3652081c3e142d0b887676771a7ac148f32`
against its immutable predecessor `970e686cd96b43d496c44acb4ff343a5e61e26c5`.

The review **does not reissue or repin either V1**. It pins the original
handoff proof Git blob `6d6a8b0efee8bc2d4e7f402bf7bd4b9e4ed4ac3a`,
the frozen crash-matrix V1 source `1a8db260a134ad438366d5b7660f926768c98a79`,
new replay classifier `0a74a3652081c3e142d0b887676771a7ac148f32`,
and the actual existing verified-payment capacity, allocation ledger, and
high-water source blobs. The CI must retain V1's **expected refusal**,
run the dedicated reviewed V2 crash successor, and then execute the
unchanged original real-temporary-filesystem handoff proof only after
checking its exact Git blob.

## Additional end-to-end V2 source adversaries

The added V2 proof reuses the actual
`writeBuyVoidVerifiedPaymentAllocationHandoffV1` source API with
PRIVATE `os.tmpdir()` synthetic request, operator-event, allocation-ledger
and allocation-high-water directories, all provisioned to their reviewed
private test modes. Only these synthetic disposable files are written.
It first verifies that a normal first-ever payment and allocation succeed
once in the fixture, producing one durable-event line, one allocation and
canonical high-water.

Next, three original buyer-wallet variants (missing property, null and
empty string) precede a later full request row naming a wallet. For each,
the actual handoff MUST refuse before appending `payment_verified` or
publishing allocation/high-water records. The exact request/ledger/high-water
bytes must remain unchanged. This is a real source handoff test, not simply
repeating the new replay classifier's pure fixture test.

A second set of three cases plants an apparently matching **previous
payment and allocation** in the temporary roots while the first request
still lacks its buyer wallet. Even an apparently complete older allocation
cannot manufacture first-original buyer identity; exact replay must HOLD
without changing the payment/event/ledger/high-water bytes.

Positive control: a buyer wallet present in the FIRST request remains the
authority when transaction hash and payment receiver are bound in a later
row. The actual handoff's accepted allocation record ID and verified
payment-event SHA must be invariant; an idempotent replay cannot append a
second payment. Do not compare real publication timestamps as if they were
immutable identity.

## CI and production authority

The new Node 22/24/26 workflow independently builds from the exact
unmerged Draft head, verifies old V1 has the expected source-identity
HOLD, runs V2 source proofs on real temporary files, emits deterministic
three-node receipts and demands byte-for-byte identity.

A GREEN outcome would establish only **synthetic real-code consistency**:
the original customer request has not been authenticated as the first
fsynced physical request; launch permission, source-chain payment RPC/finality,
installed Nimo V2 witness/IPC, cross-UID high-water fencing, actual mounted
operator dispatcher and exactly-once production settlement are still
separate. The source API's
`runtime_integration=false`,
`protected_high_water_custody_proven=false`,
`production_gate_ready=false`,
`presale_activation=false`, and `funds_movement=false`
must remain authoritative.

No historical manifest edits, transaction signing, wallet, key, real buyer
ledger, production network RPC, Chain-2050/WC, inventory/liquidity, treasury,
service deployment, merge, public sale opening or fund movement.

**PROTECT THE CORE.**
