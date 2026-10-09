# Buy VOID V2 JSON primitive coercion — negative witness V1

## Negative security result

This Draft intentionally reproduces a fail-open type-normalization behavior in
the existing `buildBuyVoidVerifiedPaymentEventV2(...)` source. A GREEN
workflow means the defect was reproduced. It is **not** payment-readiness
evidence.

The reviewed source is current-main
`src/economic/buy_void_verified_payment_v2.ts`, Git blob
`c0e4660bb238e1b718b8a471890901bd5a59badf`.

Several V2 helpers normalize untrusted values by calling `String(...)` before
validating hashes, addresses, topics, quantities, chains and decimal amounts.
JavaScript converts a one-element array containing a string into that same
string. Consequently JSON values of the wrong structural type can be accepted
as if they were the reviewed primitive.

The new canonical RPC-rail wrapper on integration #2675 hardens rail policy and
request identity, but the RPC observer still forwards raw receipt/log data to
V2. Provider honesty about JSON primitive types therefore cannot be treated as
an authority boundary.

## Reproduction scope

The proof begins with one valid synthetic Base USDC payment and requires the
ordinary all-primitive fixture to verify.

It then independently wraps 21 authority-bearing values in arrays while
preserving their textual contents. The cases cover:

- request ID, source chain, transaction hash, delivery/receive address and
  requested USDC amount;
- policy allowlisted chain, USDC address, receive address and current block;
- receipt status, transaction hash and block number;
- USDC log contract, Transfer topic, sender/receiver topics, amount, log index,
  transaction hash and block number.

For every wrong-type case, the current source must still return
`ok=true/status=verified` and emit the exact same canonical verified event and
matched transfer as the primitive control. If a future source repair rejects
these values, this negative test should fail and be retired or converted into a
positive regression; it must never be weakened just to stay green.

## Expected repair direction

The next reviewed source repair should reject wrong structural types before any
normalization:

- hashes, addresses, topics, chains, request IDs and decimal quantities should
  require primitive strings where that is the reviewed wire type;
- integer quantities may accept only explicitly reviewed primitive
  string/number/bigint forms, never arrays/objects or executable coercion;
- receipt/log objects should remain plain-data observations with closed
  primitive boundaries before becoming payment authority;
- existing native-USDC, original buyer, source-finality, duplicate, capacity
  and allocation-custody gates must remain intact.

Because V2 is part of the reviewed source-finality/compiled payment stack, a
source fix must receive fresh V2, ambiguity, automatic-fulfillment,
source-finality, compiled successor and integration evidence rather than
silently repinning historical artifacts.

## Authority boundary

This Draft adds only proof/workflow/documentation files. It does not modify V2
source, call a real RPC provider, read customer/payment records, mount a route,
write a ledger, access wallet/key/signer material, build/sign/broadcast a
transaction, mutate Chain-2050/WC, activate presale/market, or move funds.

Always report:

`defect_reproduced=true`,
`production_payment_authority_ready=false`,
`source_modified=false`,
`customer_record_used=false`,
`rpc_used=false`,
`wallet_or_signer_access=false`,
`transaction_broadcast=false`,
`funds_moved=false`.

Keep Draft/unmerged as negative evidence. **PROTECT THE CORE.**
