# Buy VOID Ethereum public checkout finality gate v1

Marker: `VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1`

## Outcome

Provide one fail-closed prerequisite for the Ethereum public Buy VOID checkout
without touching the currently owned `src/index.ts` integration surface.

This module answers two separate questions:

1. **May Ethereum payment instructions be exposed?**
2. **May this exact Ethereum payment become eligible for a
   `payment_verified` transition?**

Those questions have deliberately different gates.

## Payment-instruction readiness

`readBuyVoidEthereumPublicCheckoutReadinessV1(...)` requires all of:

- `VOID_BUY_REQUESTS_ENABLED=1`;
- `VOID_BUY_ETHEREUM_REQUESTS_ENABLED=1`; and
- the existing server-controlled dual-rail source-finality policy to pass
  `readBuyVoidSourceFinalityExecutionPolicyV1(...)`.

The canonical policy loader already requires the reviewed Base + Ethereum RPC
identity, URL fingerprint inputs, canonical USDC/receive-address policy,
minimum-confirmation policy, and total timeout policy.

A missing/invalid finality policy therefore keeps Ethereum payment instructions
HOLD even if the generic and Ethereum intake toggles are both enabled.

This gate does not alter Base behavior.

A GREEN result here is only a **finality prerequisite**. It does not mean the
overall checkout may open. The separate coupled-launch gate tracked by #2394
must also be composed before route integration can expose payment instructions.

## Payment verification / inventory readiness

`runBuyVoidEthereumPublicCheckoutPaymentFinalityV1(...)` never accepts a
caller-provided finality decision or observer dependency.

It invokes the existing
`runBuyVoidSourceFinalityExecutionPreflightV1(...)` directly.

The result is transition-ready only when that canonical preflight proves, for
the exact persisted attempt:

- source chain is exactly `ethereum`;
- reviewed source files are verified;
- authenticated transport identity is verified;
- the total operation deadline is verified;
- source generation is verified;
- deployed artifact generation is verified;
- ancestry is verified;
- provider quorum is verified;
- `production_source_finality_authority_ready=true`;
- canonical payment identity and payment-key binding revalidate; and
- wallet/signing/broadcast/money-movement side effects remain false.

Only then does this helper return:

```text
status=ethereum_payment_source_finality_gate_ready
payment_verified_finality_gate_ready=true
inventory_reservation_finality_gate_ready=true
coupled_launch_gate_composed=false
overall_checkout_activation_authorized=false
```

The helper itself does **not** write either event or inventory state, and a
GREEN finality gate is not overall checkout or reservation authority.

A receipt/log match by itself cannot produce this status.

## Test-only surface

The focused proof needs to exercise rejection of forged finality results without
granting production callers an injectable finality dependency.

`testOnlyClassifyBuyVoidEthereumPublicCheckoutFinalityV1(...)` therefore
returns a distinct test-only marker and always reports:

```text
production_transition_authority=false
payment_verified_event_write_performed=false
inventory_reservation_write_performed=false
```

It can prove whether a synthetic object *would* satisfy the strict structural
checks, but cannot mint the production gate marker/status.

## Deferred integration

This source lane intentionally does not edit `src/index.ts` because Draft
#2374 currently owns that file.

After that collision clears, #2393 still requires a separate integration step:

- use this readiness gate before returning Ethereum payment instructions;
- use this payment-finality gate before writing the exact
  `payment_verified` event;
- keep reorg/stale/non-finalized outcomes unreserved;
- expose the same Ethereum HOLD/readiness state through config/API/browser and
  legacy participant copy; and
- preserve Base behavior.

Until that integration lands, Ethereum public intake remains HOLD.

## Authority boundary

This module may cause read-only RPC activity only indirectly through the
existing canonical source-finality preflight during real payment verification.

It does not:

- mutate runtime configuration;
- activate request intake;
- create a purchase request;
- write `payment_verified`;
- reserve inventory;
- access a wallet, signer, or private key;
- construct, sign, submit, or broadcast a transaction;
- mutate Chain-2050 or the WC ledger;
- activate presale or WC/VOID;
- move token inventory, liquidity, treasury assets, or funds.
